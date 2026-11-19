import { z } from "zod";
import {
  AI_PROVIDER_TYPES,
  AI_TASK_TYPES,
  ARTIFACT_STATUSES,
  ARTIFACT_TYPES,
  CHANGE_STATUSES,
  ENTITY_TYPES,
  EXPORT_FORMATS,
  JOB_TYPES,
  PROJECT_STATUSES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_SOURCE_TYPES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  STAGE_KEYS,
  STAGE_STATUSES,
  WORKSPACE_ROLES,
} from "@blueprint/domain";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/, "Must be lowercase alphanumeric with hyphens");

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "contributor", "reviewer"]),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(140),
  slug: slugSchema.optional(),
  description: z.string().trim().max(5000).default(""),
  restrictedAccess: z.boolean().default(false),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  restrictedAccess: z.boolean().optional(),
});

export const updateStageSchema = z.object({
  status: z.enum(STAGE_STATUSES),
  progressPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const createProjectFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine((v) => !v.includes("..") && !v.includes("/"), "Invalid file name"),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
  extractedText: z.string().max(100_000).optional(),
});

export const createDiscoverySessionSchema = z.object({
  title: z.string().trim().min(2).max(200),
  briefSnapshot: z.string().trim().min(10).max(50_000),
});

export const enqueueDiscoveryAnalyzeSchema = z.object({
  sessionId: z.string().min(1),
  fileIds: z.array(z.string().min(1)).default([]),
  instructions: z.string().max(2000).optional(),
  modelOverrideId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const createClarificationQuestionSchema = z.object({
  sessionId: z.string().min(1),
  category: z.string().trim().min(1).max(60).default("functional"),
  questionText: z.string().trim().min(5).max(1500),
  rationale: z.string().trim().max(1500).default(""),
  priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
});

export const updateClarificationQuestionSchema = z.object({
  status: z.enum(["open", "answered", "deferred", "dismissed"]).optional(),
  answerText: z.string().trim().min(1).max(5000).optional(),
  isDeferral: z.boolean().optional(),
  deferralReason: z.string().trim().max(1000).optional(),
  provenance: z.enum(["manual", "stakeholder_interview", "document", "decision"]).default("manual"),
});

export const createRequirementSchema = z.object({
  requirementType: z.enum(REQUIREMENT_TYPES).default("functional"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
  priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
  status: z.enum(REQUIREMENT_STATUSES).default("proposed"),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).default([]),
  sourceType: z.enum(REQUIREMENT_SOURCE_TYPES).default("manual"),
  sourceRefId: z.string().optional(),
});

export const updateRequirementSchema = z.object({
  requirementType: z.enum(REQUIREMENT_TYPES).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).max(5000).optional(),
  priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
  status: z.enum(REQUIREMENT_STATUSES).optional(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).optional(),
  changeSummary: z.string().trim().max(500).default("Requirement updated"),
});

export const createDecisionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  context: z.string().trim().min(5).max(3000),
  decisionStatement: z.string().trim().min(5).max(3000),
  rationale: z.string().trim().min(5).max(3000),
  alternatives: z.array(z.string().trim().min(1).max(500)).default([]),
  status: z.enum(["proposed", "accepted", "superseded", "rejected"]).default("proposed"),
});

export const createAssumptionSchema = z.object({
  statement: z.string().trim().min(5).max(2000),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["open", "validated", "invalidated"]).default("open"),
  impactIfFalse: z.string().trim().max(2000).default(""),
});

