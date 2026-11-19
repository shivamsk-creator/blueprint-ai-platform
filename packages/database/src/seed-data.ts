import {
  ARTIFACT_META,
  ARTIFACT_TYPES,
  LIFECYCLE_STAGES,
  type AIJob,
  type AIModel,
  type AIProviderMetadata,
  type AITaskPolicy,
  type AIUsageRecord,
  type ApiEndpoint,
  type Approval,
  type ArchitectureComponent,
  type ArchitectureDecision,
  type ArchitectureRelationship,
  type Artifact,
  type ArtifactComment,
  type ArtifactRevision,
  type Assumption,
  type AuditLog,
  type ChangeRequest,
  type ClarificationQuestion,
  type Constraint,
  type DbEntity,
  type DbRelationship,
  type Decision,
  type DevelopmentTask,
  type DiscoverySession,
  type ExportFile,
  type Feature,
  type Project,
  type ProjectFile,
  type ProjectStage,
  type Requirement,
  type ResearchEvidence,
  type ResearchSource,
  type ScreenSpec,
  type TestCase,
  type TraceabilityLink,
  type UserJourney,
  type UserProfile,
  type UXPersona,
  type ValidationRun,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMember,
} from "@blueprint/domain";
import { encryptSecret, maskApiKey } from "./crypto";

export interface StoredProviderSecret {
  providerId: string;
  workspaceId: string;
  ciphertext: string;
  keyVersion: string;
  rotatedAt: string;
}

