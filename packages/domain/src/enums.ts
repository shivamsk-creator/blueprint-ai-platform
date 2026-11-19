export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "manager",
  "contributor",
  "reviewer",
] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_STATUSES = ["draft", "active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STAGE_KEYS = [
  "idea",
  "discovery",
  "knowledge",
  "brd_prd",
  "scope",
  "ux",
  "architecture",
  "database_api",
  "dev_qa",
  "validate_export",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGE_STATUSES = [
  "not_started",
  "in_progress",
  "needs_input",
  "ready_for_review",
  "approved",
  "blocked",
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const REQUIREMENT_TYPES = [
  "functional",
  "non_functional",
  "business",
  "technical",
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const REQUIREMENT_STATUSES = [
  "proposed",
  "confirmed",
  "rejected",
  "deferred",
] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const REQUIREMENT_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

export const REQUIREMENT_SOURCE_TYPES = [
  "brief",
  "upload",
  "interview",
  "decision",
  "research",
  "manual",
] as const;
export type RequirementSourceType = (typeof REQUIREMENT_SOURCE_TYPES)[number];

export const ARTIFACT_TYPES = [
  "brd",
  "prd",
  "mvp_scope",
  "ux_spec",
  "architecture",
  "database",
  "api",
  "dev_plan",
  "qa_plan",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "superseded",
] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const AI_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AIJobStatus = (typeof AI_JOB_STATUSES)[number];

export const AI_PROVIDER_TYPES = [
  "openai",
  "google",
  "anthropic",
  "openai_compatible",
] as const;
export type AIProviderType = (typeof AI_PROVIDER_TYPES)[number];

export const AI_TASK_TYPES = [
  "requirement_analysis",
  "clarification_generation",
  "research_synthesis",
  "brd_generation",
  "prd_generation",
  "scope_recommendation",
  "ux_spec_generation",
  "architecture_generation",
  "database_generation",
  "api_generation",
  "development_breakdown",
  "qa_generation",
  "consistency_validation",
  "change_impact",
  "export_rendering",
] as const;
export type AITaskType = (typeof AI_TASK_TYPES)[number];

export const JOB_TYPES = [
  "ai.generate_artifact",
  "ai.regenerate_section",
  "discovery.analyze",
  "validation.run",
  "research.synthesize",
  "export.generate",
  "usage.reconcile",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const CHANGE_STATUSES = [
  "draft",
  "submitted",
  "impact_review",
  "approved",
  "rejected",
  "applied",
] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export const VALIDATION_SEVERITIES = [
  "blocker",
  "high",
  "medium",
  "low",
  "info",
] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const ENTITY_TYPES = [
  "requirement",
  "decision",
  "artifact",
  "feature",
  "screen",
  "architecture_component",
  "db_entity",
  "api_endpoint",
  "development_task",
  "test_case",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const EXPORT_FORMATS = [
  "pdf",
  "docx",
  "markdown",
  "json",
  "sql",
  "openapi",
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const LIFECYCLE_STAGES: ReadonlyArray<{
  key: StageKey;
  label: string;
  shortLabel: string;
  routeSegment: string;
  description: string;
}> = [
  { key: "idea", label: "Idea & Brief", shortLabel: "Idea", routeSegment: "", description: "Project charter, initial brief, and uploaded references" },
  { key: "discovery", label: "Discovery & Q&A", shortLabel: "Discovery", routeSegment: "/discovery", description: "Gap analysis and stakeholder clarification sessions" },
  { key: "knowledge", label: "Knowledge Repository", shortLabel: "Knowledge", routeSegment: "/knowledge", description: "Canonical requirements, assumptions, constraints, and decisions" },
  { key: "brd_prd", label: "BRD & PRD", shortLabel: "BRD / PRD", routeSegment: "/artifacts/brd", description: "Business and product requirements specifications" },
  { key: "scope", label: "MVP Scope", shortLabel: "MVP Scope", routeSegment: "/scope", description: "Feature catalog, prioritization, and inclusion rationale" },
  { key: "ux", label: "UX / UI Spec", shortLabel: "UX / UI", routeSegment: "/ux", description: "Personas, user journeys, and screen inventory" },
  { key: "architecture", label: "Architecture", shortLabel: "Architecture", routeSegment: "/architecture", description: "Structured component topology, data flows, and ADRs" },
  { key: "database_api", label: "Database & API", shortLabel: "DB & API", routeSegment: "/database", description: "Schema ERD, SQL migration draft, and OpenAPI contracts" },
  { key: "dev_qa", label: "Dev Plan & QA", shortLabel: "Dev & QA", routeSegment: "/development", description: "Work breakdown tasks, dependencies, and QA test cases" },
  { key: "validate_export", label: "Validation & Export", shortLabel: "Validate & Export", routeSegment: "/validation", description: "Traceability matrix, gap checks, approvals, and deliverables" },
];

export const ARTIFACT_META: Record<
  ArtifactType,
  { title: string; shortTitle: string; taskType: AITaskType; defaultSections: ReadonlyArray<{ key: string; heading: string }> }
> = {
  brd: {
    title: "Business Requirements Document (BRD)",
    shortTitle: "BRD",
    taskType: "brd_generation",
    defaultSections: [
      { key: "executive_summary", heading: "1. Executive Summary" },
      { key: "business_objectives", heading: "2. Business Objectives & KPIs" },
      { key: "stakeholders", heading: "3. Stakeholders & Roles" },
      { key: "business_requirements", heading: "4. Business Requirements" },
      { key: "constraints_assumptions", heading: "5. Constraints, Assumptions & Risks" },
    ],
  },
  prd: {
    title: "Product Requirements Document (PRD)",
    shortTitle: "PRD",
    taskType: "prd_generation",
    defaultSections: [
      { key: "product_vision", heading: "1. Product Vision & Problem Statement" },
      { key: "target_users", heading: "2. Target Personas & Use Cases" },
      { key: "functional_requirements", heading: "3. Functional Requirements" },
      { key: "non_functional_requirements", heading: "4. Non-Functional Requirements" },
      { key: "acceptance_criteria", heading: "5. Acceptance Criteria & Traceability" },
    ],
  },
  mvp_scope: {
    title: "MVP Scope Specification",
    shortTitle: "MVP Scope",
    taskType: "scope_recommendation",
    defaultSections: [
      { key: "in_scope", heading: "1. MVP In-Scope Capabilities" },
      { key: "deferred_scope", heading: "2. Phase 2 / Deferred Features" },
      { key: "out_of_scope", heading: "3. Explicit Exclusions & Rationale" },
    ],
  },
  ux_spec: {
    title: "UX/UI Specification",
    shortTitle: "UX Spec",
    taskType: "ux_spec_generation",
    defaultSections: [
      { key: "personas", heading: "1. User Personas" },
      { key: "user_journeys", heading: "2. Primary User Journeys" },
      { key: "screen_inventory", heading: "3. Screen Inventory & States" },
    ],
  },
  architecture: {
    title: "System Architecture Blueprint",
    shortTitle: "Architecture",
    taskType: "architecture_generation",
    defaultSections: [
      { key: "system_context", heading: "1. System Context & Topology" },
      { key: "components", heading: "2. Core Components & Boundaries" },
      { key: "security_tenancy", heading: "3. Security, Tenancy & Resilience" },
      { key: "adrs", heading: "4. Architecture Decision Records" },
    ],
  },
  database: {
    title: "Database Schema Specification",
    shortTitle: "Database",
    taskType: "database_generation",
    defaultSections: [
      { key: "data_model", heading: "1. Relational Entity Overview" },
      { key: "rls_tenancy", heading: "2. Row-Level Security & Isolation" },
      { key: "migration_draft", heading: "3. SQL Migration Draft" },
    ],
  },
  api: {
    title: "API Contract Specification",
    shortTitle: "API Spec",
    taskType: "api_generation",
    defaultSections: [
      { key: "conventions", heading: "1. Auth, Errors & Pagination Conventions" },
      { key: "endpoint_catalog", heading: "2. Endpoint Catalog" },
      { key: "openapi_spec", heading: "3. OpenAPI 3.1 Contract" },
    ],
  },
  dev_plan: {
    title: "Development Execution Plan",
    shortTitle: "Dev Plan",
    taskType: "development_breakdown",
    defaultSections: [
      { key: "milestones", heading: "1. Milestones & Critical Path" },
      { key: "task_breakdown", heading: "2. Work Breakdown Structure" },
      { key: "dependencies_risks", heading: "3. Dependencies & Delivery Risks" },
    ],
  },
  qa_plan: {
    title: "QA & Test Strategy Plan",
    shortTitle: "QA Plan",
    taskType: "qa_generation",
    defaultSections: [
      { key: "test_strategy", heading: "1. Verification Strategy & Quality Gates" },
      { key: "test_cases", heading: "2. Acceptance & Security Test Cases" },
      { key: "coverage_matrix", heading: "3. Requirement Coverage Summary" },
    ],
  },
};