export const createConstraintSchema = z.object({
  category: z.enum(["business", "technical", "operational", "regulatory", "budget", "timeline"]).default("technical"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(3000),
  severity: z.enum(REQUIREMENT_PRIORITIES).default("high"),
});

export const createResearchSourceSchema = z.object({
  title: z.string().trim().min(2).max(240),
  sourceKind: z.enum(["web", "uploaded_file", "interview", "benchmark", "internal_doc"]),
  url: z.string().url().optional().or(z.literal("")),
  authorOrPublisher: z.string().trim().max(160).optional(),
  excerpt: z.string().trim().min(5).max(4000).optional(),
  claimSummary: z.string().trim().min(3).max(1000).optional(),
  linkedEntityType: z.enum(ENTITY_TYPES).optional(),
  linkedEntityId: z.string().optional(),
});

export const artifactSectionInputSchema = z.object({
  sectionKey: z.string().trim().min(1).max(80),
  heading: z.string().trim().min(1).max(200),
  orderIndex: z.number().int().min(0),
  bodyMarkdown: z.string().max(100_000),
  structuredData: z.record(z.unknown()).optional(),
});

export const createArtifactRevisionSchema = z.object({
  sections: z.array(artifactSectionInputSchema).min(1),
  summary: z.string().max(2000).optional(),
  changeSummary: z.string().trim().max(500).default("Manual revision"),
  status: z.enum(ARTIFACT_STATUSES).default("draft"),
  baseRevisionId: z.string().optional(),
});

export const enqueueArtifactGenerateSchema = z.object({
  instructions: z.string().max(4000).optional(),
  modelOverrideId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
  requirementIds: z.array(z.string()).optional(),
});

export const enqueueSectionRegenerateSchema = z.object({
  baseRevisionId: z.string().min(1),
  sectionKey: z.string().trim().min(1).max(80),
  instructions: z.string().trim().min(3).max(4000),
  modelOverrideId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const approveRevisionSchema = z.object({
  decision: z.enum(["approved", "changes_requested", "rejected"]),
  comment: z.string().trim().max(2000).default(""),
});

export const createFeatureSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(3000).default(""),
  scopeBucket: z.enum(["mvp", "phase_2", "deferred", "excluded"]).default("mvp"),
  priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
  effortEstimate: z.enum(["XS", "S", "M", "L", "XL"]).default("M"),
  rationale: z.string().trim().max(2000).default(""),
  acceptanceSummary: z.string().trim().max(2000).default(""),
  linkedRequirementIds: z.array(z.string()).default([]),
});

export const createUXPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("persona"),
    name: z.string().trim().min(2).max(120),
    roleLabel: z.string().trim().min(2).max(120),
    goals: z.array(z.string().min(1)).default([]),
    painPoints: z.array(z.string().min(1)).default([]),
    technicalProficiency: z.string().trim().max(60).default("intermediate"),
  }),
  z.object({
    kind: z.literal("journey"),
    personaId: z.string().optional(),
    name: z.string().trim().min(2).max(160),
    goal: z.string().trim().min(3).max(500),
    steps: z.array(z.object({
      stepNo: z.number().int().positive(),
      action: z.string().min(1),
      systemResponse: z.string().min(1),
      touchpoint: z.string().min(1),
    })).default([]),
    successCriteria: z.string().trim().max(500).default(""),
  }),
  z.object({
    kind: z.literal("screen"),
    name: z.string().trim().min(2).max(160),
    routePath: z.string().trim().startsWith("/").max(200),
    purpose: z.string().trim().max(1000).default(""),
    components: z.array(z.string().min(1)).default([]),
    interactions: z.array(z.string().min(1)).default([]),
    linkedRequirementIds: z.array(z.string()).default([]),
  }),
]);

export const createArchitectureComponentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  layer: z.enum(["client", "edge", "application", "worker", "data", "external"]),
  technology: z.string().trim().max(160).default(""),
  responsibility: z.string().trim().max(1000).default(""),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
  relationships: z.array(z.object({
    targetComponentId: z.string().min(1),
    protocol: z.string().default("HTTPS"),
    label: z.string().default(""),
    isAsync: z.boolean().default(false),
  })).optional(),
});

export const createDbEntitySchema = z.object({
  tableName: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, "Must be snake_case SQL identifier"),
  schemaName: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).default("public"),
  description: z.string().trim().max(1000).default(""),
  rlsEnabled: z.boolean().default(true),
  attributes: z.array(z.object({
    columnName: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
    dataType: z.string().trim().min(1).max(80),
    isPrimaryKey: z.boolean().default(false),
    isNullable: z.boolean().default(false),
    isUnique: z.boolean().default(false),
    defaultValue: z.string().max(120).optional(),
    description: z.string().max(500).default(""),
  })).min(1),
});