export interface StoredExportBlob {
  exportId: string;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

export interface BlueprintState {
  profiles: Map<string, UserProfile>;
  workspaces: Map<string, Workspace>;
  workspaceMembers: Map<string, WorkspaceMember>;
  workspaceInvitations: Map<string, WorkspaceInvitation>;
  projects: Map<string, Project>;
  projectMembers: Map<string, { id: string; projectId: string; workspaceId: string; userId: string; role: WorkspaceMember["role"] }>;
  projectStages: Map<string, ProjectStage>;
  projectFiles: Map<string, ProjectFile>;
  discoverySessions: Map<string, DiscoverySession>;
  clarificationQuestions: Map<string, ClarificationQuestion>;
  requirements: Map<string, Requirement>;
  assumptions: Map<string, Assumption>;
  constraints: Map<string, Constraint>;
  decisions: Map<string, Decision>;
  researchSources: Map<string, ResearchSource>;
  researchEvidence: Map<string, ResearchEvidence>;
  artifacts: Map<string, Artifact>;
  artifactRevisions: Map<string, ArtifactRevision>;
  artifactComments: Map<string, ArtifactComment>;
  features: Map<string, Feature>;
  uxPersonas: Map<string, UXPersona>;
  userJourneys: Map<string, UserJourney>;
  screenSpecs: Map<string, ScreenSpec>;
  architectureComponents: Map<string, ArchitectureComponent>;
  architectureRelationships: Map<string, ArchitectureRelationship>;
  architectureDecisions: Map<string, ArchitectureDecision>;
  dbEntities: Map<string, DbEntity>;
  dbRelationships: Map<string, DbRelationship>;
  apiEndpoints: Map<string, ApiEndpoint>;
  developmentTasks: Map<string, DevelopmentTask>;
  testCases: Map<string, TestCase>;
  traceabilityLinks: Map<string, TraceabilityLink>;
  validationRuns: Map<string, ValidationRun>;
  changeRequests: Map<string, ChangeRequest>;
  approvals: Map<string, Approval>;
  aiProviders: Map<string, AIProviderMetadata>;
  aiProviderSecrets: Map<string, StoredProviderSecret>;
  aiModels: Map<string, AIModel>;
  aiTaskPolicies: Map<string, AITaskPolicy>;
  aiJobs: Map<string, AIJob>;
  aiUsageRecords: Map<string, AIUsageRecord>;
  auditLogs: AuditLog[];
  exportFiles: Map<string, ExportFile>;
  exportBlobs: Map<string, StoredExportBlob>;
}

export const DEMO_IDS = {
  userOwner: "00000000-0000-4000-8000-000000000101",
  userContributor: "00000000-0000-4000-8000-000000000102",
  userReviewer: "00000000-0000-4000-8000-000000000103",
  userTenantB: "00000000-0000-4000-8000-000000000104",
  workspaceA: "00000000-0000-4000-8000-000000000201",
  workspaceB: "00000000-0000-4000-8000-000000000202",
  projectA: "00000000-0000-4000-8000-000000000301",
  projectB: "00000000-0000-4000-8000-000000000302",
  providerOpenAI: "00000000-0000-4000-8000-000000000401",
  providerGoogle: "00000000-0000-4000-8000-000000000402",
  providerAnthropic: "00000000-0000-4000-8000-000000000403",
  modelGpt41: "00000000-0000-4000-8000-000000000501",
  modelGpt41Mini: "00000000-0000-4000-8000-000000000502",
  modelGeminiPro: "00000000-0000-4000-8000-000000000503",
  modelGeminiFlash: "00000000-0000-4000-8000-000000000504",
  modelClaudeSonnet: "00000000-0000-4000-8000-000000000505",
  modelLegacyNoJson: "00000000-0000-4000-8000-000000000506",
} as const;

export function createSeededState(): BlueprintState {
  const now = "2026-11-19T14:00:00.000Z";

  const state: BlueprintState = {
    profiles: new Map(),
    workspaces: new Map(),
    workspaceMembers: new Map(),
    workspaceInvitations: new Map(),
    projects: new Map(),
    projectMembers: new Map(),
    projectStages: new Map(),
    projectFiles: new Map(),
    discoverySessions: new Map(),
    clarificationQuestions: new Map(),
    requirements: new Map(),
    assumptions: new Map(),
    constraints: new Map(),
    decisions: new Map(),
    researchSources: new Map(),
    researchEvidence: new Map(),
    artifacts: new Map(),
    artifactRevisions: new Map(),
    artifactComments: new Map(),
    features: new Map(),
    uxPersonas: new Map(),
    userJourneys: new Map(),
    screenSpecs: new Map(),
    architectureComponents: new Map(),
    architectureRelationships: new Map(),
    architectureDecisions: new Map(),
    dbEntities: new Map(),
    dbRelationships: new Map(),
    apiEndpoints: new Map(),
    developmentTasks: new Map(),
    testCases: new Map(),
    traceabilityLinks: new Map(),
    validationRuns: new Map(),
    changeRequests: new Map(),
    approvals: new Map(),
    aiProviders: new Map(),
    aiProviderSecrets: new Map(),
    aiModels: new Map(),
    aiTaskPolicies: new Map(),
    aiJobs: new Map(),
    aiUsageRecords: new Map(),
    auditLogs: [],
    exportFiles: new Map(),
    exportBlobs: new Map(),
  };

  // Profiles
  const profiles: UserProfile[] = [
    { id: DEMO_IDS.userOwner, email: "alex@meridian.dev", fullName: "Alex Mercer", jobTitle: "Principal Product Architect", preferences: { theme: "studio" }, createdAt: now, updatedAt: now },
    { id: DEMO_IDS.userContributor, email: "priya@meridian.dev", fullName: "Priya Nair", jobTitle: "Lead Systems Analyst", preferences: {}, createdAt: now, updatedAt: now },
    { id: DEMO_IDS.userReviewer, email: "marcus@meridian.dev", fullName: "Marcus Vance", jobTitle: "VP Engineering & Reviewer", preferences: {}, createdAt: now, updatedAt: now },
    { id: DEMO_IDS.userTenantB, email: "sofia@helios.io", fullName: "Sofia Reyes", jobTitle: "Head of Product", preferences: {}, createdAt: now, updatedAt: now },
  ];
  profiles.forEach((p) => state.profiles.set(p.id, p));

  // Workspaces (Tenant A + Tenant B)
  state.workspaces.set(DEMO_IDS.workspaceA, {
    id: DEMO_IDS.workspaceA,
    name: "Meridian Cloud Systems",
    slug: "meridian-cloud",
    description: "Enterprise product architecture and specification studio",
    settings: { requireApprovalBeforeExport: false, defaultCurrency: "USD" },
    createdBy: DEMO_IDS.userOwner,
    createdAt: now,
    updatedAt: now,
  });
  state.workspaces.set(DEMO_IDS.workspaceB, {
    id: DEMO_IDS.workspaceB,
    name: "Helios Logistics",
    slug: "helios-logistics",
    description: "Isolated tenant B workspace",
    settings: {},
    createdBy: DEMO_IDS.userTenantB,
    createdAt: now,
    updatedAt: now,
  });

  // Memberships
  const memberships: WorkspaceMember[] = [
    { id: "wm-1", workspaceId: DEMO_IDS.workspaceA, userId: DEMO_IDS.userOwner, role: "owner", email: "alex@meridian.dev", fullName: "Alex Mercer", createdAt: now },
    { id: "wm-2", workspaceId: DEMO_IDS.workspaceA, userId: DEMO_IDS.userContributor, role: "contributor", email: "priya@meridian.dev", fullName: "Priya Nair", createdAt: now },
    { id: "wm-3", workspaceId: DEMO_IDS.workspaceA, userId: DEMO_IDS.userReviewer, role: "reviewer", email: "marcus@meridian.dev", fullName: "Marcus Vance", createdAt: now },
    { id: "wm-4", workspaceId: DEMO_IDS.workspaceB, userId: DEMO_IDS.userTenantB, role: "owner", email: "sofia@helios.io", fullName: "Sofia Reyes", createdAt: now },
  ];
  memberships.forEach((m) => state.workspaceMembers.set(m.id, m));

  // Projects
  state.projects.set(DEMO_IDS.projectA, {
    id: DEMO_IDS.projectA,
    workspaceId: DEMO_IDS.workspaceA,
    name: "Treasury Ledger Core v2",
    slug: "treasury-ledger-v2",
    description:
      "Multi-currency double-entry treasury ledger with automated reconciliation, tenant-isolated audit trails, real-time webhook settlement, and role-based approval workflows.",
    status: "active",
    restrictedAccess: false,
    createdBy: DEMO_IDS.userOwner,
    createdAt: now,
    updatedAt: now,
  });
  state.projects.set(DEMO_IDS.projectB, {
    id: DEMO_IDS.projectB,
    workspaceId: DEMO_IDS.workspaceB,
    name: "Fleet Dispatch Telemetry",
    slug: "fleet-dispatch",
    description: "Private tenant B project — inaccessible from Meridian Cloud Systems.",
    status: "active",
    restrictedAccess: false,
    createdBy: DEMO_IDS.userTenantB,
    createdAt: now,
    updatedAt: now,
  });

  // Stages for Project A & B
  const stageDefaults: Record<string, { status: ProjectStage["status"]; pct: number }> = {
    idea: { status: "approved", pct: 100 },
    discovery: { status: "approved", pct: 100 },
    knowledge: { status: "ready_for_review", pct: 85 },
    brd_prd: { status: "ready_for_review", pct: 80 },
    scope: { status: "in_progress", pct: 70 },
    ux: { status: "in_progress", pct: 60 },
    architecture: { status: "in_progress", pct: 65 },
    database_api: { status: "in_progress", pct: 55 },
    dev_qa: { status: "in_progress", pct: 45 },
    validate_export: { status: "needs_input", pct: 30 },
  };
  for (const stage of LIFECYCLE_STAGES) {
    const def = stageDefaults[stage.key] ?? { status: "not_started", pct: 0 };
    state.projectStages.set(`stg-a-${stage.key}`, {
      id: `stg-a-${stage.key}`,
      projectId: DEMO_IDS.projectA,
      workspaceId: DEMO_IDS.workspaceA,
      stageKey: stage.key,
      status: def.status,
      progressPct: def.pct,
      updatedAt: now,
    });
    state.projectStages.set(`stg-b-${stage.key}`, {
      id: `stg-b-${stage.key}`,
      projectId: DEMO_IDS.projectB,
      workspaceId: DEMO_IDS.workspaceB,
      stageKey: stage.key,
      status: stage.key === "idea" ? "in_progress" : "not_started",
      progressPct: stage.key === "idea" ? 20 : 0,
      updatedAt: now,
    });
  }

  // Project Files (A and private B for FILE-01 testing)
  state.projectFiles.set("file-a-1", {
    id: "file-a-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    fileName: "treasury-charter-2026.pdf",
    mimeType: "application/pdf",
    sizeBytes: 428190,
    storageBucket: "project-files",
    storagePath: `${DEMO_IDS.workspaceA}/${DEMO_IDS.projectA}/treasury-charter-2026.pdf`,
    uploadStatus: "uploaded",
    extractedText: "Executive Charter: Zero-tolerance for double-entry imbalance; ISO 20022 settlement feeds; 99.95% uptime SLA.",
    uploadedBy: DEMO_IDS.userOwner,
    createdAt: now,
  });
  state.projectFiles.set("file-b-1", {
    id: "file-b-1",
    workspaceId: DEMO_IDS.workspaceB,
    projectId: DEMO_IDS.projectB,
    fileName: "helios-confidential-fleet.pdf",
    mimeType: "application/pdf",
    sizeBytes: 180224,
    storageBucket: "project-files",
    storagePath: `${DEMO_IDS.workspaceB}/${DEMO_IDS.projectB}/helios-confidential-fleet.pdf`,
    uploadStatus: "uploaded",
    uploadedBy: DEMO_IDS.userTenantB,
    createdAt: now,
  });

  // Discovery Session & Clarification Questions
  state.discoverySessions.set("disc-1", {
    id: "disc-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    title: "Initial Charter & Compliance Discovery",
    briefSnapshot:
      "Build a multi-currency double-entry treasury ledger supporting USD, EUR, GBP with maker-checker approvals, immutable journal entries, and real-time webhook settlement reconciliation.",
    status: "active",
    summary: { gapCount: 3, proposedRequirementCount: 6 },
    createdBy: DEMO_IDS.userOwner,
    createdAt: now,
    updatedAt: now,
  });

  const questions: ClarificationQuestion[] = [
    {
      id: "q-1",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      sessionId: "disc-1",
      category: "compliance",
      questionText: "What threshold requires dual-control (maker-checker) approval for outbound treasury disbursements?",
      rationale: "Determines approval workflow routing rules and audit schema.",
      priority: "critical",
      status: "answered",
      source: "ai",
      answers: [
        {
          id: "ans-1",
          questionId: "q-1",
          answerText: "Any disbursement >= $25,000 USD equivalent requires secondary approval by a Manager or Reviewer role.",
          isDeferral: false,
          provenance: "stakeholder_interview",
          answeredBy: DEMO_IDS.userOwner,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "q-2",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      sessionId: "disc-1",
      category: "architecture",
      questionText: "Must FX rate locks persist on each ledger posting line or reference an end-of-day rate table?",
      rationale: "Impacts audit reproducibility and reconciliation drift.",
      priority: "high",
      status: "open",
      source: "ai",
      answers: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "q-3",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      sessionId: "disc-1",
      category: "operations",
      questionText: "Is real-time SWIFT MT940 ingestion in MVP scope or deferred to Phase 2?",
      rationale: "Scopes bank connector complexity for MVP release.",
      priority: "medium",
      status: "deferred",
      source: "ai",
      answers: [
        {
          id: "ans-3",
          questionId: "q-3",
          answerText: "Deferred to Phase 2; MVP will support ISO 20022 camt.053 batch import and Stripe Treasury webhooks.",
          isDeferral: true,
          deferralReason: "Pending bank onboarding SLA",
          provenance: "decision",
          answeredBy: DEMO_IDS.userOwner,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
  questions.forEach((q) => state.clarificationQuestions.set(q.id, q));

  // Requirements
  const requirements: Requirement[] = [
    {
      id: "req-1",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      requirementKey: "REQ-001",
      requirementType: "functional",
      title: "Balanced Double-Entry Journal Posting",
      description: "Every posted ledger transaction must have equal sum of debits and credits per currency, persisted atomically within a serializable or row-locked database transaction.",
      priority: "critical",
      status: "confirmed",
      acceptanceCriteria: [
        "Given unbalanced debit/credit lines, the API rejects posting with HTTP 422.",
        "Posted journal entries are immutable; corrections require reversing entries.",
      ],
      sourceType: "brief",
      currentVersion: 1,
      revisions: [{ id: "reqrev-1", requirementId: "req-1", versionNo: 1, snapshot: { title: "Balanced Double-Entry Journal Posting", status: "confirmed" }, changeSummary: "Initial confirmed requirement", changedBy: DEMO_IDS.userOwner, createdAt: now }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-2",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      requirementKey: "REQ-002",
      requirementType: "business",
      title: "Maker-Checker Approval Over $25,000",
      description: "Disbursements >= $25,000 USD equivalent cannot settle until a second distinct user with Reviewer or Manager permissions records an approval.",
      priority: "critical",
      status: "confirmed",
      acceptanceCriteria: [
        "Creator cannot self-approve their own disbursement.",
        "Approval event writes an immutable audit_logs entry.",
      ],
      sourceType: "interview",
      currentVersion: 1,
      revisions: [{ id: "reqrev-2", requirementId: "req-2", versionNo: 1, snapshot: { title: "Maker-Checker Approval Over $25,000", status: "confirmed" }, changeSummary: "Derived from Q-1", changedBy: DEMO_IDS.userOwner, createdAt: now }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-3",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      requirementKey: "REQ-003",
      requirementType: "non_functional",
      title: "Strict Multi-Tenant Workspace Isolation",
      description: "All tenant-owned financial tables must enforce PostgreSQL Row-Level Security so users in workspace A can never query or mutate workspace B records.",
      priority: "critical",
      status: "confirmed",
      acceptanceCriteria: [
        "Cross-tenant queries return 0 rows or HTTP 403/404.",
        "Automated RLS test suite verifies every table in CI.",
      ],
      sourceType: "brief",
      currentVersion: 1,
      revisions: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-4",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      requirementKey: "REQ-004",
      requirementType: "technical",
      title: "Idempotent Settlement Webhook Ingestion",
      description: "Inbound payment settlement webhooks must verify cryptographic HMAC signatures and deduplicate events using workspace-scoped idempotency keys.",
      priority: "high",
      status: "confirmed",
      acceptanceCriteria: [
        "Duplicate webhook delivery produces zero duplicate postings.",
        "Invalid signatures are rejected with HTTP 401.",
      ],
      sourceType: "decision",
      currentVersion: 1,
      revisions: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "req-5",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      requirementKey: "REQ-005",
      requirementType: "functional",
      title: "Automated Daily Reconciliation Report Export",
      description: "Treasury analysts can export reconciled balances and exception reports in PDF, CSV, and JSON via asynchronous worker jobs with private signed downloads.",
      priority: "medium",
      status: "proposed",
      acceptanceCriteria: ["Export completes asynchronously and issues a 15-minute signed URL."],
      sourceType: "brief",
      currentVersion: 1,
      revisions: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
  requirements.forEach((r) => state.requirements.set(r.id, r));

  // Assumptions, Constraints, Decisions, Research
  state.assumptions.set("asm-1", {
    id: "asm-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    assumptionKey: "ASM-001",
    statement: "All settlement amounts can be represented accurately using PostgreSQL NUMERIC(19,4) without sub-basis-point rounding loss.",
    confidence: "high",
    status: "validated",
    impactIfFalse: "Would require switching to 8-decimal precision for crypto/FX micro-settlements.",
    createdAt: now,
  });
  state.constraints.set("con-1", {
    id: "con-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    constraintKey: "CON-001",
    category: "regulatory",
    title: "7-Year Immutable Audit Retention",
    description: "Journal entries, approvals, and audit logs must be append-only with zero destructive updates or deletes.",
    severity: "critical",
    createdAt: now,
  });
  state.decisions.set("dec-1", {
    id: "dec-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    decisionKey: "DEC-001",
    title: "Use PostgreSQL pgmq Persistent Worker for Reconciliation & Exports",
    context: "Reconciliation runs and PDF/DOCX exports can exceed web request timeouts.",
    decisionStatement: "Enqueue all long-running jobs to Supabase Queues (pgmq) processed by a dedicated worker service.",
    rationale: "Guarantees transactional job durability, retry backoff, and clean separation from Next.js request latency.",
    alternatives: ["Next.js serverless waitUntil", "External Redis BullMQ cluster"],
    status: "accepted",
    decidedBy: DEMO_IDS.userOwner,
    decidedAt: now,
    createdAt: now,
  });

  state.researchSources.set("src-1", {
    id: "src-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    title: "ISO 20022 Cash Management (camt.053) Implementation Guidelines",
    sourceKind: "web",
    url: "https://www.iso20022.org/iso-20022-message-definitions",
    authorOrPublisher: "ISO 20022 Registration Authority",
    createdAt: now,
  });
  state.researchEvidence.set("ev-1", {
    id: "ev-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    sourceId: "src-1",
    excerpt: "Bank-to-Customer Statement (camt.053) provides end-of-day booked entries with unique EndToEndId reconciliation references.",
    claimSummary: "EndToEndId can serve as the deterministic external idempotency reference for daily bank reconciliation.",
    confidence: "high",
    linkedEntityType: "requirement",
    linkedEntityId: "req-4",
    createdAt: now,
  });

  // Artifacts & Immutable Revisions for ALL 9 artifact types
  for (const type of ARTIFACT_TYPES) {
    const meta = ARTIFACT_META[type];
    const artId = `art-a-${type}`;
    const revId = `rev-a-${type}-1`;
    const sections = meta.defaultSections.map((s, idx) => ({
      sectionKey: s.key,
      heading: s.heading,
      orderIndex: idx,
      bodyMarkdown:
        type === "brd" && s.key === "executive_summary"
          ? "Treasury Ledger Core v2 delivers an auditable, multi-tenant double-entry financial ledger engineered for zero reconciliation drift, dual-control disbursement approvals (>= $25,000), and real-time webhook settlement."
          : type === "prd" && s.key === "functional_requirements"
          ? "- **REQ-001**: Balanced double-entry journal posting with atomic rollback on imbalance.\n- **REQ-002**: Dual-control maker-checker approvals above $25,000 USD.\n- **REQ-004**: Cryptographically signed, idempotent settlement webhook ingestion."
          : `Structured specification for **${s.heading}** anchored to confirmed project requirements (REQ-001 through REQ-004). Ready for collaborative review or targeted AI section regeneration.`,
    }));

    const rev: ArtifactRevision = {
      id: revId,
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      artifactId: artId,
      versionNo: 1,
      status: type === "brd" ? "approved" : type === "prd" ? "in_review" : "draft",
      source: "manual",
      changeSummary: "Initial structured baseline revision",
      content: {
        summary: `${meta.title} baseline for Treasury Ledger Core v2`,
        sections,
        linkedRequirementIds: ["req-1", "req-2", "req-3", "req-4"],
      },
      createdBy: DEMO_IDS.userOwner,
      createdAt: now,
    };

    state.artifactRevisions.set(revId, rev);
    state.artifacts.set(artId, {
      id: artId,
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      artifactType: type,
      title: meta.title,
      currentRevisionId: revId,
      needsReview: false,
      revisionCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Approval attached to exact BRD v1 revision
  state.approvals.set("app-1", {
    id: "app-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    artifactId: "art-a-brd",
    targetRevisionId: "rev-a-brd-1",
    decision: "approved",
    comment: "Approved BRD v1 baseline — aligns with treasury governance charter.",
    reviewerId: DEMO_IDS.userReviewer,
    reviewerName: "Marcus Vance",
    createdAt: now,
  });

  // Features (MVP Scope)
  const features: Feature[] = [
    { id: "feat-1", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, featureKey: "FEAT-001", name: "Atomic Double-Entry Ledger Engine", description: "Balances debits/credits per currency with immutable journal lines.", scopeBucket: "mvp", priority: "critical", effortEstimate: "L", rationale: "Core financial correctness primitive.", acceptanceSummary: "Zero unbalanced postings accepted.", createdAt: now },
    { id: "feat-2", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, featureKey: "FEAT-002", name: "Maker-Checker Approval Queue", description: "Role-gated dual approval for disbursements >= $25k.", scopeBucket: "mvp", priority: "critical", effortEstimate: "M", rationale: "Mandatory SOC2 & treasury control.", acceptanceSummary: "Self-approval strictly blocked.", createdAt: now },
    { id: "feat-3", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, featureKey: "FEAT-003", name: "Idempotent Webhook Settlement Processor", description: "HMAC verification + workspace idempotency keys via pgmq worker.", scopeBucket: "mvp", priority: "high", effortEstimate: "M", rationale: "Eliminates duplicate postings on webhook retries.", acceptanceSummary: "Replay tests pass with 1 posting.", createdAt: now },
    { id: "feat-4", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, featureKey: "FEAT-004", name: "Real-Time SWIFT MT940 Streaming", description: "Direct bank mainframe streaming feed.", scopeBucket: "deferred", priority: "medium", effortEstimate: "XL", rationale: "Deferred until Phase 2 bank onboarding completes.", acceptanceSummary: "N/A for MVP.", createdAt: now },
  ];
  features.forEach((f) => state.features.set(f.id, f));

  // UX Personas, Journeys, Screens
  state.uxPersonas.set("per-1", {
    id: "per-1",
    projectId: DEMO_IDS.projectA,
    name: "Treasury Operations Analyst",
    roleLabel: "Contributor / Maker",
    goals: ["Post journal batches quickly", "Resolve settlement exceptions with zero spreadsheets"],
    painPoints: ["Opaque webhook failures", "Manual FX rate verification"],
    technicalProficiency: "high",
  });
  state.uxPersonas.set("per-2", {
    id: "per-2",
    projectId: DEMO_IDS.projectA,
    name: "Controller / Finance Reviewer",
    roleLabel: "Reviewer / Checker",
    goals: ["Verify disbursement approvals with complete audit evidence"],
    painPoints: ["Approval requests lacking linked policy citations"],
    technicalProficiency: "intermediate",
  });
  state.userJourneys.set("jrn-1", {
    id: "jrn-1",
    projectId: DEMO_IDS.projectA,
    personaId: "per-1",
    name: "High-Value Disbursement Approval Flow",
    goal: "Draft, review, and settle a $50,000 vendor payout with audit trail.",
    steps: [
      { stepNo: 1, action: "Analyst drafts disbursement entry", systemResponse: "Validates balance and flags dual-control requirement", touchpoint: "/disbursements/new" },
      { stepNo: 2, action: "Reviewer inspects journal & supporting invoice", systemResponse: "Displays immutable diff and policy threshold check", touchpoint: "/approvals" },
      { stepNo: 3, action: "Reviewer approves exact revision", systemResponse: "Enqueues settlement job and writes audit_logs row", touchpoint: "/approvals" },
    ],
    successCriteria: "Settlement completes within 30s with full maker/checker attribution.",
  });
  const screens: ScreenSpec[] = [
    { id: "scr-1", projectId: DEMO_IDS.projectA, screenKey: "SCR-001", name: "Ledger Journal Workspace", routePath: "/ledger/journals", purpose: "Create and inspect balanced double-entry journals", components: ["DataTable", "StatusBadge", "JournalDrawer"], interactions: ["Filter by currency", "Inspect immutable lines"], states: { loading: true, empty: true, error: true } },
    { id: "scr-2", projectId: DEMO_IDS.projectA, screenKey: "SCR-002", name: "Approval Review Queue", routePath: "/approvals", purpose: "Dual-control approval decisions against exact revisions", components: ["ApprovalPanel", "VersionDiff"], interactions: ["Approve with comment", "Request changes"], states: { loading: true, empty: true, error: true } },
  ];
  screens.forEach((s) => state.screenSpecs.set(s.id, s));

  // Architecture Components, Relationships & ADRs
  const archComponents: ArchitectureComponent[] = [
    { id: "arch-1", projectId: DEMO_IDS.projectA, componentKey: "COMP-WEB", name: "Next.js Web Studio", layer: "client", technology: "Next.js 16 + TypeScript", responsibility: "Authenticated UI, Server Actions, Route Handlers", positionX: 60, positionY: 80 },
    { id: "arch-2", projectId: DEMO_IDS.projectA, componentKey: "COMP-API", name: "Domain & RBAC Service Layer", layer: "application", technology: "TypeScript + Zod", responsibility: "Boundary validation, tenant guards, ledger posting rules", positionX: 340, positionY: 80 },
    { id: "arch-3", projectId: DEMO_IDS.projectA, componentKey: "COMP-WRK", name: "Persistent Queue Worker", layer: "worker", technology: "Node.js + pgmq", responsibility: "Async reconciliation, AI orchestration, PDF/DOCX rendering", positionX: 340, positionY: 250 },
    { id: "arch-4", projectId: DEMO_IDS.projectA, componentKey: "COMP-DB", name: "Supabase PostgreSQL + RLS", layer: "data", technology: "PostgreSQL 16 + pgmq + Storage", responsibility: "Double-entry ledger persistence, RLS isolation, private exports", positionX: 640, positionY: 165 },
  ];
  archComponents.forEach((c) => state.architectureComponents.set(c.id, c));

  const archRels: ArchitectureRelationship[] = [
    { id: "arel-1", projectId: DEMO_IDS.projectA, sourceComponentId: "arch-1", targetComponentId: "arch-2", protocol: "Server Action / REST", label: "Authenticated requests", isAsync: false },
    { id: "arel-2", projectId: DEMO_IDS.projectA, sourceComponentId: "arch-2", targetComponentId: "arch-4", protocol: "SQL / RLS", label: "Transactional mutations + pgmq enqueue", isAsync: false },
    { id: "arel-3", projectId: DEMO_IDS.projectA, sourceComponentId: "arch-3", targetComponentId: "arch-4", protocol: "pgmq RPC / Storage", label: "Poll jobs & persist results", isAsync: true },
  ];
  archRels.forEach((r) => state.architectureRelationships.set(r.id, r));

  state.architectureDecisions.set("adr-1", {
    id: "adr-1",
    projectId: DEMO_IDS.projectA,
    adrKey: "ADR-001",
    title: "Enforce Tenant Isolation via PostgreSQL RLS + Server Guards",
    status: "accepted",
    context: "Application-layer checks alone risk accidental cross-tenant data leaks on new queries.",
    decision: "Enable RLS on 100% of tenant tables and pair with server-side RBAC checks on every mutation.",
    consequences: "Requires maintaining security-definer helper functions and automated RLS tests in CI.",
    createdAt: now,
  });

  // DB Entities & Relationships
  const dbEntities: DbEntity[] = [
    {
      id: "dbe-1",
      projectId: DEMO_IDS.projectA,
      tableName: "ledger_accounts",
      schemaName: "public",
      description: "Chart of accounts scoped per workspace and currency",
      rlsEnabled: true,
      positionX: 40,
      positionY: 40,
      attributes: [
        { id: "dba-1", entityId: "dbe-1", columnName: "id", dataType: "uuid", isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: "gen_random_uuid()", description: "Primary key", ordinalPosition: 1 },
        { id: "dba-2", entityId: "dbe-1", columnName: "workspace_id", dataType: "uuid", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Tenant scope", ordinalPosition: 2 },
        { id: "dba-3", entityId: "dbe-1", columnName: "currency_code", dataType: "char(3)", isPrimaryKey: false, isNullable: false, isUnique: false, description: "ISO 4217 currency", ordinalPosition: 3 },
        { id: "dba-4", entityId: "dbe-1", columnName: "account_type", dataType: "text", isPrimaryKey: false, isNullable: false, isUnique: false, description: "asset/liability/equity/revenue/expense", ordinalPosition: 4 },
      ],
    },
    {
      id: "dbe-2",
      projectId: DEMO_IDS.projectA,
      tableName: "journal_entries",
      schemaName: "public",
      description: "Immutable balanced double-entry headers",
      rlsEnabled: true,
      positionX: 380,
      positionY: 40,
      attributes: [
        { id: "dba-5", entityId: "dbe-2", columnName: "id", dataType: "uuid", isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: "gen_random_uuid()", description: "Primary key", ordinalPosition: 1 },
        { id: "dba-6", entityId: "dbe-2", columnName: "workspace_id", dataType: "uuid", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Tenant scope", ordinalPosition: 2 },
        { id: "dba-7", entityId: "dbe-2", columnName: "idempotency_key", dataType: "text", isPrimaryKey: false, isNullable: false, isUnique: true, description: "Deduplication key", ordinalPosition: 3 },
        { id: "dba-8", entityId: "dbe-2", columnName: "posted_at", dataType: "timestamptz", isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "now()", description: "UTC posting timestamp", ordinalPosition: 4 },
      ],
    },
    {
      id: "dbe-3",
      projectId: DEMO_IDS.projectA,
      tableName: "journal_lines",
      schemaName: "public",
      description: "Exact numeric debit/credit posting lines",
      rlsEnabled: true,
      positionX: 210,
      positionY: 260,
      attributes: [
        { id: "dba-9", entityId: "dbe-3", columnName: "id", dataType: "uuid", isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: "gen_random_uuid()", description: "Primary key", ordinalPosition: 1 },
        { id: "dba-10", entityId: "dbe-3", columnName: "journal_entry_id", dataType: "uuid", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Parent entry FK", ordinalPosition: 2 },
        { id: "dba-11", entityId: "dbe-3", columnName: "account_id", dataType: "uuid", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Target account FK", ordinalPosition: 3 },
        { id: "dba-12", entityId: "dbe-3", columnName: "amount", dataType: "numeric(19,4)", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Exact monetary amount", ordinalPosition: 4 },
      ],
    },
  ];
  dbEntities.forEach((e) => state.dbEntities.set(e.id, e));

  state.dbRelationships.set("dbrel-1", {
    id: "dbrel-1",
    projectId: DEMO_IDS.projectA,
    sourceEntityId: "dbe-3",
    targetEntityId: "dbe-2",
    sourceColumn: "journal_entry_id",
    targetColumn: "id",
    cardinality: "many_to_one",
    onDelete: "RESTRICT",
  });
  state.dbRelationships.set("dbrel-2", {
    id: "dbrel-2",
    projectId: DEMO_IDS.projectA,
    sourceEntityId: "dbe-3",
    targetEntityId: "dbe-1",
    sourceColumn: "account_id",
    targetColumn: "id",
    cardinality: "many_to_one",
    onDelete: "RESTRICT",
  });

  // API Endpoints
  const endpoints: ApiEndpoint[] = [
    { id: "ep-1", projectId: DEMO_IDS.projectA, endpointKey: "API-001", method: "POST", path: "/v1/journals", summary: "Post balanced journal entry", description: "Atomically validates debit/credit equality and appends immutable journal lines.", authPolicy: "workspace:contributor+", requestSchema: { type: "object", required: ["idempotencyKey", "lines"], properties: { idempotencyKey: { type: "string" }, lines: { type: "array" } } }, responseSchema: { type: "object", properties: { id: { type: "string", format: "uuid" }, status: { type: "string" } } }, statusCodes: [201, 401, 403, 409, 422], tags: ["Ledger"] },
    { id: "ep-2", projectId: DEMO_IDS.projectA, endpointKey: "API-002", method: "POST", path: "/v1/disbursements/{id}/approve", summary: "Record checker approval", description: "Enforces distinct reviewer identity and logs audit event.", authPolicy: "workspace:reviewer+", requestSchema: { type: "object", required: ["decision"], properties: { decision: { type: "string", enum: ["approved", "rejected"] }, comment: { type: "string" } } }, responseSchema: { type: "object", properties: { approved: { type: "boolean" } } }, statusCodes: [200, 401, 403, 404, 409], tags: ["Approvals"] },
    { id: "ep-3", projectId: DEMO_IDS.projectA, endpointKey: "API-003", method: "POST", path: "/v1/webhooks/settlement", summary: "Ingest settlement webhook", description: "Verifies HMAC signature and deduplicates via idempotency key.", authPolicy: "hmac-signature", requestSchema: { type: "object", required: ["eventId", "amount"], properties: { eventId: { type: "string" }, amount: { type: "string" } } }, responseSchema: { type: "object", properties: { accepted: { type: "boolean" } } }, statusCodes: [202, 401, 422], tags: ["Webhooks"] },
  ];
  endpoints.forEach((ep) => state.apiEndpoints.set(ep.id, ep));

  // Development Tasks & QA Test Cases
  const tasks: DevelopmentTask[] = [
    { id: "tsk-1", projectId: DEMO_IDS.projectA, taskKey: "DEV-001", phase: "P01", title: "Implement double-entry posting stored procedure & RLS", description: "Ensure balanced debits/credits with row-level lock safety.", ownerRole: "Backend", priority: "critical", estimateHours: 16, status: "in_progress", acceptanceCriteria: ["Unbalanced entry throws SQL check error", "RLS blocks cross-tenant access"], dependencyTaskIds: [] },
    { id: "tsk-2", projectId: DEMO_IDS.projectA, taskKey: "DEV-002", phase: "P02", title: "Build maker-checker disbursement approval API & UI", description: "Enforce distinct reviewer role and append audit record.", ownerRole: "Full Stack", priority: "critical", estimateHours: 12, status: "not_started", acceptanceCriteria: ["Maker cannot approve own transaction"], dependencyTaskIds: ["tsk-1"] },
    { id: "tsk-3", projectId: DEMO_IDS.projectA, taskKey: "DEV-003", phase: "P02", title: "Implement HMAC webhook ingestion worker", description: "Process pgmq settlement messages idempotently.", ownerRole: "Backend", priority: "high", estimateHours: 10, status: "not_started", acceptanceCriteria: ["Duplicate events produce single posting"], dependencyTaskIds: ["tsk-1"] },
  ];
  tasks.forEach((t) => state.developmentTasks.set(t.id, t));

  const tests: TestCase[] = [
    { id: "tc-1", projectId: DEMO_IDS.projectA, testKey: "TC-001", area: "Ledger Integrity", title: "Reject unbalanced double-entry journal posting", preconditions: "Two active USD ledger accounts exist", steps: ["Submit debit 100.00 and credit 95.00", "Inspect HTTP status and DB state"], expectedResult: "HTTP 422 returned and zero rows committed", testType: "integration", priority: "critical", status: "passing" },
    { id: "tc-2", projectId: DEMO_IDS.projectA, testKey: "TC-002", area: "Approvals", title: "Prevent self-approval on disbursements >= $25,000", preconditions: "Maker created $30,000 disbursement", steps: ["Attempt approval using maker credentials", "Approve using reviewer credentials"], expectedResult: "Maker receives HTTP 403; reviewer succeeds with audit log", testType: "security", priority: "critical", status: "ready" },
    { id: "tc-3", projectId: DEMO_IDS.projectA, testKey: "TC-003", area: "Tenant Isolation", title: "Verify RLS blocks cross-workspace ledger reads", preconditions: "Workspaces A and B each have journal entries", steps: ["Authenticate as Workspace A user", "Query Workspace B journal ID"], expectedResult: "Zero rows returned / HTTP 404", testType: "security", priority: "critical", status: "passing" },
  ];
  tests.forEach((tc) => state.testCases.set(tc.id, tc));

  // Traceability Links (real entity links)
  const links: TraceabilityLink[] = [
    { id: "tr-1", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-1", targetType: "feature", targetId: "feat-1", relationType: "implements", createdAt: now },
    { id: "tr-2", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "feature", sourceId: "feat-1", targetType: "development_task", targetId: "tsk-1", relationType: "implements", createdAt: now },
    { id: "tr-3", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-1", targetType: "test_case", targetId: "tc-1", relationType: "verifies", createdAt: now },
    { id: "tr-4", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-1", targetType: "api_endpoint", targetId: "ep-1", relationType: "implements", createdAt: now },
    { id: "tr-5", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-2", targetType: "feature", targetId: "feat-2", relationType: "implements", createdAt: now },
    { id: "tr-6", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-2", targetType: "development_task", targetId: "tsk-2", relationType: "implements", createdAt: now },
    { id: "tr-7", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-2", targetType: "test_case", targetId: "tc-2", relationType: "verifies", createdAt: now },
    { id: "tr-8", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-2", targetType: "screen", targetId: "scr-2", relationType: "implements", createdAt: now },
    { id: "tr-9", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-3", targetType: "test_case", targetId: "tc-3", relationType: "verifies", createdAt: now },
    { id: "tr-10", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-4", targetType: "feature", targetId: "feat-3", relationType: "implements", createdAt: now },
    { id: "tr-11", workspaceId: DEMO_IDS.workspaceA, projectId: DEMO_IDS.projectA, sourceType: "requirement", sourceId: "req-4", targetType: "development_task", targetId: "tsk-3", relationType: "implements", createdAt: now },
  ];
  links.forEach((l) => state.traceabilityLinks.set(l.id, l));

  // AI Providers (with AES-256-GCM encrypted secrets stored ONLY in aiProviderSecrets)
  const providers: Array<{ meta: AIProviderMetadata; rawKey: string }> = [
    {
      meta: {
        id: DEMO_IDS.providerOpenAI,
        workspaceId: DEMO_IDS.workspaceA,
        providerType: "openai",
        displayName: "OpenAI Production",
        baseUrl: "https://api.openai.com/v1",
        enabled: true,
        keyHint: maskApiKey("sk-demo-openai-key-9821"),
        keyVersion: "v1",
        lastTestedAt: now,
        lastTestStatus: "ok",
        createdAt: now,
        updatedAt: now,
      },
      rawKey: "sk-demo-openai-key-9821",
    },
    {
      meta: {
        id: DEMO_IDS.providerGoogle,
        workspaceId: DEMO_IDS.workspaceA,
        providerType: "google",
        displayName: "Google Gemini Studio",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        enabled: true,
        keyHint: maskApiKey("AIzaSyDemoGeminiKey4412"),
        keyVersion: "v1",
        lastTestedAt: now,
        lastTestStatus: "ok",
        createdAt: now,
        updatedAt: now,
      },
      rawKey: "AIzaSyDemoGeminiKey4412",
    },
    {
      meta: {
        id: DEMO_IDS.providerAnthropic,
        workspaceId: DEMO_IDS.workspaceA,
        providerType: "anthropic",
        displayName: "Anthropic Claude",
        baseUrl: "https://api.anthropic.com/v1",
        enabled: true,
        keyHint: maskApiKey("sk-ant-demo-claude-7721"),
        keyVersion: "v1",
        lastTestedAt: now,
        lastTestStatus: "ok",
        createdAt: now,
        updatedAt: now,
      },
      rawKey: "sk-ant-demo-claude-7721",
    },
  ];
  for (const p of providers) {
    state.aiProviders.set(p.meta.id, p.meta);
    const enc = encryptSecret(p.rawKey);
    state.aiProviderSecrets.set(p.meta.id, {
      providerId: p.meta.id,
      workspaceId: p.meta.workspaceId,
      ciphertext: enc.ciphertext,
      keyVersion: enc.keyVersion,
      rotatedAt: now,
    });
  }

  // AI Models
  const models: AIModel[] = [
    { id: DEMO_IDS.modelGpt41, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerOpenAI, providerType: "openai", providerDisplayName: "OpenAI Production", modelId: "gpt-4.1", displayName: "OpenAI GPT-4.1", enabled: true, capabilities: { structuredOutput: true, tools: true, vision: true, reasoning: true, longContext: true, contextWindow: 1_000_000, maxOutputTokens: 32_768 }, inputCostPer1mUsd: 2.0, outputCostPer1mUsd: 8.0 },
    { id: DEMO_IDS.modelGpt41Mini, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerOpenAI, providerType: "openai", providerDisplayName: "OpenAI Production", modelId: "gpt-4.1-mini", displayName: "OpenAI GPT-4.1 Mini", enabled: true, capabilities: { structuredOutput: true, tools: true, vision: true, reasoning: false, longContext: true, contextWindow: 1_000_000, maxOutputTokens: 16_384 }, inputCostPer1mUsd: 0.4, outputCostPer1mUsd: 1.6 },
    { id: DEMO_IDS.modelGeminiPro, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerGoogle, providerType: "google", providerDisplayName: "Google Gemini Studio", modelId: "gemini-2.5-pro", displayName: "Google Gemini 2.5 Pro", enabled: true, capabilities: { structuredOutput: true, tools: true, vision: true, reasoning: true, longContext: true, contextWindow: 1_048_576, maxOutputTokens: 65_536 }, inputCostPer1mUsd: 1.25, outputCostPer1mUsd: 10.0 },
    { id: DEMO_IDS.modelGeminiFlash, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerGoogle, providerType: "google", providerDisplayName: "Google Gemini Studio", modelId: "gemini-2.5-flash", displayName: "Google Gemini 2.5 Flash", enabled: true, capabilities: { structuredOutput: true, tools: true, vision: true, reasoning: true, longContext: true, contextWindow: 1_048_576, maxOutputTokens: 65_536 }, inputCostPer1mUsd: 0.15, outputCostPer1mUsd: 0.6 },
    { id: DEMO_IDS.modelClaudeSonnet, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerAnthropic, providerType: "anthropic", providerDisplayName: "Anthropic Claude", modelId: "claude-sonnet-4-20250514", displayName: "Anthropic Claude Sonnet 4", enabled: true, capabilities: { structuredOutput: true, tools: true, vision: true, reasoning: true, longContext: true, contextWindow: 200_000, maxOutputTokens: 16_384 }, inputCostPer1mUsd: 3.0, outputCostPer1mUsd: 15.0 },
    { id: DEMO_IDS.modelLegacyNoJson, workspaceId: DEMO_IDS.workspaceA, providerId: DEMO_IDS.providerOpenAI, providerType: "openai", providerDisplayName: "OpenAI Production", modelId: "text-legacy-base", displayName: "Legacy Text Base (No Structured Output)", enabled: true, capabilities: { structuredOutput: false, tools: false, vision: false, reasoning: false, longContext: false, contextWindow: 8_192, maxOutputTokens: 2_048 }, inputCostPer1mUsd: 0.1, outputCostPer1mUsd: 0.2 },
  ];
  models.forEach((m) => state.aiModels.set(m.id, m));

  // Default Task Policies
  const defaultPolicies: AITaskPolicy[] = [
    { id: "pol-1", workspaceId: DEMO_IDS.workspaceA, taskType: "brd_generation", defaultModelId: DEMO_IDS.modelGeminiPro, fallbackModelId: DEMO_IDS.modelGpt41, allowedModelIds: [], allowUserOverride: true, maxTokens: 12_000, monthlyBudgetUsd: 250, updatedAt: now },
    { id: "pol-2", workspaceId: DEMO_IDS.workspaceA, taskType: "prd_generation", defaultModelId: DEMO_IDS.modelClaudeSonnet, fallbackModelId: DEMO_IDS.modelGeminiPro, allowedModelIds: [], allowUserOverride: true, maxTokens: 12_000, monthlyBudgetUsd: 250, updatedAt: now },
    { id: "pol-3", workspaceId: DEMO_IDS.workspaceA, taskType: "requirement_analysis", defaultModelId: DEMO_IDS.modelGeminiFlash, fallbackModelId: DEMO_IDS.modelGpt41Mini, allowedModelIds: [], allowUserOverride: true, maxTokens: 8_192, monthlyBudgetUsd: 100, updatedAt: now },
    { id: "pol-4", workspaceId: DEMO_IDS.workspaceA, taskType: "architecture_generation", defaultModelId: DEMO_IDS.modelGpt41, fallbackModelId: DEMO_IDS.modelClaudeSonnet, allowedModelIds: [], allowUserOverride: true, maxTokens: 12_000, monthlyBudgetUsd: 200, updatedAt: now },
  ];
  defaultPolicies.forEach((pol) => state.aiTaskPolicies.set(`${pol.workspaceId}:${pol.taskType}`, pol));

  // Usage Records & Audit Logs
  state.aiUsageRecords.set("use-1", {
    id: "use-1",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    providerId: DEMO_IDS.providerGoogle,
    taskType: "brd_generation",
    modelId: "gemini-2.5-pro",
    inputTokens: 14_200,
    outputTokens: 3_850,
    estimatedCostUsd: 0.05625,
    actualCostUsd: 0.05625,
    latencyMs: 3420,
    actorUserId: DEMO_IDS.userOwner,
    createdAt: now,
  });
  state.aiUsageRecords.set("use-2", {
    id: "use-2",
    workspaceId: DEMO_IDS.workspaceA,
    projectId: DEMO_IDS.projectA,
    providerId: DEMO_IDS.providerAnthropic,
    taskType: "prd_generation",
    modelId: "claude-sonnet-4-20250514",
    inputTokens: 18_600,
    outputTokens: 4_120,
    estimatedCostUsd: 0.1176,
    actualCostUsd: 0.1176,
    latencyMs: 4180,
    actorUserId: DEMO_IDS.userContributor,
    createdAt: now,
  });

  state.auditLogs.push(
    {
      id: "aud-1",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      actorUserId: DEMO_IDS.userOwner,
      actorName: "Alex Mercer",
      action: "project.created",
      entityType: "project",
      entityId: DEMO_IDS.projectA,
      metadata: { slug: "treasury-ledger-v2" },
      createdAt: now,
    },
    {
      id: "aud-2",
      workspaceId: DEMO_IDS.workspaceA,
      projectId: DEMO_IDS.projectA,
      actorUserId: DEMO_IDS.userReviewer,
      actorName: "Marcus Vance",
      action: "artifact_revision.approved",
      entityType: "artifact_revision",
      entityId: "rev-a-brd-1",
      metadata: { artifactType: "brd", versionNo: 1 },
      createdAt: now,
    }
  );

  return state;
}
