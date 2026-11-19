import type {
  AIJobStatus,
  AIProviderType,
  AITaskType,
  ArtifactStatus,
  ArtifactType,
  ChangeStatus,
  EntityType,
  ExportFormat,
  JobType,
  ProjectStatus,
  RequirementPriority,
  RequirementSourceType,
  RequirementStatus,
  RequirementType,
  StageKey,
  StageStatus,
  ValidationSeverity,
  WorkspaceRole,
} from "./enums";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  settings: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email?: string;
  fullName?: string;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  invitedBy: string;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  restrictedAccess: boolean;
  createdBy: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStage {
  id: string;
  projectId: string;
  workspaceId: string;
  stageKey: StageKey;
  status: StageStatus;
  progressPct: number;
  notes?: string | null;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  workspaceId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storagePath: string;
  uploadStatus: "pending" | "uploaded" | "failed";
  extractedText?: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface DiscoverySession {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  briefSnapshot: string;
  status: "active" | "completed" | "archived";
  summary: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationAnswer {
  id: string;
  questionId: string;
  answerText: string;
  isDeferral: boolean;
  deferralReason?: string | null;
  provenance: "manual" | "stakeholder_interview" | "document" | "decision";
  answeredBy: string;
  createdAt: string;
}

export interface ClarificationQuestion {
  id: string;
  workspaceId: string;
  projectId: string;
  sessionId: string;
  category: string;
  questionText: string;
  rationale: string;
  priority: RequirementPriority;
  status: "open" | "answered" | "deferred" | "dismissed";
  source: "ai" | "user";
  answers: ClarificationAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface RequirementRevision {
  id: string;
  requirementId: string;
  versionNo: number;
  snapshot: Record<string, unknown>;
  changeSummary: string;
  changedBy?: string | null;
  createdAt: string;
}

export interface Requirement {
  id: string;
  workspaceId: string;
  projectId: string;
  requirementKey: string;
  requirementType: RequirementType;
  title: string;
  description: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  acceptanceCriteria: string[];
  sourceType: RequirementSourceType;
  sourceRefId?: string | null;
  currentVersion: number;
  revisions?: RequirementRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface Assumption {
  id: string;
  workspaceId: string;
  projectId: string;
  assumptionKey: string;
  statement: string;
  confidence: "high" | "medium" | "low";
  status: "open" | "validated" | "invalidated";
  impactIfFalse: string;
  createdAt: string;
}

export interface Constraint {
  id: string;
  workspaceId: string;
  projectId: string;
  constraintKey: string;
  category: "business" | "technical" | "operational" | "regulatory" | "budget" | "timeline";
  title: string;
  description: string;
  severity: RequirementPriority;
  createdAt: string;
}

export interface Decision {
  id: string;
  workspaceId: string;
  projectId: string;
  decisionKey: string;
  title: string;
  context: string;
  decisionStatement: string;
  rationale: string;
  alternatives: string[];
  status: "proposed" | "accepted" | "superseded" | "rejected";
  decidedBy?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface ResearchSource {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  sourceKind: "web" | "uploaded_file" | "interview" | "benchmark" | "internal_doc";
  url?: string | null;
  fileId?: string | null;
  authorOrPublisher?: string | null;
  createdAt: string;
}

export interface ResearchEvidence {
  id: string;
  workspaceId: string;
  projectId: string;
  sourceId: string;
  excerpt: string;
  claimSummary: string;
  confidence: "high" | "medium" | "low";
  linkedEntityType?: EntityType | null;
  linkedEntityId?: string | null;
  createdAt: string;
}

export interface ArtifactSection {
  id: string;
  revisionId: string;
  sectionKey: string;
  heading: string;
  orderIndex: number;
  bodyMarkdown: string;
  structuredData: Record<string, unknown>;
}

export interface ArtifactComment {
  id: string;
  revisionId: string;
  sectionKey?: string | null;
  body: string;
  resolved: boolean;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export interface ArtifactRevision {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactId: string;
  versionNo: number;
  status: ArtifactStatus;
  source: "manual" | "ai_generated" | "ai_section_regen" | "import";
  baseRevisionId?: string | null;
  changeSummary: string;
  aiJobId?: string | null;
  content: {
    summary?: string;
    sections: Array<{
      sectionKey: string;
      heading: string;
      orderIndex: number;
      bodyMarkdown: string;
      structuredData?: Record<string, unknown>;
    }>;
    linkedRequirementIds?: string[];
  };
  sections?: ArtifactSection[];
  createdBy?: string | null;
  createdAt: string;
}

export interface Artifact {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactType: ArtifactType;
  title: string;
  currentRevisionId?: string | null;
  needsReview: boolean;
  currentRevision?: ArtifactRevision | null;
  revisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  workspaceId: string;
  projectId: string;
  featureKey: string;
  name: string;
  description: string;
  scopeBucket: "mvp" | "phase_2" | "deferred" | "excluded";
  priority: RequirementPriority;
  effortEstimate: "XS" | "S" | "M" | "L" | "XL";
  rationale: string;
  acceptanceSummary: string;
  createdAt: string;
}

export interface UXPersona {
  id: string;
  projectId: string;
  name: string;
  roleLabel: string;
  goals: string[];
  painPoints: string[];
  technicalProficiency: string;
}

export interface UserJourney {
  id: string;
  projectId: string;
  personaId?: string | null;
  name: string;
  goal: string;
  steps: Array<{ stepNo: number; action: string; systemResponse: string; touchpoint: string }>;
  successCriteria: string;
}

export interface ScreenSpec {
  id: string;
  projectId: string;
  screenKey: string;
  name: string;
  routePath: string;
  purpose: string;
  components: string[];
  interactions: string[];
  states: { loading: boolean; empty: boolean; error: boolean };
}

export interface ArchitectureComponent {
  id: string;
  projectId: string;
  componentKey: string;
  name: string;
  layer: "client" | "edge" | "application" | "worker" | "data" | "external";
  technology: string;
  responsibility: string;
  positionX: number;
  positionY: number;
}

export interface ArchitectureRelationship {
  id: string;
  projectId: string;
  sourceComponentId: string;
  targetComponentId: string;
  protocol: string;
  label: string;
  isAsync: boolean;
}

export interface ArchitectureDecision {
  id: string;
  projectId: string;
  adrKey: string;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  context: string;
  decision: string;
  consequences: string;
  createdAt: string;
}

export interface DbAttribute {
  id: string;
  entityId: string;
  columnName: string;
  dataType: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string | null;
  description: string;
  ordinalPosition: number;
}

export interface DbEntity {
  id: string;
  projectId: string;
  tableName: string;
  schemaName: string;
  description: string;
  rlsEnabled: boolean;
  positionX: number;
  positionY: number;
  attributes: DbAttribute[];
}

export interface DbRelationship {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  sourceColumn: string;
  targetColumn: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  onDelete: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";
}

export interface ApiEndpoint {
  id: string;
  projectId: string;
  endpointKey: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description: string;
  authPolicy: string;
  requestSchema: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
  statusCodes: number[];
  tags: string[];
}

export interface DevelopmentTask {
  id: string;
  projectId: string;
  taskKey: string;
  phase: string;
  title: string;
  description: string;
  ownerRole: string;
  priority: RequirementPriority;
  estimateHours: number;
  status: "not_started" | "in_progress" | "blocked" | "in_review" | "done" | "deferred";
  acceptanceCriteria: string[];
  dependencyTaskIds: string[];
}

export interface TestCase {
  id: string;
  projectId: string;
  testKey: string;
  area: string;
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  testType: "unit" | "integration" | "api" | "e2e" | "security" | "accessibility" | "performance";
  priority: RequirementPriority;
  status: "draft" | "ready" | "passing" | "failing" | "blocked";
}

export interface TraceabilityLink {
  id: string;
  workspaceId: string;
  projectId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationType: "derives_from" | "implements" | "verifies" | "depends_on" | "impacts" | "references";
  createdAt: string;
}

export interface ValidationIssue {
  id: string;
  validationRunId: string;
  ruleCode: string;
  severity: ValidationSeverity;
  title: string;
  description: string;
  recommendation: string;
  entityType?: EntityType | null;
  entityId?: string | null;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  createdAt: string;
}

export interface ValidationRun {
  id: string;
  workspaceId: string;
  projectId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  blockerCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  summary: Record<string, unknown>;
  issues: ValidationIssue[];
  completedAt?: string | null;
  createdAt: string;
}

export interface ChangeImpact {
  id: string;
  changeRequestId: string;
  affectedEntityType: EntityType;
  affectedEntityId: string;
  impactSeverity: "blocker" | "high" | "medium" | "low";
  rationale: string;
  reviewed: boolean;
}

export interface ChangeRequest {
  id: string;
  workspaceId: string;
  projectId: string;
  changeKey: string;
  title: string;
  description: string;
  reason: string;
  status: ChangeStatus;
  sourceEntityType?: EntityType | null;
  sourceEntityId?: string | null;
  requestedBy: string;
  impacts: ChangeImpact[];
  createdAt: string;
}

export interface Approval {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactId: string;
  targetRevisionId: string;
  decision: "approved" | "changes_requested" | "rejected";
  comment: string;
  reviewerId: string;
  reviewerName?: string;
  createdAt: string;
}

export interface AIModelCapabilities {
  structuredOutput: boolean;
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  longContext: boolean;
  contextWindow: number;
  maxOutputTokens: number;
}

/** Safe client-facing provider metadata — NEVER contains secret keys or ciphertext. */
export interface AIProviderMetadata {
  id: string;
  workspaceId: string;
  providerType: AIProviderType;
  displayName: string;
  baseUrl?: string | null;
  enabled: boolean;
  keyHint: string;
  keyVersion?: string;
  lastTestedAt?: string | null;
  lastTestStatus?: "ok" | "error" | null;
  lastTestError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  workspaceId: string;
  providerId: string;
  providerType?: AIProviderType;
  providerDisplayName?: string;
  modelId: string;
  displayName: string;
  enabled: boolean;
  capabilities: AIModelCapabilities;
  inputCostPer1mUsd: number;
  outputCostPer1mUsd: number;
}

export interface AITaskPolicy {
  id: string;
  workspaceId: string;
  taskType: AITaskType;
  defaultModelId?: string | null;
  fallbackModelId?: string | null;
  allowedModelIds: string[];
  allowUserOverride: boolean;
  maxTokens: number;
  monthlyBudgetUsd?: number | null;
  updatedAt: string;
}

export interface AIJobEvent {
  id: string;
  jobId: string;
  eventType: string;
  message: string;
  progressPct?: number | null;
  createdAt: string;
}

export interface AIJob {
  id: string;
  workspaceId: string;
  projectId: string;
  jobType: JobType;
  taskType?: AITaskType | null;
  status: AIJobStatus;
  resolvedProviderId?: string | null;
  resolvedModelId?: string | null;
  wasUserOverride: boolean;
  inputPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  idempotencyKey: string;
  attemptCount: number;
  maxAttempts: number;
  requestedBy?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  events?: AIJobEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface AIUsageRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  jobId?: string | null;
  providerId?: string | null;
  taskType: AITaskType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  actualCostUsd?: number | null;
  latencyMs: number;
  actorUserId?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  requestId?: string | null;
  createdAt: string;
}

export interface ExportFile {
  id: string;
  workspaceId: string;
  projectId: string;
  jobId?: string | null;
  format: ExportFormat;
  artifactRevisionIds: string[];
  fileName: string;
  mimeType: string;
  sizeBytes?: number | null;
  storageBucket: string;
  storagePath?: string | null;
  status: "queued" | "running" | "succeeded" | "failed";
  errorMessage?: string | null;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}
