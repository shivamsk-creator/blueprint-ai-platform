import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ForbiddenError, ValidationError } from "@blueprint/domain";
import {
  BlueprintRepository,
  buildKeyringFromEnv,
  createSeededState,
  decryptSecret,
  DEMO_IDS,
  encryptSecret,
  redactSensitiveData,
  type ActorContext,
} from "@blueprint/database";
import { createProjectFileSchema } from "@blueprint/validation";

const ownerA: ActorContext = {
  userId: DEMO_IDS.userOwner,
  email: "alex@meridian.dev",
  fullName: "Alex Mercer",
};
const contributorA: ActorContext = {
  userId: DEMO_IDS.userContributor,
  email: "priya@meridian.dev",
  fullName: "Priya Nair",
};
const reviewerA: ActorContext = {
  userId: DEMO_IDS.userReviewer,
  email: "marcus@meridian.dev",
  fullName: "Marcus Vance",
};
const ownerB: ActorContext = {
  userId: DEMO_IDS.userTenantB,
  email: "sofia@helios.io",
  fullName: "Sofia Reyes",
};

describe("Security, Tenancy, RBAC & Secret Hygiene (TEN-01, RBAC-01, FILE-01, PROV-01)", () => {
  it("TEN-01: denies cross-workspace read and write access between Workspace A and Workspace B", () => {
    const repo = new BlueprintRepository(createSeededState());

    expect(() => repo.getWorkspace(ownerA, DEMO_IDS.workspaceB)).toThrow(ForbiddenError);
    expect(() => repo.getProject(ownerA, DEMO_IDS.projectB)).toThrow(ForbiddenError);
    expect(() => repo.listRequirements(ownerA, DEMO_IDS.projectB)).toThrow(ForbiddenError);
    expect(() =>
      repo.createRequirement(ownerA, DEMO_IDS.projectB, {
        requirementType: "functional",
        title: "Cross-tenant injection attempt",
        description: "Must be rejected",
        priority: "high",
        status: "proposed",
        acceptanceCriteria: [],
        sourceType: "manual",
      })
    ).toThrow(ForbiddenError);

    // Tenant B can access its own project, not Tenant A's
    expect(repo.getProject(ownerB, DEMO_IDS.projectB).id).toBe(DEMO_IDS.projectB);
    expect(() => repo.getProject(ownerB, DEMO_IDS.projectA)).toThrow(ForbiddenError);
  });

  it("RBAC-01: rejects contributor attempting admin, provider, approval, and change-management actions", () => {
    const repo = new BlueprintRepository(createSeededState());

    expect(() => repo.listAIProviders(contributorA, DEMO_IDS.workspaceA)).toThrow(ForbiddenError);
    expect(() =>
      repo.createAIProvider(contributorA, DEMO_IDS.workspaceA, {
        providerType: "openai",
        displayName: "Unauthorized",
        apiKey: "sk-unauthorized-12345678",
        enabled: true,
      })
    ).toThrow(ForbiddenError);

    expect(() =>
      repo.approveArtifactRevision(contributorA, "rev-a-prd-1", {
        decision: "approved",
        comment: "Self approval attempt",
      })
    ).toThrow(ForbiddenError);

    expect(() =>
      repo.updateProject(contributorA, DEMO_IDS.projectA, { status: "archived" })
    ).toThrow(ForbiddenError);

    expect(() =>
      repo.createChangeRequest(contributorA, DEMO_IDS.projectA, {
        title: "Contributor CR",
        description: "Requires manager+",
        reason: "Test",
      })
    ).toThrow(ForbiddenError);

    // Reviewer can approve, but cannot mutate requirements or manage providers
    expect(() => repo.listAIProviders(reviewerA, DEMO_IDS.workspaceA)).toThrow(ForbiddenError);
    expect(() =>
      repo.createRequirement(reviewerA, DEMO_IDS.projectA, {
        requirementType: "functional",
        title: "Reviewer write",
        description: "Reviewers are read+approve",
        priority: "low",
        status: "proposed",
        acceptanceCriteria: [],
        sourceType: "manual",
      })
    ).toThrow(ForbiddenError);
  });

  it("FILE-01: denies access to another project's private file and validates upload mime/path safety", () => {
    const repo = new BlueprintRepository(createSeededState());

    expect(() => repo.getProjectFile(ownerA, "file-b-1")).toThrow(ForbiddenError);
    expect(() => repo.listProjectFiles(ownerA, DEMO_IDS.projectB)).toThrow(ForbiddenError);
    expect(repo.getProjectFile(ownerB, "file-b-1").fileName).toBe("helios-confidential-fleet.pdf");

    // Reject path traversal & disallowed executable MIME types
    const badPath = createProjectFileSchema.safeParse({
      fileName: "../../etc/passwd",
      mimeType: "text/plain",
      sizeBytes: 120,
    });
    expect(badPath.success).toBe(false);

    const badMime = createProjectFileSchema.safeParse({
      fileName: "script.exe",
      mimeType: "application/x-msdownload",
      sizeBytes: 512,
    });
    expect(badMime.success).toBe(false);
  });

  it("PROV-01: encrypts provider API keys at rest, supports rotation with legacy keyring, and never exposes secrets", () => {
    const repo = new BlueprintRepository(createSeededState());
    const secretKey = "sk-live-super-secret-value-99112233";

    const { provider } = repo.createAIProvider(ownerA, DEMO_IDS.workspaceA, {
      providerType: "openai",
      displayName: "OpenAI Rotatable",
      apiKey: secretKey,
      enabled: true,
    });

    // Metadata returned to callers must never include raw key or ciphertext
    const serialized = JSON.stringify(provider);
    expect(serialized).not.toContain(secretKey);
    expect(serialized).not.toContain("enc:");
    expect(provider.keyHint).toContain("••••");

    const listed = JSON.stringify(repo.listAIProviders(ownerA, DEMO_IDS.workspaceA));
    expect(listed).not.toContain(secretKey);

    // Internal decryption recovers original key
    const internal = repo.getDecryptedProviderCredentialsInternal(provider.id);
    expect(internal.apiKey).toBe(secretKey);

    // Rotate key and disable provider
    const rotatedKey = "sk-live-rotated-secret-value-44556677";
    const updated = repo.updateAIProvider(ownerA, provider.id, {
      rotateApiKey: rotatedKey,
      enabled: false,
    });
    expect(updated.enabled).toBe(false);
    expect(JSON.stringify(updated)).not.toContain(rotatedKey);
    expect(repo.getDecryptedProviderCredentialsInternal(provider.id).apiKey).toBe(rotatedKey);

    // Keyring rotation test (v1 encrypted -> v2 active with v1 in legacy keys)
    const keyV1 = "11".repeat(32);
    const keyV2 = "22".repeat(32);
    const krV1 = buildKeyringFromEnv({ AI_SECRETS_ENCRYPTION_KEY: keyV1, AI_SECRETS_KEY_VERSION: "v1" });
    const encV1 = encryptSecret("sk-rotate-check-9999", krV1);

    const krV2 = buildKeyringFromEnv({
      AI_SECRETS_ENCRYPTION_KEY: keyV2,
      AI_SECRETS_KEY_VERSION: "v2",
      AI_SECRETS_LEGACY_KEYS: `v1:${keyV1}`,
    });
    expect(decryptSecret(encV1.ciphertext, krV2)).toBe("sk-rotate-check-9999");

    // Log redaction strips secret tokens
    const redacted = redactSensitiveData({
      apiKey: secretKey,
      nested: { authorization: `Bearer ${secretKey}`, note: `Failed for ${secretKey}` },
    });
    expect(JSON.stringify(redacted)).not.toContain(secretKey);
  });

  it("RLS SQL migrations enforce zero client policies on ai_provider_secrets and append-only audit_logs", () => {
    const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
    const combined = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
      .join("\n");

    expect(combined).toContain("REVOKE ALL ON public.ai_provider_secrets FROM anon, authenticated;");
    expect(combined).toContain("CREATE TRIGGER trg_audit_logs_append_only");
    expect(combined).toContain("CREATE TRIGGER trg_traceability_same_project");
    expect(combined).toContain("CREATE TRIGGER trg_artifact_revisions_immutable");
    expect(() => {
      // Cross-project traceability link rejected by repository parity guard too
      const repo = new BlueprintRepository(createSeededState());
      repo.createTraceabilityLink(ownerA, DEMO_IDS.projectA, {
        sourceType: "requirement",
        sourceId: "req-1",
        targetType: "feature",
        targetId: "non-existent-foreign-id",
        relationType: "implements",
      });
    }).toThrow(ValidationError);
  });
});
