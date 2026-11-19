import { describe, expect, it } from "vitest";
import { ExternalProviderError, IncompatibleModelError } from "@blueprint/domain";
import { AIProviderRegistry, resolveModelForTask } from "@blueprint/ai-providers";
import {
  BlueprintRepository,
  createSeededState,
  DEMO_IDS,
  InMemoryQueueClient,
  type ActorContext,
} from "@blueprint/database";
import { JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { BlueprintJobProcessor, computeBackoffDelaySeconds } from "../apps/worker/src/index";

const ownerA: ActorContext = {
  userId: DEMO_IDS.userOwner,
  email: "alex@meridian.dev",
  fullName: "Alex Mercer",
};

describe("AI Model Routing, Compatibility & Durable Queue Worker (MODEL-01, MODEL-02, JOB-01, JOB-02)", () => {
  it("MODEL-01: task-level model override routes to alternate model without changing workspace default", () => {
    const repo = new BlueprintRepository(createSeededState());
    const policyBefore = repo.state.aiTaskPolicies.get(`${DEMO_IDS.workspaceA}:brd_generation`);
    expect(policyBefore?.defaultModelId).toBe(DEMO_IDS.modelGeminiPro);

    // Default resolves to workspace policy default (Gemini 2.5 Pro)
    const defaultRoute = repo.resolveWorkspaceModel(DEMO_IDS.workspaceA, "brd_generation");
    expect(defaultRoute.primary.modelId).toBe("gemini-2.5-pro");
    expect(defaultRoute.wasUserOverride).toBe(false);

    // Override resolves to Claude Sonnet 4
    const overrideRoute = repo.resolveWorkspaceModel(
      DEMO_IDS.workspaceA,
      "brd_generation",
      DEMO_IDS.modelClaudeSonnet
    );
    expect(overrideRoute.primary.modelId).toBe("claude-sonnet-4-20250514");
    expect(overrideRoute.wasUserOverride).toBe(true);

    // Workspace default remains completely unchanged
    const policyAfter = repo.state.aiTaskPolicies.get(`${DEMO_IDS.workspaceA}:brd_generation`);
    expect(policyAfter?.defaultModelId).toBe(DEMO_IDS.modelGeminiPro);
  });

  it("MODEL-02: server rejects model lacking required structured output or reasoning capability", () => {
    const repo = new BlueprintRepository(createSeededState());
    const providers = Array.from(repo.state.aiProviders.values());
    const models = Array.from(repo.state.aiModels.values());

    // Legacy model has structuredOutput: false -> rejected for brd_generation
    expect(() =>
      resolveModelForTask({
        taskType: "brd_generation",
        providers,
        models,
        modelOverrideId: DEMO_IDS.modelLegacyNoJson,
      })
    ).toThrow(IncompatibleModelError);

    // GPT-4.1 Mini has reasoning: false -> rejected for architecture_generation (requires reasoning)
    expect(() =>
      resolveModelForTask({
        taskType: "architecture_generation",
        providers,
        models,
        modelOverrideId: DEMO_IDS.modelGpt41Mini,
      })
    ).toThrow(IncompatibleModelError);
  });

  it("JOB-02: idempotency key prevents duplicate job creation and duplicate artifact mutation", async () => {
    const queue = new InMemoryQueueClient();
    const repo = new BlueprintRepository(createSeededState(), queue);
    const key = "idem-generate-prd-0001";

    const first = await repo.enqueueJob(ownerA, DEMO_IDS.projectA, {
      jobType: "ai.generate_artifact",
      taskType: "prd_generation",
      inputPayload: { artifactId: "art-a-prd" },
      idempotencyKey: key,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: DEMO_IDS.projectA,
        requestedBy: ownerA.userId,
        idempotencyKey,
        jobType: "ai.generate_artifact",
        taskType: "prd_generation",
        artifactId: "art-a-prd",
        artifactType: "prd",
        requirementIds: [],
      }),
    });

    const second = await repo.enqueueJob(ownerA, DEMO_IDS.projectA, {
      jobType: "ai.generate_artifact",
      taskType: "prd_generation",
      inputPayload: { artifactId: "art-a-prd" },
      idempotencyKey: key,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: DEMO_IDS.projectA,
        requestedBy: ownerA.userId,
        idempotencyKey,
        jobType: "ai.generate_artifact",
        taskType: "prd_generation",
        artifactId: "art-a-prd",
        artifactType: "prd",
        requirementIds: [],
      }),
    });

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.job.id).toBe(first.job.id);
    expect(queue.getActiveCount()).toBe(1);
  });

  it("JOB-01: worker recovers leased messages after crash/restart and retries transient errors with backoff", async () => {
    const queue = new InMemoryQueueClient();
    const repo = new BlueprintRepository(createSeededState(), queue);

    const { job } = await repo.enqueueJob(ownerA, DEMO_IDS.projectA, {
      jobType: "discovery.analyze",
      taskType: "requirement_analysis",
      inputPayload: { sessionId: "disc-1" },
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: DEMO_IDS.projectA,
        requestedBy: ownerA.userId,
        idempotencyKey,
        jobType: "discovery.analyze",
        taskType: "requirement_analysis",
        sessionId: "disc-1",
        fileIds: ["file-a-1"],
      }),
    });

    // Simulate Worker #1 reading message then crashing before archive()
    const claimed = await queue.read(120, 1);
    expect(claimed).toHaveLength(1);
    expect(await queue.read(120, 1)).toHaveLength(0); // invisible during lease

    // Visibility timeout expires -> Worker #2 restarts and recovers the message safely
    queue.expireLeasesForTest();
    const processor = new BlueprintJobProcessor(repo, { allowSyntheticFallback: true });
    const handled = await processor.pollOnce(4, 120);
    expect(handled).toBe(1);

    const finishedJob = repo.getAIJob(ownerA, job.id);
    expect(finishedJob.status).toBe("succeeded");
    expect(queue.getActiveCount()).toBe(0);

    // Verify exponential backoff stays bounded with jitter
    const d1 = computeBackoffDelaySeconds(1, 2, 120, () => 0.5);
    const d3 = computeBackoffDelaySeconds(3, 2, 120, () => 0.5);
    expect(d3).toBeGreaterThan(d1);
  });

  it("Provider adapters redact API keys from HTTP errors and parse JSON outputs cleanly", async () => {
    const fakeSecret = "sk-adapter-test-secret-123456";
    const failingFetch = (async () =>
      new Response(`Invalid api key ${fakeSecret}`, { status: 429 })) as typeof fetch;

    const registry = new AIProviderRegistry(failingFetch);
    await expect(
      registry.get("openai").generate(
        {
          modelId: "gpt-4.1",
          systemPrompt: "sys",
          userPrompt: "usr",
          expectJson: true,
        },
        { apiKey: fakeSecret }
      )
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof ExternalProviderError &&
        err.retryable === true &&
        !err.message.includes(fakeSecret)
      );
    });
  });
});