export const createApiEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().trim().startsWith("/").max(255),
  summary: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).default(""),
  authPolicy: z.string().trim().min(2).max(160),
  requestSchema: z.record(z.unknown()).default({}),
  responseSchema: z.record(z.unknown()).default({}),
  statusCodes: z.array(z.number().int().min(100).max(599)).default([200, 400, 401, 403, 404]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const createDevelopmentTaskSchema = z.object({
  phase: z.string().trim().min(1).max(60).default("P01"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(3000).default(""),
  ownerRole: z.string().trim().max(80).default("Full Stack"),
  priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
  estimateHours: z.number().positive().max(2000).default(8),
  status: z.enum(["not_started", "in_progress", "blocked", "in_review", "done", "deferred"]).default("not_started"),
  acceptanceCriteria: z.array(z.string().trim().min(1)).default([]),
  dependencyTaskIds: z.array(z.string()).default([]),
  linkedRequirementIds: z.array(z.string()).default([]),
});

export const createTestCaseSchema = z.object({
  area: z.string().trim().min(2).max(100),
  title: z.string().trim().min(3).max(200),
  preconditions: z.string().trim().max(1000).default(""),
  steps: z.array(z.string().trim().min(1)).default([]),
  expectedResult: z.string().trim().min(3).max(1000),
  testType: z.enum(["unit", "integration", "api", "e2e", "security", "accessibility", "performance"]).default("integration"),
  priority: z.enum(REQUIREMENT_PRIORITIES).default("high"),
  status: z.enum(["draft", "ready", "passing", "failing", "blocked"]).default("ready"),
  linkedRequirementIds: z.array(z.string()).default([]),
});

export const createTraceabilityLinkSchema = z.object({
  sourceType: z.enum(ENTITY_TYPES),
  sourceId: z.string().min(1),
  targetType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1),
  relationType: z.enum(["derives_from", "implements", "verifies", "depends_on", "impacts", "references"]).default("implements"),
});

export const createChangeRequestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(3000),
  reason: z.string().trim().max(2000).default(""),
  sourceEntityType: z.enum(ENTITY_TYPES).optional(),
  sourceEntityId: z.string().optional(),
  status: z.enum(CHANGE_STATUSES).optional(),
});

export const createAIProviderSchema = z.object({
  providerType: z.enum(AI_PROVIDER_TYPES),
  displayName: z.string().trim().min(2).max(120),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().trim().min(8).max(512),
  enabled: z.boolean().default(true),
});

export const updateAIProviderSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  enabled: z.boolean().optional(),
  rotateApiKey: z.string().trim().min(8).max(512).optional(),
});

export const upsertAITaskPolicySchema = z.object({
  defaultModelId: z.string().min(1).nullable().optional(),
  fallbackModelId: z.string().min(1).nullable().optional(),
  allowedModelIds: z.array(z.string().min(1)).default([]),
  allowUserOverride: z.boolean().default(true),
  maxTokens: z.number().int().min(256).max(128_000).default(8192),
  monthlyBudgetUsd: z.number().nonnegative().nullable().optional(),
});

export const createAIJobSchema = z.object({
  jobType: z.enum(JOB_TYPES),
  taskType: z.enum(AI_TASK_TYPES).optional(),
  modelOverrideId: z.string().min(1).optional(),
  inputPayload: z.record(z.unknown()),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const createExportSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  artifactRevisionIds: z.array(z.string().min(1)).default([]),
  includeTraceability: z.boolean().default(true),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const stageKeyParamSchema = z.enum(STAGE_KEYS);
export const artifactTypeParamSchema = z.enum(ARTIFACT_TYPES);
export const taskTypeParamSchema = z.enum(AI_TASK_TYPES);
export const workspaceRoleSchema = z.enum(WORKSPACE_ROLES);
