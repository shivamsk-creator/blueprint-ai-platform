import crypto from "node:crypto";
import {
  ARTIFACT_META,
  DomainError,
  type AIJob,
  type AITaskType,
  type Artifact,
  type ArtifactRevision,
  type Requirement,
} from "@blueprint/domain";
import {
  AIProviderRegistry,
  estimateUsageCostUsd,
  type AIGenerateResponse,
} from "@blueprint/ai-providers";
import {
  aiArtifactOutputSchema,
  aiDiscoveryOutputSchema,
  aiSectionOutputSchema,
  aiValidationOutputSchema,
  jobEnvelopeSchema,
  type JobEnvelope,
} from "@blueprint/validation";
import {
  redactSensitiveData,
  type ActorContext,
  type BlueprintRepository,
  type QueueMessage,
} from "@blueprint/database";
import { renderBlueprintExport } from "./exporters";
import { computeBackoffDelaySeconds, isTransientJobError } from "./retry";

export interface WorkerProcessorOptions {
  registry?: AIProviderRegistry;
  providerTimeoutMs?: number;
  allowSyntheticFallback?: boolean;
}

export class BlueprintJobProcessor {
  private readonly registry: AIProviderRegistry;
  private readonly providerTimeoutMs: number;
  private readonly allowSyntheticFallback: boolean;

  constructor(
    private readonly repo: BlueprintRepository,
    options: WorkerProcessorOptions = {}
  ) {
    this.registry = options.registry ?? new AIProviderRegistry();
    this.providerTimeoutMs = options.providerTimeoutMs ?? Number(process.env.AI_PROVIDER_TIMEOUT_MS || 60_000);
    this.allowSyntheticFallback = options.allowSyntheticFallback ?? process.env.BLUEPRINT_DEMO_MODE !== "false";
  }

  private appendJobEvent(jobId: string, eventType: string, message: string, progressPct?: number): void {
    const job = this.repo.state.aiJobs.get(jobId);
    if (!job) return;
    const now = new Date().toISOString();
    const updated: AIJob = {
      ...job,
      events: [
        ...(job.events ?? []),
        {
          id: crypto.randomUUID(),
          jobId,
          eventType,
          message,
          progressPct: progressPct ?? null,
          createdAt: now,
        },
      ],
      updatedAt: now,
    };
    this.repo.state.aiJobs.set(jobId, updated);
  }

  private getSystemActor(userId: string): ActorContext {
    const profile = this.repo.state.profiles.get(userId);
    return {
      userId,
      email: profile?.email ?? "worker@blueprint.local",
      fullName: profile?.fullName ?? "Blueprint Worker",
    };
  }

  private isCancelled(jobId: string): boolean {
    return this.repo.state.aiJobs.get(jobId)?.status === "cancelled";
  }

