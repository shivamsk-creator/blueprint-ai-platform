import { describe, expect, it } from "vitest";
import {
  BlueprintRepository,
  createSeededState,
  DEMO_IDS,
  InMemoryQueueClient,
  type ActorContext,
} from "@blueprint/database";
import { JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { BlueprintJobProcessor } from "../apps/worker/src/index";

const ownerA: ActorContext = {
  userId: DEMO_IDS.userOwner,
  email: "alex@meridian.dev",
  fullName: "Alex Mercer",
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

describe("Artifacts, Approvals, Traceability, Impact Analysis & Exports (ART-01, APP-01, TRACE-01, EXP-01)", () => {
  it("ART-01: AI section regeneration creates a candidate revision and never overwrites active user revision", async () => {
    const queue = new InMemoryQueueClient();
    const repo = new BlueprintRepository(createSeededState(), queue);
    const processor = new BlueprintJobProcessor(repo, { allowSyntheticFallback: true });

    // User saves manual revision v2 on PRD
    const manualV2 = repo.createArtifactRevision(ownerA, "art-a-prd", {
      sections: [
        { sectionKey: "product_vision", heading: "1. Product Vision", orderIndex: 0, bodyMarkdown: "Hand-edited vision text." },
        { sectionKey: "functional_requirements", heading: "2. Functional Requirements", orderIndex: 1, bodyMarkdown: "Custom requirements." },
      ],
      changeSummary: "Manual product edits",
      status: "draft",
      setAsCurrent: true,
    });
    expect(manualV2.versionNo).toBe(2);
    expect(repo.getArtifact(ownerA, "art-a-prd").currentRevisionId).toBe(manualV2.id);

    // Enqueue section regeneration against manualV2
    const { job } = await repo.enqueueJob(ownerA, DEMO_IDS.projectA, {
      jobType: "ai.regenerate_section",
      taskType: "prd_generation",
      inputPayload: { baseRevisionId: manualV2.id, sectionKey: "product_vision" },
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: DEMO_IDS.projectA,
        requestedBy: ownerA.userId,
        idempotencyKey,
        jobType: "ai.regenerate_section",
        taskType: "prd_generation",
        artifactId: "art-a-prd",
        artifactType: "prd",
        baseRevisionId: manualV2.id,
        sectionKey: "product_vision",
        instructions: "Add compliance KPIs",
      }),
    });

    await processor.pollOnce(4, 120);
    const doneJob = repo.getAIJob(ownerA, job.id);
    expect(doneJob.status).toBe("succeeded");

    const candidateId = doneJob.resultPayload?.candidateRevisionId as string;
    expect(candidateId).toBeTruthy();

    // Active currentRevisionId MUST still point to user's manualV2
    const art = repo.getArtifact(ownerA, "art-a-prd");
    expect(art.currentRevisionId).toBe(manualV2.id);
    expect(repo.state.artifactRevisions.get(manualV2.id)?.content.sections[0]?.bodyMarkdown).toBe(
      "Hand-edited vision text."
    );

    // Diff between candidate v3 and manualV2 shows 1 modified section, 1 unchanged
    const diff = repo.diffArtifactRevision(ownerA, candidateId);
    expect(diff.baseRevisionId).toBe(manualV2.id);
    expect(diff.summary.modified).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
  });

  it("APP-01: approval binds permanently to exact revision and does not carry over to subsequent revisions", () => {
    const repo = new BlueprintRepository(createSeededState());

    const { approval, revision: approvedV1 } = repo.approveArtifactRevision(reviewerA, "rev-a-prd-1", {
      decision: "approved",
      comment: "PRD v1 verified against requirements",
    });
    expect(approval.targetRevisionId).toBe("rev-a-prd-1");
    expect(approvedV1.status).toBe("approved");

    // Creating v2 leaves v1 approved while v2 starts as draft
    const newV2 = repo.createArtifactRevision(ownerA, "art-a-prd", {
      sections: approvedV1.content.sections,
      changeSummary: "Post-approval amendment",
      status: "draft",
      setAsCurrent: true,
    });
    expect(newV2.status).toBe("draft");
    expect(repo.state.artifactRevisions.get("rev-a-prd-1")?.status).toBe("approved");
    const art = repo.getArtifact(ownerA, "art-a-prd");
    expect(art.approvals.some((a) => a.targetRevisionId === "rev-a-prd-1")).toBe(true);
    expect(art.approvals.some((a) => a.targetRevisionId === newV2.id)).toBe(false);
  });

  it("TRACE-01 & P10-02: traceability coverage reflects real links and requirement edits flag linked artifacts", () => {
    const repo = new BlueprintRepository(createSeededState());
    const req = repo.createRequirement(ownerA, DEMO_IDS.projectA, {
      requirementType: "functional",
      title: "Real-Time Settlement Alerts",
      description: "Emit alerts on reconciliation exceptions.",
      priority: "high",
      status: "confirmed",
      acceptanceCriteria: ["Alert delivered under 5s"],
      sourceType: "manual",
    });

    const beforeRow = repo
      .getTraceabilityMatrix(ownerA, DEMO_IDS.projectA)
      .rows.find((r) => r.requirementId === req.id)!;
    expect(beforeRow.coveragePct).toBe(0);

    const feat = repo.createFeature(ownerA, DEMO_IDS.projectA, {
      name: "Settlement Alert Engine",
      description: "Alert pipeline",
      scopeBucket: "mvp",
      priority: "high",
      effortEstimate: "S",
      rationale: "Ops visibility",
      acceptanceSummary: "Alerts trigger",
      linkedRequirementIds: [req.id],
    });
    const task = repo.createDevelopmentTask(ownerA, DEMO_IDS.projectA, {
      phase: "P03",
      title: "Build alert worker",
      description: "Worker consumer",
      ownerRole: "Backend",
      priority: "high",
      estimateHours: 6,
      status: "not_started",
      acceptanceCriteria: [],
      dependencyTaskIds: [],
      linkedRequirementIds: [req.id],
    });
    repo.createTestCase(ownerA, DEMO_IDS.projectA, {
      area: "Alerts",
      title: "Verify exception alert delivery",
      preconditions: "Exception event enqueued",
      steps: ["Trigger imbalance", "Assert alert emitted"],
      expectedResult: "Alert emitted within 5s",
      testType: "integration",
      priority: "high",
      status: "ready",
      linkedRequirementIds: [req.id],
    });

    const afterRow = repo
      .getTraceabilityMatrix(ownerA, DEMO_IDS.projectA)
      .rows.find((r) => r.requirementId === req.id)!;
    expect(afterRow.coveragePct).toBe(100);
    expect(afterRow.linkedFeatures[0]?.id).toBe(feat.id);
    expect(afterRow.linkedTasks[0]?.id).toBe(task.id);

    // Editing confirmed req-1 flags linked BRD & PRD artifacts for review
    const { flaggedArtifactIds } = repo.updateRequirement(ownerA, "req-1", {
      description: "Updated strict multi-currency rounding policy.",
      changeSummary: "Tightened rounding rule",
    });
    expect(flaggedArtifactIds.length).toBeGreaterThan(0);
    expect(repo.getArtifact(ownerA, "art-a-brd").needsReview).toBe(true);
  });

  it("EXP-01: exports pinned artifact revision to valid PDF, DOCX, SQL, and OpenAPI with private tenant access", async () => {
    const queue = new InMemoryQueueClient();
    const repo = new BlueprintRepository(createSeededState(), queue);
    const processor = new BlueprintJobProcessor(repo, { allowSyntheticFallback: true });

    // 1. PDF Export pinned to exact BRD v1 revision
    const pdfRes = await repo.createExportJob(ownerA, DEMO_IDS.projectA, {
      format: "pdf",
      artifactRevisionIds: ["rev-a-brd-1"],
      includeTraceability: true,
    });
    await processor.pollOnce(4, 120);
    const pdfMeta = repo.getExport(ownerA, pdfRes.exportFile.id);
    expect(pdfMeta.status).toBe("succeeded");
    expect(pdfMeta.signedDownloadUrl).toBe(`/api/exports/${pdfMeta.id}/download`);
    const pdfBlob = repo.state.exportBlobs.get(pdfMeta.id)!;
    expect(new TextDecoder().decode(pdfBlob.bytes.slice(0, 5))).toBe("%PDF-");

    // Cross-tenant export access strictly blocked
    expect(() => repo.getExport(ownerB, pdfMeta.id)).toThrow();

    // 2. DOCX Export produces valid OpenXML ZIP container ("PK")
    const docxRes = await repo.createExportJob(ownerA, DEMO_IDS.projectA, {
      format: "docx",
      artifactRevisionIds: ["rev-a-brd-1"],
      includeTraceability: false,
    });
    await processor.pollOnce(4, 120);
    const docxBlob = repo.state.exportBlobs.get(docxRes.exportFile.id)!;
    expect(docxBlob.bytes[0]).toBe(0x50); // 'P'
    expect(docxBlob.bytes[1]).toBe(0x4b); // 'K'

    // 3. SQL & OpenAPI Exports
    const sqlRes = await repo.createExportJob(ownerA, DEMO_IDS.projectA, {
      format: "sql",
      artifactRevisionIds: [],
      includeTraceability: false,
    });
    const openapiRes = await repo.createExportJob(ownerA, DEMO_IDS.projectA, {
      format: "openapi",
      artifactRevisionIds: [],
      includeTraceability: false,
    });
    await processor.pollOnce(4, 120);

    const sqlText = new TextDecoder().decode(repo.state.exportBlobs.get(sqlRes.exportFile.id)!.bytes);
    expect(sqlText).toContain("CREATE TABLE IF NOT EXISTS public.ledger_accounts");
    expect(sqlText).toContain("ENABLE ROW LEVEL SECURITY");

    const yamlText = new TextDecoder().decode(repo.state.exportBlobs.get(openapiRes.exportFile.id)!.bytes);
    expect(yamlText).toContain("openapi: 3.1.0");
    expect(yamlText).toContain("/v1/journals");
  });
});
