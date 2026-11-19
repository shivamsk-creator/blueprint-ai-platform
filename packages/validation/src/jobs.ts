import { z } from "zod";
import { AI_TASK_TYPES, ARTIFACT_TYPES, EXPORT_FORMATS } from "@blueprint/domain";

export const JOB_SCHEMA_VERSION = "1.0" as const;

const baseEnvelope = z.object({
  schemaVersion: z.literal(JOB_SCHEMA_VERSION).default(JOB_SCHEMA_VERSION),
  jobId: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  requestedBy: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128),
  modelOverrideId: z.string().optional(),
});

export const generateArtifactJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("ai.generate_artifact"),
  taskType: z.enum(AI_TASK_TYPES),
  artifactId: z.string().min(1),
  artifactType: z.enum(ARTIFACT_TYPES),
  instructions: z.string().max(4000).optional(),
  requirementIds: z.array(z.string()).default([]),
});

export const regenerateSectionJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("ai.regenerate_section"),
  taskType: z.enum(AI_TASK_TYPES),
  artifactId: z.string().min(1),
  artifactType: z.enum(ARTIFACT_TYPES),
  baseRevisionId: z.string().min(1),
  sectionKey: z.string().min(1),
  instructions: z.string().min(3).max(4000),
});

export const discoveryAnalyzeJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("discovery.analyze"),
  taskType: z.literal("requirement_analysis").default("requirement_analysis"),
  sessionId: z.string().min(1),
  fileIds: z.array(z.string()).default([]),
  instructions: z.string().max(2000).optional(),
});

export const validationRunJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("validation.run"),
  taskType: z.literal("consistency_validation").default("consistency_validation"),
  validationRunId: z.string().min(1),
  includeAiReview: z.boolean().default(true),
});

export const researchSynthesizeJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("research.synthesize"),
  taskType: z.literal("research_synthesis").default("research_synthesis"),
  sourceIds: z.array(z.string()).default([]),
});

export const exportGenerateJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("export.generate"),
  taskType: z.literal("export_rendering").default("export_rendering"),
  exportId: z.string().min(1),
  format: z.enum(EXPORT_FORMATS),
  artifactRevisionIds: z.array(z.string()).default([]),
  includeTraceability: z.boolean().default(true),
});

export const usageReconcileJobPayloadSchema = baseEnvelope.extend({
  jobType: z.literal("usage.reconcile"),
  taskType: z.literal("export_rendering").optional(),
  targetJobId: z.string().optional(),
});

export const jobEnvelopeSchema = z.discriminatedUnion("jobType", [
  generateArtifactJobPayloadSchema,
  regenerateSectionJobPayloadSchema,
  discoveryAnalyzeJobPayloadSchema,
  validationRunJobPayloadSchema,
  researchSynthesizeJobPayloadSchema,
  exportGenerateJobPayloadSchema,
  usageReconcileJobPayloadSchema,
]);

export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;
