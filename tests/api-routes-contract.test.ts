import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DEMO_IDS } from "@blueprint/database";
import { GET as healthzGet } from "../apps/web/app/api/healthz/route";
import { GET as readyzGet } from "../apps/web/app/api/readyz/route";
import { GET as projectsGet, POST as projectsPost } from "../apps/web/app/api/projects/route";
import { GET as providersGet, POST as providersPost } from "../apps/web/app/api/settings/ai-providers/route";
import { POST as approvePost } from "../apps/web/app/api/artifact-revisions/[revisionId]/approve/route";

describe("Next.js Route Handler API Contract & RFC 7807 Tests", () => {
  it("exposes /api/healthz and /api/readyz probes", async () => {
    const h = await healthzGet();
    expect(h.status).toBe(200);
    const hb = (await h.json()) as { status: string };
    expect(hb.status).toBe("ok");

    const r = await readyzGet();
    expect(r.status).toBe(200);
    const rb = (await r.json()) as { status: string };
    expect(rb.status).toBe("ready");
  });

  it("enforces Zod validation with RFC 7807 Problem Details envelope and x-request-id", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-blueprint-actor-id": DEMO_IDS.userOwner,
      },
      body: JSON.stringify({ name: "x" }), // too short (< 2 chars)
    });

    const res = await projectsPost(req);
    expect(res.status).toBe(422);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("x-request-id")).toBeTruthy();

    const body = (await res.json()) as { code: string; status: number; requestId: string; errors: unknown[] };
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.status).toBe(422);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("enforces RBAC HTTP 403 on admin provider settings and reviewer approvals", async () => {
    const contribProvidersReq = new NextRequest("http://localhost:3000/api/settings/ai-providers", {
      headers: { "x-blueprint-actor-id": DEMO_IDS.userContributor },
    });
    const forbiddenRes = await providersGet(contribProvidersReq);
    expect(forbiddenRes.status).toBe(403);

    const ownerProvidersReq = new NextRequest("http://localhost:3000/api/settings/ai-providers", {
      headers: { "x-blueprint-actor-id": DEMO_IDS.userOwner },
    });
    const okRes = await providersGet(ownerProvidersReq);
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as { providers: unknown[] };
    expect(okJson.providers.length).toBeGreaterThanOrEqual(3);

    // Contributor cannot approve revision -> 403 RFC 7807
    const contribApproveReq = new NextRequest("http://localhost:3000/api/artifact-revisions/rev-a-prd-1/approve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-blueprint-actor-id": DEMO_IDS.userContributor,
      },
      body: JSON.stringify({ decision: "approved", comment: "nope" }),
    });
    const approveDenied = await approvePost(contribApproveReq, {
      params: Promise.resolve({ revisionId: "rev-a-prd-1" }),
    });
    expect(approveDenied.status).toBe(403);

    // Listing projects isolates tenants cleanly
    const tenantBReq = new NextRequest("http://localhost:3000/api/projects", {
      headers: { "x-blueprint-actor-id": DEMO_IDS.userTenantB },
    });
    const tenantBRes = await projectsGet(tenantBReq);
    expect(tenantBRes.status).toBe(200);
    const tenantBBody = (await tenantBRes.json()) as { projects: Array<{ id: string }> };
    expect(tenantBBody.projects.every((p) => p.id === DEMO_IDS.projectB)).toBe(true);

    // Creating a provider via POST never echoes the raw secret back
    const rawKey = "sk-route-test-secret-0011223344";
    const createProvReq = new NextRequest("http://localhost:3000/api/settings/ai-providers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-blueprint-actor-id": DEMO_IDS.userOwner,
      },
      body: JSON.stringify({
        providerType: "anthropic",
        displayName: "Anthropic Route Test",
        apiKey: rawKey,
        enabled: true,
      }),
    });
    const createProvRes = await providersPost(createProvReq);
    expect(createProvRes.status).toBe(201);
    const rawText = await createProvRes.text();
    expect(rawText).not.toContain(rawKey);
  });
});