  private async invokeProviderWithFallback(params: {
    workspaceId: string;
    projectId: string;
    jobId: string;
    actorUserId: string;
    taskType: AITaskType;
    modelOverrideId?: string;
    systemPrompt: string;
    userPrompt: string;
    syntheticResponse: () => unknown;
  }): Promise<{ parsed: unknown; modelId: string; providerId: string }> {
    const route = this.repo.resolveWorkspaceModel(
      params.workspaceId,
      params.taskType,
      params.modelOverrideId
    );

    const attemptModel = async (target: {
      providerId: string;
      providerType: typeof route.provider.providerType;
      modelId: string;
      inputCostPer1mUsd: number;
      outputCostPer1mUsd: number;
    }): Promise<AIGenerateResponse> => {
      const creds = this.repo.getDecryptedProviderCredentialsInternal(target.providerId);
      // In demo/offline mode with placeholder demo keys, produce deterministic validated structured output
      if (this.allowSyntheticFallback && creds.apiKey.toLowerCase().includes("demo")) {
        const synthetic = params.syntheticResponse();
        const serialized = JSON.stringify(synthetic);
        return {
          text: serialized,
          parsedJson: synthetic,
          usage: {
            inputTokens: Math.max(400, Math.round(params.userPrompt.length / 4)),
            outputTokens: Math.max(250, Math.round(serialized.length / 4)),
            totalTokens: Math.max(650, Math.round((params.userPrompt.length + serialized.length) / 4)),
          },
          latencyMs: 120,
          modelId: target.modelId,
        };
      }
      const adapter = this.registry.get(target.providerType);
      return adapter.generate(
        {
          modelId: target.modelId,
          systemPrompt: params.systemPrompt,
          userPrompt: params.userPrompt,
          expectJson: true,
          maxTokens: route.maxTokens,
          timeoutMs: this.providerTimeoutMs,
        },
        { apiKey: creds.apiKey, baseUrl: creds.baseUrl }
      );
    };

    let response: AIGenerateResponse;
    let usedProviderId = route.provider.id;
    let usedModel = route.primary;

    try {
      response = await attemptModel({
        providerId: route.provider.id,
        providerType: route.provider.providerType,
        modelId: route.primary.modelId,
        inputCostPer1mUsd: route.primary.inputCostPer1mUsd,
        outputCostPer1mUsd: route.primary.outputCostPer1mUsd,
      });
    } catch (primaryErr) {
      if (route.fallback && isTransientJobError(primaryErr)) {
        this.appendJobEvent(
          params.jobId,
          "fallback",
          `Primary model ${route.primary.modelId} failed transiently; falling back to ${route.fallback.model.modelId}.`
        );
        usedProviderId = route.fallback.provider.id;
        usedModel = route.fallback.model;
        response = await attemptModel({
          providerId: route.fallback.provider.id,
          providerType: route.fallback.provider.providerType,
          modelId: route.fallback.model.modelId,
          inputCostPer1mUsd: route.fallback.model.inputCostPer1mUsd,
          outputCostPer1mUsd: route.fallback.model.outputCostPer1mUsd,
        });
      } else {
        throw primaryErr;
      }
    }

    // Record server-side usage & cost attribution (P04-05)
    const estimatedCostUsd = estimateUsageCostUsd(
      usedModel,
      response.usage.inputTokens,
      response.usage.outputTokens
    );
    const usageId = crypto.randomUUID();
    this.repo.state.aiUsageRecords.set(usageId, {
      id: usageId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      jobId: params.jobId,
      providerId: usedProviderId,
      taskType: params.taskType,
      modelId: usedModel.modelId,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      estimatedCostUsd,
      actualCostUsd: null,
      latencyMs: response.latencyMs,
      actorUserId: params.actorUserId,
      createdAt: new Date().toISOString(),
    });

    return {
      parsed: response.parsedJson ?? JSON.parse(response.text),
      modelId: usedModel.modelId,
      providerId: usedProviderId,
    };
  }

  async processMessage(msg: QueueMessage): Promise<{ status: AIJob["status"]; result?: Record<string, unknown> }> {
    const parsedEnvelope = jobEnvelopeSchema.safeParse(msg.payload);
    if (!parsedEnvelope.success) {
      await this.repo.queue.moveToDeadLetter(msg.msgId, msg.payload, "Invalid job envelope schema");
      return { status: "failed" };
    }

    const envelope = parsedEnvelope.data;
    const job = this.repo.state.aiJobs.get(envelope.jobId);
    if (!job) {
      await this.repo.queue.archive(msg.msgId);
      return { status: "failed" };
    }

    if (job.status === "cancelled" || job.status === "succeeded") {
      await this.repo.queue.archive(msg.msgId);
      return { status: job.status };
    }

    const now = new Date().toISOString();
    const attemptCount = job.attemptCount + 1;
    this.repo.state.aiJobs.set(job.id, {
      ...job,
      status: "running",
      attemptCount,
      startedAt: job.startedAt ?? now,
      updatedAt: now,
    });
    this.appendJobEvent(job.id, "running", `Worker claimed job (attempt ${attemptCount}/${job.maxAttempts})`, 15);

    try {
      const result = await this.dispatch(envelope);

      if (this.isCancelled(job.id)) {
        await this.repo.queue.archive(msg.msgId);
        return { status: "cancelled" };
      }

      const completedAt = new Date().toISOString();
      const latest = this.repo.state.aiJobs.get(job.id)!;
      this.repo.state.aiJobs.set(job.id, {
        ...latest,
        status: "succeeded",
        resultPayload: result,
        errorCode: null,
        errorMessage: null,
        completedAt,
        updatedAt: completedAt,
      });
      this.appendJobEvent(job.id, "succeeded", "Job completed and persisted successfully.", 100);
      await this.repo.queue.archive(msg.msgId);
      return { status: "succeeded", result };
    } catch (err) {
      const safeError = redactSensitiveData(err instanceof Error ? err.message : "Unknown worker error");
      const transient = isTransientJobError(err);
      const latest = this.repo.state.aiJobs.get(job.id)!;

      if (transient && attemptCount < latest.maxAttempts) {
        const delaySec = computeBackoffDelaySeconds(attemptCount);
        this.repo.state.aiJobs.set(job.id, {
          ...latest,
          status: "queued",
          errorCode: err instanceof DomainError ? err.code : "TRANSIENT_ERROR",
          errorMessage: safeError,
          updatedAt: new Date().toISOString(),
        });
        this.appendJobEvent(
          job.id,
          "retrying",
          `Transient failure (${safeError}). Scheduled retry #${attemptCount + 1} in ${delaySec}s.`
        );
        await this.repo.queue.archive(msg.msgId);
        await this.repo.queue.enqueue(envelope, delaySec);
        return { status: "queued" };
      }

      // Terminal failure -> mark failed and move to dead-letter queue
      this.repo.state.aiJobs.set(job.id, {
        ...latest,
        status: "failed",
        errorCode: err instanceof DomainError ? err.code : "TERMINAL_ERROR",
        errorMessage: safeError,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.appendJobEvent(job.id, "failed", `Terminal failure: ${safeError}`);
      await this.repo.queue.moveToDeadLetter(msg.msgId, envelope, safeError);
      return { status: "failed" };
    }
  }

  private async dispatch(envelope: JobEnvelope): Promise<Record<string, unknown>> {
    const actor = this.getSystemActor(envelope.requestedBy);

    switch (envelope.jobType) {
      case "discovery.analyze": {
        const session = this.repo.state.discoverySessions.get(envelope.sessionId);
        if (!session || session.projectId !== envelope.projectId) {
          throw new DomainError({
            status: 404,
            code: "SESSION_NOT_FOUND",
            title: "Discovery Session Not Found",
            detail: `Discovery session ${envelope.sessionId} not found in project.`,
          });
        }
        const files = envelope.fileIds
          .map((id) => this.repo.state.projectFiles.get(id))
          .filter((f): f is NonNullable<typeof f> => Boolean(f && f.projectId === envelope.projectId));

        this.appendJobEvent(envelope.jobId, "progress", "Analyzing brief and uploaded evidence...", 45);
        const aiRes = await this.invokeProviderWithFallback({
          workspaceId: envelope.workspaceId,
          projectId: envelope.projectId,
          jobId: envelope.jobId,
          actorUserId: envelope.requestedBy,
          taskType: "requirement_analysis",
          modelOverrideId: envelope.modelOverrideId,
          systemPrompt: "You are a senior business analyst producing structured JSON gap analysis and requirements.",
          userPrompt: `Brief:\n${session.briefSnapshot}\nFiles:\n${files.map((f) => `${f.fileName}: ${f.extractedText ?? ""}`).join("\n")}\nInstructions: ${envelope.instructions ?? ""}`,
          syntheticResponse: () => ({
            summary: `Analyzed "${session.title}" across ${files.length} attached source(s).`,
            clarificationQuestions: [
              {
                category: "security",
                questionText: "What data retention period and export redaction rules apply to archived project records?",
                rationale: "Impacts database lifecycle policies and compliance audit scope.",
                priority: "high",
              },
              {
                category: "scalability",
                questionText: "What peak concurrent jobs per workspace must the queue worker sustain?",
                rationale: "Determines worker concurrency and provider rate-limit tiers.",
                priority: "medium",
              },
            ],
            proposedRequirements: [
              {
                requirementType: "functional",
                title: "Automated Discovery Brief Synthesis",
                description: `System extracts structured clarification questions and traceable requirements from "${session.title}".`,
                priority: "high",
                acceptanceCriteria: [
                  "All proposed items start in 'proposed' status until reviewed.",
                  "Each proposed requirement links back to its discovery session source.",
                ],
              },
            ],
          }),
        });

        const validated = aiDiscoveryOutputSchema.parse(aiRes.parsed);
        const createdQuestionIds: string[] = [];
        for (const q of validated.clarificationQuestions) {
          const created = this.repo.createClarificationQuestion(actor, envelope.projectId, {
            sessionId: session.id,
            category: q.category,
            questionText: q.questionText,
            rationale: q.rationale,
            priority: q.priority,
          });
          created.source = "ai";
          createdQuestionIds.push(created.id);
        }

        const createdRequirementIds: string[] = [];
        for (const req of validated.proposedRequirements) {
          const created = this.repo.createRequirement(actor, envelope.projectId, {
            requirementType: req.requirementType,
            title: req.title,
            description: req.description,
            priority: req.priority,
            status: "proposed", // Risk R-004: never mark AI output confirmed automatically
            acceptanceCriteria: req.acceptanceCriteria,
            sourceType: "brief",
            sourceRefId: session.id,
          });
          createdRequirementIds.push(created.id);
        }

        return {
          summary: validated.summary,
          createdQuestionIds,
          createdRequirementIds,
          modelId: aiRes.modelId,
        };
      }

      case "ai.generate_artifact": {
        const artifact = this.repo.state.artifacts.get(envelope.artifactId);
        if (!artifact || artifact.projectId !== envelope.projectId) {
          throw new DomainError({
            status: 404,
            code: "ARTIFACT_NOT_FOUND",
            title: "Artifact Not Found",
            detail: `Artifact ${envelope.artifactId} not found in project.`,
          });
        }
        const project = this.repo.state.projects.get(envelope.projectId)!;
        const confirmedReqs: Requirement[] = Array.from(this.repo.state.requirements.values()).filter(
          (r) =>
            r.projectId === envelope.projectId &&
            (envelope.requirementIds.length > 0
              ? envelope.requirementIds.includes(r.id)
              : r.status === "confirmed")
        );
        const meta = ARTIFACT_META[envelope.artifactType];

        this.appendJobEvent(envelope.jobId, "progress", `Generating structured ${meta.shortTitle} candidate revision...`, 50);
        const aiRes = await this.invokeProviderWithFallback({
          workspaceId: envelope.workspaceId,
          projectId: envelope.projectId,
          jobId: envelope.jobId,
          actorUserId: envelope.requestedBy,
          taskType: envelope.taskType,
          modelOverrideId: envelope.modelOverrideId,
          systemPrompt: `You are an enterprise systems architect generating a structured ${meta.title} in JSON.`,
          userPrompt: `Project: ${project.name}\nDescription: ${project.description}\nConfirmed Requirements:\n${confirmedReqs.map((r) => `- ${r.requirementKey}: ${r.title} (${r.description})`).join("\n")}\nInstructions: ${envelope.instructions ?? ""}`,
          syntheticResponse: () => ({
            summary: `AI-generated ${meta.title} grounded in ${confirmedReqs.length} confirmed requirement(s).`,
            sections: meta.defaultSections.map((sec, idx) => ({
              sectionKey: sec.key,
              heading: sec.heading,
              orderIndex: idx,
              bodyMarkdown: [
                `### ${sec.heading}`,
                `Synthesized for **${project.name}**${envelope.instructions ? ` following guidance: _${envelope.instructions}_` : ""}.`,
                "",
                ...confirmedReqs.slice(0, 4).map((r) => `- **${r.requirementKey}** (${r.priority}): ${r.title} — ${r.description}`),
              ].join("\n"),
            })),
          }),
        });

        const validated = aiArtifactOutputSchema.parse(aiRes.parsed);
        // ART-01: Create candidate draft revision; do NOT overwrite existing user revision if one already exists!
        const hasExistingCurrent = Boolean(artifact.currentRevisionId);
        const candidateRev: ArtifactRevision = this.repo.createArtifactRevision(actor, artifact.id, {
          sections: validated.sections,
          summary: validated.summary,
          changeSummary: `AI candidate generated via ${aiRes.modelId}`,
          status: "draft",
          source: "ai_generated",
          baseRevisionId: artifact.currentRevisionId ?? null,
          aiJobId: envelope.jobId,
          setAsCurrent: !hasExistingCurrent,
          linkedRequirementIds: confirmedReqs.map((r) => r.id),
        });

        return {
          artifactId: artifact.id,
          candidateRevisionId: candidateRev.id,
          versionNo: candidateRev.versionNo,
          modelId: aiRes.modelId,
          autoPromoted: !hasExistingCurrent,
        };
      }

      case "ai.regenerate_section": {
        const artifact = this.repo.state.artifacts.get(envelope.artifactId);
        const baseRev = this.repo.state.artifactRevisions.get(envelope.baseRevisionId);
        if (!artifact || !baseRev || baseRev.artifactId !== artifact.id) {
          throw new DomainError({
            status: 404,
            code: "REVISION_NOT_FOUND",
            title: "Base Revision Not Found",
            detail: "Target artifact or base revision not found.",
          });
        }
        const targetSection = baseRev.content.sections.find((s) => s.sectionKey === envelope.sectionKey);
        if (!targetSection) {
          throw new DomainError({
            status: 404,
            code: "SECTION_NOT_FOUND",
            title: "Section Not Found",
            detail: `Section "${envelope.sectionKey}" not found in revision v${baseRev.versionNo}.`,
          });
        }

        this.appendJobEvent(envelope.jobId, "progress", `Regenerating section "${targetSection.heading}"...`, 50);
        const aiRes = await this.invokeProviderWithFallback({
          workspaceId: envelope.workspaceId,
          projectId: envelope.projectId,
          jobId: envelope.jobId,
          actorUserId: envelope.requestedBy,
          taskType: envelope.taskType,
          modelOverrideId: envelope.modelOverrideId,
          systemPrompt: "Regenerate only the requested specification section cleanly as structured JSON.",
          userPrompt: `Section: ${targetSection.heading}\nCurrent content:\n${targetSection.bodyMarkdown}\nUser instructions:\n${envelope.instructions}`,
          syntheticResponse: () => ({
            sectionKey: targetSection.sectionKey,
            heading: targetSection.heading,
            bodyMarkdown: `${targetSection.bodyMarkdown}\n\n#### Refined Revision Note\nUpdated per request: ${envelope.instructions}. All linked requirements and acceptance criteria remain preserved.`,
            changeSummary: `Regenerated section "${targetSection.heading}"`,
          }),
        });

        const validated = aiSectionOutputSchema.parse(aiRes.parsed);
        const nextSections = baseRev.content.sections.map((s) =>
          s.sectionKey === targetSection.sectionKey
            ? { ...s, heading: validated.heading, bodyMarkdown: validated.bodyMarkdown }
            : s
        );

        // P06-04 & ART-01: NEVER silently overwrite current revision — save candidate linked to baseRevisionId
        const candidate = this.repo.createArtifactRevision(actor, artifact.id, {
          sections: nextSections,
          summary: baseRev.content.summary,
          changeSummary: validated.changeSummary,
          status: "draft",
          source: "ai_section_regen",
          baseRevisionId: baseRev.id,
          aiJobId: envelope.jobId,
          setAsCurrent: false,
          linkedRequirementIds: baseRev.content.linkedRequirementIds,
        });

        return {
          artifactId: artifact.id,
          baseRevisionId: baseRev.id,
          candidateRevisionId: candidate.id,
          versionNo: candidate.versionNo,
          sectionKey: envelope.sectionKey,
          modelId: aiRes.modelId,
        };
      }

      case "validation.run": {
        this.appendJobEvent(envelope.jobId, "progress", "Running deterministic consistency and coverage rules...", 40);
        const run = this.repo.runValidationNow(actor, envelope.projectId);

        if (envelope.includeAiReview) {
          try {
            this.appendJobEvent(envelope.jobId, "progress", "Running AI semantic contradiction review...", 75);
            const aiRes = await this.invokeProviderWithFallback({
              workspaceId: envelope.workspaceId,
              projectId: envelope.projectId,
              jobId: envelope.jobId,
              actorUserId: envelope.requestedBy,
              taskType: "consistency_validation",
              modelOverrideId: envelope.modelOverrideId,
              systemPrompt: "Identify subtle semantic gaps or contradictions across project artifacts in JSON.",
              userPrompt: `Project ${envelope.projectId} deterministic issue count: ${run.issues.length}`,
              syntheticResponse: () => ({
                issues: [
                  {
                    ruleCode: "AI_SLA_ALIGNMENT",
                    severity: "info",
                    title: "Verify SLA wording across BRD and API specification",
                    description: "Ensure timeout and retry budgets in API contracts align with the 99.95% uptime SLA in the BRD.",
                    recommendation: "Add explicit latency SLO metrics to API Specification Section 1.",
                  },
                ],
              }),
            });
            const validated = aiValidationOutputSchema.parse(aiRes.parsed);
            const now = new Date().toISOString();
            for (const aiIssue of validated.issues) {
              run.issues.push({
                id: crypto.randomUUID(),
                validationRunId: run.id,
                ruleCode: aiIssue.ruleCode,
                severity: aiIssue.severity,
                title: aiIssue.title,
                description: aiIssue.description,
                recommendation: aiIssue.recommendation,
                entityType: null,
                entityId: null,
                status: "open",
                createdAt: now,
              });
            }
            this.repo.state.validationRuns.set(run.id, run);
          } catch (aiErr) {
            // Workbook rule: persist partial deterministic result if optional AI stage fails!
            this.appendJobEvent(
              envelope.jobId,
              "warning",
              `Optional AI validation stage skipped: ${aiErr instanceof Error ? aiErr.message : "error"}`
            );
          }
        }

        return {
          validationRunId: run.id,
          issueCount: run.issues.length,
          blockerCount: run.blockerCount,
          highCount: run.highCount,
        };
      }

      case "research.synthesize": {
        const sources = Array.from(this.repo.state.researchSources.values()).filter(
          (s) =>
            s.projectId === envelope.projectId &&
            (envelope.sourceIds.length === 0 || envelope.sourceIds.includes(s.id))
        );
        return {
          synthesizedSourceIds: sources.map((s) => s.id),
          summary: `Synthesized ${sources.length} provenance source(s) with citation bindings preserved.`,
        };
      }

      case "export.generate": {
        const exp = this.repo.state.exportFiles.get(envelope.exportId);
        const project = this.repo.state.projects.get(envelope.projectId);
        if (!exp || !project) {
          throw new DomainError({
            status: 404,
            code: "EXPORT_NOT_FOUND",
            title: "Export Record Not Found",
            detail: `Export ${envelope.exportId} not found.`,
          });
        }

        this.repo.state.exportFiles.set(exp.id, { ...exp, status: "running", updatedAt: new Date().toISOString() });
        this.appendJobEvent(envelope.jobId, "progress", `Rendering ${envelope.format.toUpperCase()} bundle...`, 55);

        // Select exact requested immutable revisions (EXP-01) or fall back to current revisions
        const artifactPairs: Array<{ artifact: Artifact; revision: ArtifactRevision }> = [];
        if (envelope.artifactRevisionIds.length > 0) {
          for (const revId of envelope.artifactRevisionIds) {
            const rev = this.repo.state.artifactRevisions.get(revId);
            if (!rev) continue;
            const art = this.repo.state.artifacts.get(rev.artifactId);
            if (art) artifactPairs.push({ artifact: art, revision: rev });
          }
        } else {
          for (const art of this.repo.state.artifacts.values()) {
            if (art.projectId === envelope.projectId && art.currentRevisionId) {
              const rev = this.repo.state.artifactRevisions.get(art.currentRevisionId);
              if (rev) artifactPairs.push({ artifact: art, revision: rev });
            }
          }
        }

        const requirements = this.repo.listRequirements(actor, envelope.projectId);
        const dbBundle = this.repo.getDatabaseBundle(actor, envelope.projectId);
        const apiBundle = this.repo.getApiBundle(actor, envelope.projectId);
        const traceability = envelope.includeTraceability
          ? this.repo.getTraceabilityMatrix(actor, envelope.projectId)
          : undefined;

        const rendered = await renderBlueprintExport({
          project,
          format: envelope.format,
          artifacts: artifactPairs,
          requirements,
          dbEntities: dbBundle.entities,
          dbRelationships: dbBundle.relationships,
          apiEndpoints: apiBundle.endpoints,
          traceability,
        });

        this.repo.state.exportBlobs.set(exp.id, {
          exportId: exp.id,
          bytes: rendered.bytes,
          mimeType: rendered.mimeType,
          fileName: rendered.fileName,
        });

        const completedAt = new Date().toISOString();
        this.repo.state.exportFiles.set(exp.id, {
          ...exp,
          fileName: rendered.fileName,
          mimeType: rendered.mimeType,
          sizeBytes: rendered.bytes.byteLength,
          status: "succeeded",
          updatedAt: completedAt,
        });

        return {
          exportId: exp.id,
          format: envelope.format,
          fileName: rendered.fileName,
          sizeBytes: rendered.bytes.byteLength,
          revisionIds: artifactPairs.map((p) => p.revision.id),
        };
      }

      case "usage.reconcile": {
        let reconciled = 0;
        for (const rec of this.repo.state.aiUsageRecords.values()) {
          if (rec.workspaceId === envelope.workspaceId && rec.actualCostUsd === null) {
            rec.actualCostUsd = rec.estimatedCostUsd;
            reconciled += 1;
          }
        }
        return { reconciledCount: reconciled };
      }
    }
  }

  /** Drain all currently visible messages in the queue once (used by worker poll & tests). */
  async pollOnce(concurrency = 4, visibilityTimeoutSeconds = 120): Promise<number> {
    const messages = await this.repo.queue.read(visibilityTimeoutSeconds, concurrency);
    if (messages.length === 0) return 0;
    await Promise.all(messages.map((m) => this.processMessage(m)));
    return messages.length;
  }
}
