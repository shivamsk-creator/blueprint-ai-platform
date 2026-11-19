import crypto from "node:crypto";
import {
  analyzeChangeImpact,
  ARTIFACT_META,
  ARTIFACT_TYPES,
  computeRevisionDiff,
  computeTraceabilityMatrix,
  ConflictError,
  ForbiddenError,
  generateOpenApiSpec,
  generateSqlMigrationDraft,
  hasPermission,
  LIFECYCLE_STAGES,
  NotFoundError,
  runDeterministicValidation,
  summarizeValidationIssues,
  ValidationError,
  type AIJob,
  type AIModel,
  type AIProviderMetadata,
  type AITaskPolicy,
  type AITaskType,
  type AIUsageRecord,
  type ApiEndpoint,
  type Approval,
  type ArchitectureComponent,
  type ArchitectureDecision,
  type ArchitectureRelationship,
  type Artifact,
  type ArtifactRevision,
  type ArtifactType,
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
  type EntityType,
  type ExportFile,
  type ExportFormat,
  type Feature,
  type JobType,
  type PermissionAction,
  type Project,
  type ProjectFile,
  type ProjectStage,
  type Requirement,
  type ResearchEvidence,
  type ResearchSource,
  type RevisionDiffResult,
  type ScreenSpec,
  type StageKey,
  type StageStatus,
  type TestCase,
  type TraceabilityLink,
  type TraceabilityMatrixReport,
  type UserJourney,
  type UXPersona,
  type ValidationRun,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@blueprint/domain";
import {
  getBuiltinModelsForProvider,
  resolveModelForTask,
  type ResolvedModelRoute,
} from "@blueprint/ai-providers";
import { JOB_SCHEMA_VERSION, type JobEnvelope } from "@blueprint/validation";
import { decryptSecret, encryptSecret, hashToken, maskApiKey } from "./crypto";
import { InMemoryQueueClient, type JobQueueClient } from "./queue";
import { createSeededState, type BlueprintState } from "./seed-data";

export interface ActorContext {
  userId: string;
  email: string;
  fullName: string;
  requestId?: string;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return base.length >= 3 ? base : `${base || "item"}-${crypto.randomBytes(2).toString("hex")}`;
}

export class BlueprintRepository {
  public readonly state: BlueprintState;
  public readonly queue: JobQueueClient;

  constructor(state?: BlueprintState, queue?: JobQueueClient) {
    this.state = state ?? createSeededState();
    this.queue = queue ?? new InMemoryQueueClient();
  }

  // ---------------------------------------------------------------------------
  // Internal Authorization & Tenant Isolation Helpers (RLS Parity)
  // ---------------------------------------------------------------------------

  getWorkspaceRole(actor: ActorContext, workspaceId: string): WorkspaceRole | null {
    for (const member of this.state.workspaceMembers.values()) {
      if (member.workspaceId === workspaceId && member.userId === actor.userId) {
        return member.role;
      }
    }
    return null;
  }

  requireWorkspacePermission(
    actor: ActorContext,
    workspaceId: string,
    action: PermissionAction
  ): WorkspaceRole {
    const role = this.getWorkspaceRole(actor, workspaceId);
    if (!role) {
      throw new ForbiddenError("You do not have access to this workspace.");
    }
    if (!hasPermission(role, action)) {
      throw new ForbiddenError(`Role "${role}" is not permitted to perform "${action}".`);
    }
    return role;
  }

  requireProjectAccess(
    actor: ActorContext,
    projectId: string,
    action: PermissionAction = "project:read"
  ): { project: Project; role: WorkspaceRole } {
    const project = this.state.projects.get(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    const workspaceRole = this.getWorkspaceRole(actor, project.workspaceId);
    if (!workspaceRole) {
      // Cross-tenant access strictly denied
      throw new ForbiddenError("Access to this project is denied.");
    }
    let effectiveRole: WorkspaceRole = workspaceRole;
    if (project.restrictedAccess && workspaceRole !== "owner" && workspaceRole !== "admin") {
      const pm = Array.from(this.state.projectMembers.values()).find(
        (m) => m.projectId === projectId && m.userId === actor.userId
      );
      if (!pm) {
        throw new ForbiddenError("This project has restricted membership access.");
      }
      effectiveRole = pm.role;
    }
    if (!hasPermission(effectiveRole, action)) {
      throw new ForbiddenError(`Role "${effectiveRole}" is not permitted to perform "${action}".`);
    }
    return { project, role: effectiveRole };
  }

  recordAudit(entry: {
    workspaceId: string;
    projectId?: string | null;
    actor?: ActorContext | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): AuditLog {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      workspaceId: entry.workspaceId,
      projectId: entry.projectId ?? null,
      actorUserId: entry.actor?.userId ?? null,
      actorName: entry.actor?.fullName ?? "System Worker",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? {},
      requestId: entry.actor?.requestId ?? null,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    return log;
  }

  // ---------------------------------------------------------------------------
  // Workspaces & Tenancy (P01)
  // ---------------------------------------------------------------------------

  listWorkspaces(actor: ActorContext): Array<Workspace & { role: WorkspaceRole }> {
    const results: Array<Workspace & { role: WorkspaceRole }> = [];
    for (const member of this.state.workspaceMembers.values()) {
      if (member.userId === actor.userId) {
        const ws = this.state.workspaces.get(member.workspaceId);
        if (ws) results.push({ ...ws, role: member.role });
      }
    }
    return results;
  }

  getWorkspace(actor: ActorContext, workspaceId: string): Workspace & { role: WorkspaceRole } {
    const role = this.requireWorkspacePermission(actor, workspaceId, "workspace:read");
    const ws = this.state.workspaces.get(workspaceId);
    if (!ws) throw new NotFoundError("Workspace", workspaceId);
    return { ...ws, role };
  }

  createWorkspace(
    actor: ActorContext,
    input: { name: string; slug?: string; description?: string }
  ): Workspace {
    const slug = input.slug ?? slugify(input.name);
    for (const ws of this.state.workspaces.values()) {
      if (ws.slug === slug) throw new ConflictError(`Workspace slug "${slug}" is already taken.`);
    }
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: crypto.randomUUID(),
      name: input.name,
      slug,
      description: input.description ?? "",
      settings: {},
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.workspaces.set(ws.id, ws);
    this.state.workspaceMembers.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      workspaceId: ws.id,
      userId: actor.userId,
      role: "owner",
      email: actor.email,
      fullName: actor.fullName,
      createdAt: now,
    });
    this.recordAudit({
      workspaceId: ws.id,
      actor,
      action: "workspace.created",
      entityType: "workspace",
      entityId: ws.id,
      metadata: { slug },
    });
    return ws;
  }

  updateWorkspace(
    actor: ActorContext,
    workspaceId: string,
    input: { name?: string; description?: string; settings?: Record<string, unknown> }
  ): Workspace {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:update");
    const ws = this.state.workspaces.get(workspaceId);
    if (!ws) throw new NotFoundError("Workspace", workspaceId);
    const updated: Workspace = {
      ...ws,
      name: input.name ?? ws.name,
      description: input.description ?? ws.description,
      settings: input.settings ? { ...ws.settings, ...input.settings } : ws.settings,
      updatedAt: new Date().toISOString(),
    };
    this.state.workspaces.set(workspaceId, updated);
    this.recordAudit({
      workspaceId,
      actor,
      action: "workspace.updated",
      entityType: "workspace",
      entityId: workspaceId,
    });
    return updated;
  }

  listWorkspaceMembers(actor: ActorContext, workspaceId: string): {
    members: WorkspaceMember[];
    invitations: WorkspaceInvitation[];
  } {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:manage_members");
    const members = Array.from(this.state.workspaceMembers.values()).filter(
      (m) => m.workspaceId === workspaceId
    );
    const invitations = Array.from(this.state.workspaceInvitations.values()).filter(
      (i) => i.workspaceId === workspaceId && !i.acceptedAt
    );
    return { members, invitations };
  }

  inviteWorkspaceMember(
    actor: ActorContext,
    workspaceId: string,
    input: { email: string; role: Exclude<WorkspaceRole, "owner"> }
  ): WorkspaceInvitation {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:invite");
    const rawToken = crypto.randomBytes(24).toString("hex");
    const now = new Date();
    const invitation: WorkspaceInvitation = {
      id: crypto.randomUUID(),
      workspaceId,
      email: input.email.toLowerCase(),
      role: input.role,
      invitedBy: actor.userId,
      acceptedAt: null,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
    };
    this.state.workspaceInvitations.set(hashToken(rawToken), invitation);
    this.recordAudit({
      workspaceId,
      actor,
      action: "workspace.member_invited",
      entityType: "workspace_invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });
    return invitation;
  }

  // ---------------------------------------------------------------------------
  // Projects, Stages & Private Files (P02 & P03-01)
  // ---------------------------------------------------------------------------

  listProjects(actor: ActorContext, workspaceId?: string): Project[] {
    const allowedWorkspaceIds = new Set(
      this.listWorkspaces(actor).map((w) => w.id)
    );
    if (workspaceId && !allowedWorkspaceIds.has(workspaceId)) {
      throw new ForbiddenError("You do not have access to the requested workspace.");
    }
    return Array.from(this.state.projects.values())
      .filter((p) => {
        if (!allowedWorkspaceIds.has(p.workspaceId)) return false;
        if (workspaceId && p.workspaceId !== workspaceId) return false;
        try {
          this.requireProjectAccess(actor, p.id, "project:read");
          return true;
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createProject(
    actor: ActorContext,
    input: { workspaceId?: string; name: string; slug?: string; description: string; restrictedAccess?: boolean }
  ): Project {
    const workspaces = this.listWorkspaces(actor);
    const workspaceId = input.workspaceId ?? workspaces[0]?.id;
    if (!workspaceId) {
      throw new ValidationError("Create or select a workspace before creating a project.");
    }
    this.requireWorkspacePermission(actor, workspaceId, "project:create");

    const slug = input.slug ?? slugify(input.name);
    for (const p of this.state.projects.values()) {
      if (p.workspaceId === workspaceId && p.slug === slug) {
        throw new ConflictError(`Project slug "${slug}" already exists in this workspace.`);
      }
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      workspaceId,
      name: input.name,
      slug,
      description: input.description,
      status: "active",
      restrictedAccess: Boolean(input.restrictedAccess),
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.projects.set(project.id, project);

    // Initialize all 10 lifecycle stages
    for (const st of LIFECYCLE_STAGES) {
      const stageId = crypto.randomUUID();
      this.state.projectStages.set(stageId, {
        id: stageId,
        projectId: project.id,
        workspaceId,
        stageKey: st.key,
        status: st.key === "idea" ? "in_progress" : "not_started",
        progressPct: st.key === "idea" ? 25 : 0,
        updatedAt: now,
      });
    }

    // Initialize all 9 logical artifacts
    for (const artType of ARTIFACT_TYPES) {
      const artId = crypto.randomUUID();
      this.state.artifacts.set(artId, {
        id: artId,
        workspaceId,
        projectId: project.id,
        artifactType: artType,
        title: ARTIFACT_META[artType].title,
        currentRevisionId: null,
        needsReview: false,
        revisionCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.recordAudit({
      workspaceId,
      projectId: project.id,
      actor,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      metadata: { name: project.name, slug: project.slug },
    });
    return project;
  }

  getProject(actor: ActorContext, projectId: string): Project & {
    stages: ProjectStage[];
    stats: {
      requirementsCount: number;
      confirmedRequirementsCount: number;
      artifactsWithRevisions: number;
      openValidationIssues: number;
      coveragePct: number;
    };
  } {
    const { project } = this.requireProjectAccess(actor, projectId, "project:read");
    const stages = this.listProjectStages(actor, projectId);
    const reqs = this.listRequirements(actor, projectId);
    const arts = this.listArtifacts(actor, projectId);
    const matrix = this.getTraceabilityMatrix(actor, projectId);
    const latestValidation = this.listValidationRuns(actor, projectId)[0];

    return {
      ...project,
      stages,
      stats: {
        requirementsCount: reqs.length,
        confirmedRequirementsCount: reqs.filter((r) => r.status === "confirmed").length,
        artifactsWithRevisions: arts.filter((a) => Boolean(a.currentRevisionId)).length,
        openValidationIssues: latestValidation
          ? latestValidation.issues.filter((i) => i.status === "open").length
          : 0,
        coveragePct: matrix.overallCoveragePct,
      },
    };
  }

  updateProject(
    actor: ActorContext,
    projectId: string,
    input: { name?: string; description?: string; status?: Project["status"]; restrictedAccess?: boolean }
  ): Project {
    const { project } = this.requireProjectAccess(actor, projectId, "project:manage");
    const now = new Date().toISOString();
    const updated: Project = {
      ...project,
      name: input.name ?? project.name,
      description: input.description ?? project.description,
      status: input.status ?? project.status,
      restrictedAccess: input.restrictedAccess ?? project.restrictedAccess,
      archivedAt: input.status === "archived" ? now : project.archivedAt,
      updatedAt: now,
    };
    this.state.projects.set(projectId, updated);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: input.status === "archived" ? "project.archived" : "project.updated",
      entityType: "project",
      entityId: projectId,
    });
    return updated;
  }

  listProjectStages(actor: ActorContext, projectId: string): ProjectStage[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    const order = new Map(LIFECYCLE_STAGES.map((s, idx) => [s.key, idx]));
    return Array.from(this.state.projectStages.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => (order.get(a.stageKey) ?? 0) - (order.get(b.stageKey) ?? 0));
  }

  updateProjectStage(
    actor: ActorContext,
    projectId: string,
    stageKey: StageKey,
    input: { status: StageStatus; progressPct?: number; notes?: string }
  ): ProjectStage {
    const { project } = this.requireProjectAccess(actor, projectId, "project:manage");
    const stage = Array.from(this.state.projectStages.values()).find(
      (s) => s.projectId === projectId && s.stageKey === stageKey
    );
    if (!stage) throw new NotFoundError("ProjectStage", stageKey);
    const updated: ProjectStage = {
      ...stage,
      status: input.status,
      progressPct: input.progressPct ?? (input.status === "approved" ? 100 : stage.progressPct),
      notes: input.notes ?? stage.notes,
      updatedAt: new Date().toISOString(),
    };
    this.state.projectStages.set(stage.id, updated);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "project_stage.updated",
      entityType: "project_stage",
      entityId: stage.id,
      metadata: { stageKey, status: input.status },
    });
    return updated;
  }

  listProjectFiles(actor: ActorContext, projectId: string): ProjectFile[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.projectFiles.values())
      .filter((f) => f.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getProjectFile(actor: ActorContext, fileId: string): ProjectFile {
    const file = this.state.projectFiles.get(fileId);
    if (!file) throw new NotFoundError("ProjectFile", fileId);
    this.requireProjectAccess(actor, file.projectId, "project:read");
    return file;
  }

  createProjectFile(
    actor: ActorContext,
    projectId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; extractedText?: string }
  ): { file: ProjectFile; signedUploadUrl: string; expiresInSeconds: number } {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const id = crypto.randomUUID();
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${project.workspaceId}/${project.id}/${id}-${safeName}`;
    const file: ProjectFile = {
      id,
      workspaceId: project.workspaceId,
      projectId: project.id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageBucket: process.env.STORAGE_BUCKET_PROJECT_FILES || "project-files",
      storagePath,
      uploadStatus: "uploaded",
      extractedText: input.extractedText ?? null,
      uploadedBy: actor.userId,
      createdAt: new Date().toISOString(),
    };
    this.state.projectFiles.set(id, file);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "project_file.created",
      entityType: "project_file",
      entityId: id,
      metadata: { fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
    });
    const signedToken = crypto.randomBytes(16).toString("hex");
    return {
      file,
      signedUploadUrl: `/api/projects/${projectId}/files?uploadId=${id}&token=${signedToken}`,
      expiresInSeconds: 900,
    };
  }

  // ---------------------------------------------------------------------------
  // Discovery, Clarifications, Knowledge Repository & Research (P03)
  // ---------------------------------------------------------------------------

  listDiscoverySessions(actor: ActorContext, projectId: string): DiscoverySession[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.discoverySessions.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createDiscoverySession(
    actor: ActorContext,
    projectId: string,
    input: { title: string; briefSnapshot: string }
  ): DiscoverySession {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const now = new Date().toISOString();
    const session: DiscoverySession = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      title: input.title,
      briefSnapshot: input.briefSnapshot,
      status: "active",
      summary: {},
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.discoverySessions.set(session.id, session);
    return session;
  }

  listClarificationQuestions(actor: ActorContext, projectId: string): ClarificationQuestion[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.clarificationQuestions.values())
      .filter((q) => q.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  createClarificationQuestion(
    actor: ActorContext,
    projectId: string,
    input: { sessionId: string; category: string; questionText: string; rationale: string; priority: ClarificationQuestion["priority"] }
  ): ClarificationQuestion {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const now = new Date().toISOString();
    const q: ClarificationQuestion = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      sessionId: input.sessionId,
      category: input.category,
      questionText: input.questionText,
      rationale: input.rationale,
      priority: input.priority,
      status: "open",
      source: "user",
      answers: [],
      createdAt: now,
      updatedAt: now,
    };
    this.state.clarificationQuestions.set(q.id, q);
    return q;
  }

  answerClarificationQuestion(
    actor: ActorContext,
    questionId: string,
    input: {
      status?: ClarificationQuestion["status"];
      answerText?: string;
      isDeferral?: boolean;
      deferralReason?: string;
      provenance?: "manual" | "stakeholder_interview" | "document" | "decision";
    }
  ): ClarificationQuestion {
    const question = this.state.clarificationQuestions.get(questionId);
    if (!question) throw new NotFoundError("ClarificationQuestion", questionId);
    this.requireProjectAccess(actor, question.projectId, "project:contribute");

    const now = new Date().toISOString();
    const nextAnswers = [...question.answers];
    if (input.answerText) {
      nextAnswers.push({
        id: crypto.randomUUID(),
        questionId,
        answerText: input.answerText,
        isDeferral: Boolean(input.isDeferral),
        deferralReason: input.deferralReason ?? null,
        provenance: input.provenance ?? "manual",
        answeredBy: actor.userId,
        createdAt: now,
      });
    }
    const nextStatus: ClarificationQuestion["status"] =
      input.status ?? (input.isDeferral ? "deferred" : input.answerText ? "answered" : question.status);

    const updated: ClarificationQuestion = {
      ...question,
      status: nextStatus,
      answers: nextAnswers,
      updatedAt: now,
    };
    this.state.clarificationQuestions.set(questionId, updated);
    return updated;
  }

  listRequirements(
    actor: ActorContext,
    projectId: string,
    filters?: { status?: string; type?: string; search?: string }
  ): Requirement[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.requirements.values())
      .filter((r) => {
        if (r.projectId !== projectId) return false;
        if (filters?.status && r.status !== filters.status) return false;
        if (filters?.type && r.requirementType !== filters.type) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          if (
            !r.title.toLowerCase().includes(q) &&
            !r.requirementKey.toLowerCase().includes(q) &&
            !r.description.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.requirementKey.localeCompare(b.requirementKey));
  }

  getRequirement(actor: ActorContext, requirementId: string): Requirement {
    const req = this.state.requirements.get(requirementId);
    if (!req) throw new NotFoundError("Requirement", requirementId);
    this.requireProjectAccess(actor, req.projectId, "project:read");
    return req;
  }

  createRequirement(
    actor: ActorContext,
    projectId: string,
    input: {
      requirementType: Requirement["requirementType"];
      title: string;
      description: string;
      priority: Requirement["priority"];
      status: Requirement["status"];
      acceptanceCriteria: string[];
      sourceType: Requirement["sourceType"];
      sourceRefId?: string;
    }
  ): Requirement {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const existingCount = Array.from(this.state.requirements.values()).filter(
      (r) => r.projectId === projectId
    ).length;
    const requirementKey = `REQ-${String(existingCount + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const req: Requirement = {
      id,
      workspaceId: project.workspaceId,
      projectId,
      requirementKey,
      requirementType: input.requirementType,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: input.status,
      acceptanceCriteria: input.acceptanceCriteria,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId ?? null,
      currentVersion: 1,
      revisions: [
        {
          id: crypto.randomUUID(),
          requirementId: id,
          versionNo: 1,
          snapshot: { ...input, requirementKey },
          changeSummary: "Initial requirement created",
          changedBy: actor.userId,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.state.requirements.set(id, req);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "requirement.created",
      entityType: "requirement",
      entityId: id,
      metadata: { requirementKey, status: req.status },
    });
    return req;
  }

  updateRequirement(
    actor: ActorContext,
    requirementId: string,
    input: {
      requirementType?: Requirement["requirementType"];
      title?: string;
      description?: string;
      priority?: Requirement["priority"];
      status?: Requirement["status"];
      acceptanceCriteria?: string[];
      changeSummary?: string;
    }
  ): { requirement: Requirement; flaggedArtifactIds: string[] } {
    const existing = this.state.requirements.get(requirementId);
    if (!existing) throw new NotFoundError("Requirement", requirementId);
    this.requireProjectAccess(actor, existing.projectId, "project:contribute");

    const now = new Date().toISOString();
    const nextVersion = existing.currentVersion + 1;
    const updated: Requirement = {
      ...existing,
      requirementType: input.requirementType ?? existing.requirementType,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      priority: input.priority ?? existing.priority,
      status: input.status ?? existing.status,
      acceptanceCriteria: input.acceptanceCriteria ?? existing.acceptanceCriteria,
      currentVersion: nextVersion,
      revisions: [
        ...(existing.revisions ?? []),
        {
          id: crypto.randomUUID(),
          requirementId,
          versionNo: nextVersion,
          snapshot: {
            title: input.title ?? existing.title,
            description: input.description ?? existing.description,
            priority: input.priority ?? existing.priority,
            status: input.status ?? existing.status,
            acceptanceCriteria: input.acceptanceCriteria ?? existing.acceptanceCriteria,
          },
          changeSummary: input.changeSummary ?? "Requirement updated",
          changedBy: actor.userId,
          createdAt: now,
        },
      ],
      updatedAt: now,
    };
    this.state.requirements.set(requirementId, updated);

    // P10-02: Flag downstream linked artifacts for review when a confirmed requirement changes
    const flaggedArtifactIds: string[] = [];
    if (existing.status === "confirmed" || updated.status === "confirmed") {
      for (const art of this.state.artifacts.values()) {
        if (art.projectId !== existing.projectId || !art.currentRevisionId) continue;
        const rev = this.state.artifactRevisions.get(art.currentRevisionId);
        const linked = rev?.content.linkedRequirementIds ?? [];
        if (linked.includes(requirementId)) {
          this.state.artifacts.set(art.id, { ...art, needsReview: true, updatedAt: now });
          flaggedArtifactIds.push(art.id);
        }
      }
    }

    this.recordAudit({
      workspaceId: existing.workspaceId,
      projectId: existing.projectId,
      actor,
      action: "requirement.updated",
      entityType: "requirement",
      entityId: requirementId,
      metadata: { versionNo: nextVersion, status: updated.status, flaggedArtifactIds },
    });

    return { requirement: updated, flaggedArtifactIds };
  }

  listDecisions(actor: ActorContext, projectId: string): Decision[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.decisions.values()).filter((d) => d.projectId === projectId);
  }

  createDecision(
    actor: ActorContext,
    projectId: string,
    input: {
      title: string;
      context: string;
      decisionStatement: string;
      rationale: string;
      alternatives: string[];
      status: Decision["status"];
    }
  ): Decision {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.decisions.values()).filter((d) => d.projectId === projectId).length;
    const now = new Date().toISOString();
    const dec: Decision = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      decisionKey: `DEC-${String(count + 1).padStart(3, "0")}`,
      title: input.title,
      context: input.context,
      decisionStatement: input.decisionStatement,
      rationale: input.rationale,
      alternatives: input.alternatives,
      status: input.status,
      decidedBy: actor.userId,
      decidedAt: input.status === "accepted" ? now : null,
      createdAt: now,
    };
    this.state.decisions.set(dec.id, dec);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "decision.created",
      entityType: "decision",
      entityId: dec.id,
      metadata: { decisionKey: dec.decisionKey, status: dec.status },
    });
    return dec;
  }

  listAssumptionsAndConstraints(actor: ActorContext, projectId: string): {
    assumptions: Assumption[];
    constraints: Constraint[];
    researchSources: ResearchSource[];
    researchEvidence: ResearchEvidence[];
  } {
    this.requireProjectAccess(actor, projectId, "project:read");
    return {
      assumptions: Array.from(this.state.assumptions.values()).filter((a) => a.projectId === projectId),
      constraints: Array.from(this.state.constraints.values()).filter((c) => c.projectId === projectId),
      researchSources: Array.from(this.state.researchSources.values()).filter((s) => s.projectId === projectId),
      researchEvidence: Array.from(this.state.researchEvidence.values()).filter((e) => e.projectId === projectId),
    };
  }

  createAssumption(
    actor: ActorContext,
    projectId: string,
    input: { statement: string; confidence: Assumption["confidence"]; status: Assumption["status"]; impactIfFalse: string }
  ): Assumption {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.assumptions.values()).filter((a) => a.projectId === projectId).length;
    const item: Assumption = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      assumptionKey: `ASM-${String(count + 1).padStart(3, "0")}`,
      statement: input.statement,
      confidence: input.confidence,
      status: input.status,
      impactIfFalse: input.impactIfFalse,
      createdAt: new Date().toISOString(),
    };
    this.state.assumptions.set(item.id, item);
    return item;
  }

  createConstraint(
    actor: ActorContext,
    projectId: string,
    input: { category: Constraint["category"]; title: string; description: string; severity: Constraint["severity"] }
  ): Constraint {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.constraints.values()).filter((c) => c.projectId === projectId).length;
    const item: Constraint = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      constraintKey: `CON-${String(count + 1).padStart(3, "0")}`,
      category: input.category,
      title: input.title,
      description: input.description,
      severity: input.severity,
      createdAt: new Date().toISOString(),
    };
    this.state.constraints.set(item.id, item);
    return item;
  }

  createResearchSourceWithEvidence(
    actor: ActorContext,
    projectId: string,
    input: {
      title: string;
      sourceKind: ResearchSource["sourceKind"];
      url?: string;
      authorOrPublisher?: string;
      excerpt?: string;
      claimSummary?: string;
      linkedEntityType?: EntityType;
      linkedEntityId?: string;
    }
  ): { source: ResearchSource; evidence?: ResearchEvidence } {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const now = new Date().toISOString();
    const source: ResearchSource = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      title: input.title,
      sourceKind: input.sourceKind,
      url: input.url || null,
      authorOrPublisher: input.authorOrPublisher ?? null,
      createdAt: now,
    };
    this.state.researchSources.set(source.id, source);
    let evidence: ResearchEvidence | undefined;
    if (input.excerpt) {
      evidence = {
        id: crypto.randomUUID(),
        workspaceId: project.workspaceId,
        projectId,
        sourceId: source.id,
        excerpt: input.excerpt,
        claimSummary: input.claimSummary ?? input.title,
        confidence: "medium",
        linkedEntityType: input.linkedEntityType ?? null,
        linkedEntityId: input.linkedEntityId ?? null,
        createdAt: now,
      };
      this.state.researchEvidence.set(evidence.id, evidence);
    }
    return { source, evidence };
  }

  // ---------------------------------------------------------------------------
  // Artifacts, Immutable Revisions, Diffing & Exact-Revision Approvals (P06 & P10-01)
  // ---------------------------------------------------------------------------

  listArtifacts(actor: ActorContext, projectId: string): Artifact[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.artifacts.values())
      .filter((a) => a.projectId === projectId)
      .map((a) => {
        const revisions = Array.from(this.state.artifactRevisions.values()).filter(
          (r) => r.artifactId === a.id
        );
        return {
          ...a,
          currentRevision: a.currentRevisionId ? this.state.artifactRevisions.get(a.currentRevisionId) ?? null : null,
          revisionCount: revisions.length,
        };
      });
  }

  getArtifact(actor: ActorContext, artifactId: string): Artifact & { revisions: ArtifactRevision[]; approvals: Approval[] } {
    const artifact = this.state.artifacts.get(artifactId);
    if (!artifact) throw new NotFoundError("Artifact", artifactId);
    this.requireProjectAccess(actor, artifact.projectId, "project:read");
    const revisions = Array.from(this.state.artifactRevisions.values())
      .filter((r) => r.artifactId === artifactId)
      .sort((a, b) => b.versionNo - a.versionNo);
    const approvals = Array.from(this.state.approvals.values())
      .filter((ap) => ap.artifactId === artifactId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      ...artifact,
      currentRevision: artifact.currentRevisionId
        ? this.state.artifactRevisions.get(artifact.currentRevisionId) ?? null
        : revisions[0] ?? null,
      revisionCount: revisions.length,
      revisions,
      approvals,
    };
  }

  getArtifactByType(
    actor: ActorContext,
    projectId: string,
    artifactType: ArtifactType
  ): Artifact & { revisions: ArtifactRevision[]; approvals: Approval[] } {
    this.requireProjectAccess(actor, projectId, "project:read");
    const art = Array.from(this.state.artifacts.values()).find(
      (a) => a.projectId === projectId && a.artifactType === artifactType
    );
    if (!art) throw new NotFoundError("Artifact", artifactType);
    return this.getArtifact(actor, art.id);
  }

  listArtifactRevisions(actor: ActorContext, artifactId: string): ArtifactRevision[] {
    return this.getArtifact(actor, artifactId).revisions;
  }

  createArtifactRevision(
    actor: ActorContext,
    artifactId: string,
    input: {
      sections: Array<{
        sectionKey: string;
        heading: string;
        orderIndex: number;
        bodyMarkdown: string;
        structuredData?: Record<string, unknown>;
      }>;
      summary?: string;
      changeSummary?: string;
      status?: ArtifactRevision["status"];
      source?: ArtifactRevision["source"];
      baseRevisionId?: string | null;
      aiJobId?: string | null;
      setAsCurrent?: boolean;
      linkedRequirementIds?: string[];
    }
  ): ArtifactRevision {
    const artifact = this.state.artifacts.get(artifactId);
    if (!artifact) throw new NotFoundError("Artifact", artifactId);
    this.requireProjectAccess(actor, artifact.projectId, "project:contribute");

    const existingRevisions = Array.from(this.state.artifactRevisions.values()).filter(
      (r) => r.artifactId === artifactId
    );
    const nextVersionNo =
      existingRevisions.reduce((max, r) => Math.max(max, r.versionNo), 0) + 1;
    const now = new Date().toISOString();

    const revision: ArtifactRevision = {
      id: crypto.randomUUID(),
      workspaceId: artifact.workspaceId,
      projectId: artifact.projectId,
      artifactId,
      versionNo: nextVersionNo,
      status: input.status ?? "draft",
      source: input.source ?? "manual",
      baseRevisionId: input.baseRevisionId ?? artifact.currentRevisionId ?? null,
      changeSummary: input.changeSummary ?? `Revision v${nextVersionNo}`,
      aiJobId: input.aiJobId ?? null,
      content: {
        summary: input.summary ?? `${artifact.title} v${nextVersionNo}`,
        sections: input.sections,
        linkedRequirementIds:
          input.linkedRequirementIds ??
          Array.from(this.state.requirements.values())
            .filter((r) => r.projectId === artifact.projectId && r.status === "confirmed")
            .map((r) => r.id),
      },
      createdBy: actor.userId,
      createdAt: now,
    };

    // Immutable insert: NEVER mutates prior revisions (ART-01, APP-01)
    this.state.artifactRevisions.set(revision.id, revision);

    // AI candidate revisions do NOT silently overwrite current user revision unless setAsCurrent === true
    if (input.setAsCurrent !== false) {
      this.state.artifacts.set(artifactId, {
        ...artifact,
        currentRevisionId: revision.id,
        needsReview: false,
        revisionCount: existingRevisions.length + 1,
        updatedAt: now,
      });
    } else {
      this.state.artifacts.set(artifactId, {
        ...artifact,
        revisionCount: existingRevisions.length + 1,
        updatedAt: now,
      });
    }

    this.recordAudit({
      workspaceId: artifact.workspaceId,
      projectId: artifact.projectId,
      actor,
      action: "artifact_revision.created",
      entityType: "artifact_revision",
      entityId: revision.id,
      metadata: {
        artifactId,
        artifactType: artifact.artifactType,
        versionNo: nextVersionNo,
        source: revision.source,
        setAsCurrent: input.setAsCurrent !== false,
      },
    });
    return revision;
  }

  diffArtifactRevision(
    actor: ActorContext,
    revisionId: string,
    compareToRevisionId?: string | null
  ): RevisionDiffResult {
    const target = this.state.artifactRevisions.get(revisionId);
    if (!target) throw new NotFoundError("ArtifactRevision", revisionId);
    this.requireProjectAccess(actor, target.projectId, "project:read");

    const baseId = compareToRevisionId ?? target.baseRevisionId ?? null;
    const base = baseId ? this.state.artifactRevisions.get(baseId) ?? null : null;
    return computeRevisionDiff(
      base?.id ?? null,
      target.id,
      base?.content.sections ?? [],
      target.content.sections
    );
  }

  approveArtifactRevision(
    actor: ActorContext,
    revisionId: string,
    input: { decision: Approval["decision"]; comment: string }
  ): { approval: Approval; revision: ArtifactRevision } {
    const revision = this.state.artifactRevisions.get(revisionId);
    if (!revision) throw new NotFoundError("ArtifactRevision", revisionId);
    this.requireProjectAccess(actor, revision.projectId, "project:approve");

    const artifact = this.state.artifacts.get(revision.artifactId);
    if (!artifact) throw new NotFoundError("Artifact", revision.artifactId);

    const now = new Date().toISOString();
    const approval: Approval = {
      id: crypto.randomUUID(),
      workspaceId: revision.workspaceId,
      projectId: revision.projectId,
      artifactId: revision.artifactId,
      targetRevisionId: revision.id,
      decision: input.decision,
      comment: input.comment,
      reviewerId: actor.userId,
      reviewerName: actor.fullName,
      createdAt: now,
    };
    this.state.approvals.set(approval.id, approval);

    // Update exact revision status without touching content or any other revision (APP-01)
    const nextStatus: ArtifactRevision["status"] =
      input.decision === "approved"
        ? "approved"
        : input.decision === "rejected"
        ? "rejected"
        : "in_review";
    const updatedRevision: ArtifactRevision = { ...revision, status: nextStatus };
    this.state.artifactRevisions.set(revision.id, updatedRevision);

    if (input.decision === "approved") {
      this.state.artifacts.set(artifact.id, {
        ...artifact,
        currentRevisionId: revision.id,
        needsReview: false,
        updatedAt: now,
      });
    }

    this.recordAudit({
      workspaceId: revision.workspaceId,
      projectId: revision.projectId,
      actor,
      action: `artifact_revision.${input.decision}`,
      entityType: "artifact_revision",
      entityId: revision.id,
      metadata: { artifactId: artifact.id, versionNo: revision.versionNo, comment: input.comment },
    });

    return { approval, revision: updatedRevision };
  }

  // ---------------------------------------------------------------------------
  // Scope, UX, Architecture, Database, API, Development & QA (P07–P09)
  // ---------------------------------------------------------------------------

  listFeatures(actor: ActorContext, projectId: string): Feature[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.features.values()).filter((f) => f.projectId === projectId);
  }

  createFeature(
    actor: ActorContext,
    projectId: string,
    input: {
      name: string;
      description: string;
      scopeBucket: Feature["scopeBucket"];
      priority: Feature["priority"];
      effortEstimate: Feature["effortEstimate"];
      rationale: string;
      acceptanceSummary: string;
      linkedRequirementIds?: string[];
    }
  ): Feature {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.features.values()).filter((f) => f.projectId === projectId).length;
    const feature: Feature = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      featureKey: `FEAT-${String(count + 1).padStart(3, "0")}`,
      name: input.name,
      description: input.description,
      scopeBucket: input.scopeBucket,
      priority: input.priority,
      effortEstimate: input.effortEstimate,
      rationale: input.rationale,
      acceptanceSummary: input.acceptanceSummary,
      createdAt: new Date().toISOString(),
    };
    this.state.features.set(feature.id, feature);
    for (const reqId of input.linkedRequirementIds ?? []) {
      this.createTraceabilityLink(actor, projectId, {
        sourceType: "requirement",
        sourceId: reqId,
        targetType: "feature",
        targetId: feature.id,
        relationType: "implements",
      });
    }
    return feature;
  }

  getUXBundle(actor: ActorContext, projectId: string): {
    personas: UXPersona[];
    journeys: UserJourney[];
    screens: ScreenSpec[];
  } {
    this.requireProjectAccess(actor, projectId, "project:read");
    return {
      personas: Array.from(this.state.uxPersonas.values()).filter((p) => p.projectId === projectId),
      journeys: Array.from(this.state.userJourneys.values()).filter((j) => j.projectId === projectId),
      screens: Array.from(this.state.screenSpecs.values()).filter((s) => s.projectId === projectId),
    };
  }

  createUXPersona(
    actor: ActorContext,
    projectId: string,
    input: Omit<UXPersona, "id" | "projectId">
  ): UXPersona {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const persona: UXPersona = { id: crypto.randomUUID(), projectId, ...input };
    this.state.uxPersonas.set(persona.id, persona);
    return persona;
  }

  createUserJourney(
    actor: ActorContext,
    projectId: string,
    input: Omit<UserJourney, "id" | "projectId">
  ): UserJourney {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const journey: UserJourney = { id: crypto.randomUUID(), projectId, ...input };
    this.state.userJourneys.set(journey.id, journey);
    return journey;
  }

  createScreenSpec(
    actor: ActorContext,
    projectId: string,
    input: {
      name: string;
      routePath: string;
      purpose: string;
      components: string[];
      interactions: string[];
      linkedRequirementIds?: string[];
    }
  ): ScreenSpec {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.screenSpecs.values()).filter((s) => s.projectId === projectId).length;
    const screen: ScreenSpec = {
      id: crypto.randomUUID(),
      projectId,
      screenKey: `SCR-${String(count + 1).padStart(3, "0")}`,
      name: input.name,
      routePath: input.routePath,
      purpose: input.purpose,
      components: input.components,
      interactions: input.interactions,
      states: { loading: true, empty: true, error: true },
    };
    this.state.screenSpecs.set(screen.id, screen);
    for (const reqId of input.linkedRequirementIds ?? []) {
      this.createTraceabilityLink(actor, projectId, {
        sourceType: "requirement",
        sourceId: reqId,
        targetType: "screen",
        targetId: screen.id,
        relationType: "implements",
      });
    }
    return screen;
  }

  getArchitectureBundle(actor: ActorContext, projectId: string): {
    components: ArchitectureComponent[];
    relationships: ArchitectureRelationship[];
    decisions: ArchitectureDecision[];
  } {
    this.requireProjectAccess(actor, projectId, "project:read");
    return {
      components: Array.from(this.state.architectureComponents.values()).filter((c) => c.projectId === projectId),
      relationships: Array.from(this.state.architectureRelationships.values()).filter((r) => r.projectId === projectId),
      decisions: Array.from(this.state.architectureDecisions.values()).filter((d) => d.projectId === projectId),
    };
  }

  createArchitectureComponent(
    actor: ActorContext,
    projectId: string,
    input: {
      name: string;
      layer: ArchitectureComponent["layer"];
      technology: string;
      responsibility: string;
      positionX: number;
      positionY: number;
      relationships?: Array<{ targetComponentId: string; protocol: string; label: string; isAsync: boolean }>;
    }
  ): ArchitectureComponent {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.architectureComponents.values()).filter((c) => c.projectId === projectId).length;
    const comp: ArchitectureComponent = {
      id: crypto.randomUUID(),
      projectId,
      componentKey: `COMP-${String(count + 1).padStart(2, "0")}`,
      name: input.name,
      layer: input.layer,
      technology: input.technology,
      responsibility: input.responsibility,
      positionX: input.positionX,
      positionY: input.positionY,
    };
    this.state.architectureComponents.set(comp.id, comp);
    for (const rel of input.relationships ?? []) {
      const relId = crypto.randomUUID();
      this.state.architectureRelationships.set(relId, {
        id: relId,
        projectId,
        sourceComponentId: comp.id,
        targetComponentId: rel.targetComponentId,
        protocol: rel.protocol,
        label: rel.label,
        isAsync: rel.isAsync,
      });
    }
    return comp;
  }

  getDatabaseBundle(actor: ActorContext, projectId: string): {
    entities: DbEntity[];
    relationships: DbRelationship[];
    sqlMigrationDraft: string;
  } {
    this.requireProjectAccess(actor, projectId, "project:read");
    const entities = Array.from(this.state.dbEntities.values()).filter((e) => e.projectId === projectId);
    const relationships = Array.from(this.state.dbRelationships.values()).filter((r) => r.projectId === projectId);
    return {
      entities,
      relationships,
      sqlMigrationDraft: generateSqlMigrationDraft(entities, relationships),
    };
  }

  createDbEntity(
    actor: ActorContext,
    projectId: string,
    input: {
      tableName: string;
      schemaName: string;
      description: string;
      rlsEnabled: boolean;
      attributes: Array<{
        columnName: string;
        dataType: string;
        isPrimaryKey: boolean;
        isNullable: boolean;
        isUnique: boolean;
        defaultValue?: string;
        description: string;
      }>;
    }
  ): DbEntity {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const entityId = crypto.randomUUID();
    const count = Array.from(this.state.dbEntities.values()).filter((e) => e.projectId === projectId).length;
    const entity: DbEntity = {
      id: entityId,
      projectId,
      tableName: input.tableName,
      schemaName: input.schemaName,
      description: input.description,
      rlsEnabled: input.rlsEnabled,
      positionX: (count % 3) * 320 + 40,
      positionY: Math.floor(count / 3) * 240 + 40,
      attributes: input.attributes.map((a, idx) => ({
        id: crypto.randomUUID(),
        entityId,
        columnName: a.columnName,
        dataType: a.dataType,
        isPrimaryKey: a.isPrimaryKey,
        isNullable: a.isNullable,
        isUnique: a.isUnique,
        defaultValue: a.defaultValue ?? null,
        description: a.description,
        ordinalPosition: idx + 1,
      })),
    };
    this.state.dbEntities.set(entityId, entity);
    return entity;
  }

  getApiBundle(actor: ActorContext, projectId: string): {
    endpoints: ApiEndpoint[];
    openApiSpec: Record<string, unknown>;
    validationErrors: string[];
  } {
    const { project } = this.requireProjectAccess(actor, projectId, "project:read");
    const endpoints = Array.from(this.state.apiEndpoints.values()).filter((e) => e.projectId === projectId);
    const { spec, validationErrors } = generateOpenApiSpec(project, endpoints);
    return { endpoints, openApiSpec: spec, validationErrors };
  }

  createApiEndpoint(
    actor: ActorContext,
    projectId: string,
    input: Omit<ApiEndpoint, "id" | "projectId" | "endpointKey">
  ): ApiEndpoint {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.apiEndpoints.values()).filter((e) => e.projectId === projectId).length;
    const ep: ApiEndpoint = {
      id: crypto.randomUUID(),
      projectId,
      endpointKey: `API-${String(count + 1).padStart(3, "0")}`,
      ...input,
    };
    this.state.apiEndpoints.set(ep.id, ep);
    return ep;
  }

  listDevelopmentTasks(actor: ActorContext, projectId: string): DevelopmentTask[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.developmentTasks.values()).filter((t) => t.projectId === projectId);
  }

  createDevelopmentTask(
    actor: ActorContext,
    projectId: string,
    input: Omit<DevelopmentTask, "id" | "projectId" | "taskKey"> & { linkedRequirementIds?: string[] }
  ): DevelopmentTask {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.developmentTasks.values()).filter((t) => t.projectId === projectId).length;
    const task: DevelopmentTask = {
      id: crypto.randomUUID(),
      projectId,
      taskKey: `DEV-${String(count + 1).padStart(3, "0")}`,
      phase: input.phase,
      title: input.title,
      description: input.description,
      ownerRole: input.ownerRole,
      priority: input.priority,
      estimateHours: input.estimateHours,
      status: input.status,
      acceptanceCriteria: input.acceptanceCriteria,
      dependencyTaskIds: input.dependencyTaskIds,
    };
    this.state.developmentTasks.set(task.id, task);
    for (const reqId of input.linkedRequirementIds ?? []) {
      this.createTraceabilityLink(actor, projectId, {
        sourceType: "requirement",
        sourceId: reqId,
        targetType: "development_task",
        targetId: task.id,
        relationType: "implements",
      });
    }
    return task;
  }

  listTestCases(actor: ActorContext, projectId: string): TestCase[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.testCases.values()).filter((tc) => tc.projectId === projectId);
  }

  createTestCase(
    actor: ActorContext,
    projectId: string,
    input: Omit<TestCase, "id" | "projectId" | "testKey"> & { linkedRequirementIds?: string[] }
  ): TestCase {
    this.requireProjectAccess(actor, projectId, "project:contribute");
    const count = Array.from(this.state.testCases.values()).filter((tc) => tc.projectId === projectId).length;
    const tc: TestCase = {
      id: crypto.randomUUID(),
      projectId,
      testKey: `TC-${String(count + 1).padStart(3, "0")}`,
      area: input.area,
      title: input.title,
      preconditions: input.preconditions,
      steps: input.steps,
      expectedResult: input.expectedResult,
      testType: input.testType,
      priority: input.priority,
      status: input.status,
    };
    this.state.testCases.set(tc.id, tc);
    for (const reqId of input.linkedRequirementIds ?? []) {
      this.createTraceabilityLink(actor, projectId, {
        sourceType: "requirement",
        sourceId: reqId,
        targetType: "test_case",
        targetId: tc.id,
        relationType: "verifies",
      });
    }
    return tc;
  }

  // ---------------------------------------------------------------------------
  // Traceability, Validation & Change Impact Analysis (P09-03 & P10-02)
  // ---------------------------------------------------------------------------

  private entityBelongsToProject(entityType: EntityType, entityId: string, projectId: string): boolean {
    switch (entityType) {
      case "requirement":
        return this.state.requirements.get(entityId)?.projectId === projectId;
      case "decision":
        return this.state.decisions.get(entityId)?.projectId === projectId;
      case "artifact":
        return this.state.artifacts.get(entityId)?.projectId === projectId;
      case "feature":
        return this.state.features.get(entityId)?.projectId === projectId;
      case "screen":
        return this.state.screenSpecs.get(entityId)?.projectId === projectId;
      case "architecture_component":
        return this.state.architectureComponents.get(entityId)?.projectId === projectId;
      case "db_entity":
        return this.state.dbEntities.get(entityId)?.projectId === projectId;
      case "api_endpoint":
        return this.state.apiEndpoints.get(entityId)?.projectId === projectId;
      case "development_task":
        return this.state.developmentTasks.get(entityId)?.projectId === projectId;
      case "test_case":
        return this.state.testCases.get(entityId)?.projectId === projectId;
    }
  }

  createTraceabilityLink(
    actor: ActorContext,
    projectId: string,
    input: {
      sourceType: EntityType;
      sourceId: string;
      targetType: EntityType;
      targetId: string;
      relationType: TraceabilityLink["relationType"];
    }
  ): TraceabilityLink {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    // Risk R-001: strictly validate both ends belong to the same project
    if (!this.entityBelongsToProject(input.sourceType, input.sourceId, projectId)) {
      throw new ValidationError(`Source ${input.sourceType} (${input.sourceId}) does not belong to project ${projectId}.`);
    }
    if (!this.entityBelongsToProject(input.targetType, input.targetId, projectId)) {
      throw new ValidationError(`Target ${input.targetType} (${input.targetId}) does not belong to project ${projectId}.`);
    }
    const link: TraceabilityLink = {
      id: crypto.randomUUID(),
      workspaceId: project.workspaceId,
      projectId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      relationType: input.relationType,
      createdAt: new Date().toISOString(),
    };
    this.state.traceabilityLinks.set(link.id, link);
    return link;
  }

  getTraceabilityMatrix(actor: ActorContext, projectId: string): TraceabilityMatrixReport & { links: TraceabilityLink[] } {
    this.requireProjectAccess(actor, projectId, "project:read");
    const links = Array.from(this.state.traceabilityLinks.values()).filter((l) => l.projectId === projectId);
    const report = computeTraceabilityMatrix({
      requirements: Array.from(this.state.requirements.values()).filter((r) => r.projectId === projectId),
      features: Array.from(this.state.features.values()).filter((f) => f.projectId === projectId),
      screens: Array.from(this.state.screenSpecs.values()).filter((s) => s.projectId === projectId),
      apiEndpoints: Array.from(this.state.apiEndpoints.values()).filter((a) => a.projectId === projectId),
      tasks: Array.from(this.state.developmentTasks.values()).filter((t) => t.projectId === projectId),
      testCases: Array.from(this.state.testCases.values()).filter((tc) => tc.projectId === projectId),
      links,
    });
    return { ...report, links };
  }

  listValidationRuns(actor: ActorContext, projectId: string): ValidationRun[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.validationRuns.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getValidationRun(actor: ActorContext, runId: string): ValidationRun {
    const run = this.state.validationRuns.get(runId);
    if (!run) throw new NotFoundError("ValidationRun", runId);
    this.requireProjectAccess(actor, run.projectId, "project:read");
    return run;
  }

  runValidationNow(actor: ActorContext, projectId: string): ValidationRun {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const now = new Date().toISOString();
    const runId = crypto.randomUUID();
    const candidates = runDeterministicValidation({
      requirements: Array.from(this.state.requirements.values()).filter((r) => r.projectId === projectId),
      artifacts: Array.from(this.state.artifacts.values()).filter((a) => a.projectId === projectId),
      features: Array.from(this.state.features.values()).filter((f) => f.projectId === projectId),
      screens: Array.from(this.state.screenSpecs.values()).filter((s) => s.projectId === projectId),
      dbEntities: Array.from(this.state.dbEntities.values()).filter((e) => e.projectId === projectId),
      apiEndpoints: Array.from(this.state.apiEndpoints.values()).filter((ep) => ep.projectId === projectId),
      tasks: Array.from(this.state.developmentTasks.values()).filter((t) => t.projectId === projectId),
      testCases: Array.from(this.state.testCases.values()).filter((tc) => tc.projectId === projectId),
      links: Array.from(this.state.traceabilityLinks.values()).filter((l) => l.projectId === projectId),
    });

    const issues = candidates.map((c) => ({
      id: crypto.randomUUID(),
      validationRunId: runId,
      ruleCode: c.ruleCode,
      severity: c.severity,
      title: c.title,
      description: c.description,
      recommendation: c.recommendation,
      entityType: c.entityType ?? null,
      entityId: c.entityId ?? null,
      status: "open" as const,
      createdAt: now,
    }));
    const counts = summarizeValidationIssues(issues);

    const run: ValidationRun = {
      id: runId,
      workspaceId: project.workspaceId,
      projectId,
      status: "succeeded",
      ...counts,
      summary: { totalIssues: issues.length, mode: "deterministic" },
      issues,
      completedAt: now,
      createdAt: now,
    };
    this.state.validationRuns.set(runId, run);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "validation_run.completed",
      entityType: "validation_run",
      entityId: runId,
      metadata: counts,
    });
    return run;
  }

  listChangeRequests(actor: ActorContext, projectId: string): ChangeRequest[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.changeRequests.values())
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createChangeRequest(
    actor: ActorContext,
    projectId: string,
    input: {
      title: string;
      description: string;
      reason: string;
      sourceEntityType?: EntityType;
      sourceEntityId?: string;
    }
  ): ChangeRequest {
    const { project } = this.requireProjectAccess(actor, projectId, "project:manage_changes");
    const count = Array.from(this.state.changeRequests.values()).filter((c) => c.projectId === projectId).length;
    const id = crypto.randomUUID();
    const links = Array.from(this.state.traceabilityLinks.values()).filter((l) => l.projectId === projectId);
    const impactCandidates =
      input.sourceEntityType && input.sourceEntityId
        ? analyzeChangeImpact({
            sourceEntityType: input.sourceEntityType,
            sourceEntityId: input.sourceEntityId,
            links,
          })
        : [];

    const cr: ChangeRequest = {
      id,
      workspaceId: project.workspaceId,
      projectId,
      changeKey: `CR-${String(count + 1).padStart(3, "0")}`,
      title: input.title,
      description: input.description,
      reason: input.reason,
      status: impactCandidates.length > 0 ? "impact_review" : "submitted",
      sourceEntityType: input.sourceEntityType ?? null,
      sourceEntityId: input.sourceEntityId ?? null,
      requestedBy: actor.userId,
      impacts: impactCandidates.map((imp) => ({
        id: crypto.randomUUID(),
        changeRequestId: id,
        affectedEntityType: imp.affectedEntityType,
        affectedEntityId: imp.affectedEntityId,
        impactSeverity: imp.impactSeverity,
        rationale: imp.rationale,
        reviewed: false,
      })),
      createdAt: new Date().toISOString(),
    };
    this.state.changeRequests.set(id, cr);
    this.recordAudit({
      workspaceId: project.workspaceId,
      projectId,
      actor,
      action: "change_request.created",
      entityType: "change_request",
      entityId: id,
      metadata: { changeKey: cr.changeKey, impactCount: cr.impacts.length },
    });
    return cr;
  }

  // ---------------------------------------------------------------------------
  // AI Providers, Encrypted Credentials, Models, Policies, Jobs & Usage (P04 & P05)
  // ---------------------------------------------------------------------------

  listAIProviders(actor: ActorContext, workspaceId: string): AIProviderMetadata[] {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:manage_ai_providers");
    // Strictly return metadata only — NEVER expose ciphertext or plaintext secrets (PROV-01)
    return Array.from(this.state.aiProviders.values())
      .filter((p) => p.workspaceId === workspaceId)
      .map((p) => ({ ...p }));
  }

  createAIProvider(
    actor: ActorContext,
    workspaceId: string,
    input: {
      providerType: AIProviderMetadata["providerType"];
      displayName: string;
      baseUrl?: string;
      apiKey: string;
      enabled: boolean;
    }
  ): { provider: AIProviderMetadata; seededModels: AIModel[] } {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:manage_ai_providers");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const encrypted = encryptSecret(input.apiKey);

    const provider: AIProviderMetadata = {
      id,
      workspaceId,
      providerType: input.providerType,
      displayName: input.displayName,
      baseUrl: input.baseUrl || null,
      enabled: input.enabled,
      keyHint: maskApiKey(input.apiKey),
      keyVersion: encrypted.keyVersion,
      lastTestedAt: null,
      lastTestStatus: null,
      createdAt: now,
      updatedAt: now,
    };
    this.state.aiProviders.set(id, provider);
    this.state.aiProviderSecrets.set(id, {
      providerId: id,
      workspaceId,
      ciphertext: encrypted.ciphertext,
      keyVersion: encrypted.keyVersion,
      rotatedAt: now,
    });

    // Seed built-in compatible models for this provider
    const seededModels: AIModel[] = [];
    for (const def of getBuiltinModelsForProvider(input.providerType)) {
      const m: AIModel = {
        id: crypto.randomUUID(),
        workspaceId,
        providerId: id,
        providerType: provider.providerType,
        providerDisplayName: provider.displayName,
        modelId: def.modelId,
        displayName: def.displayName,
        enabled: true,
        capabilities: def.capabilities,
        inputCostPer1mUsd: def.inputCostPer1mUsd,
        outputCostPer1mUsd: def.outputCostPer1mUsd,
      };
      this.state.aiModels.set(m.id, m);
      seededModels.push(m);
    }

    this.recordAudit({
      workspaceId,
      actor,
      action: "ai_provider.created",
      entityType: "ai_provider",
      entityId: id,
      metadata: { providerType: input.providerType, displayName: input.displayName, keyHint: provider.keyHint },
    });
    return { provider, seededModels };
  }

  updateAIProvider(
    actor: ActorContext,
    providerId: string,
    input: { displayName?: string; baseUrl?: string; enabled?: boolean; rotateApiKey?: string }
  ): AIProviderMetadata {
    const existing = this.state.aiProviders.get(providerId);
    if (!existing) throw new NotFoundError("AIProvider", providerId);
    this.requireWorkspacePermission(actor, existing.workspaceId, "workspace:manage_ai_providers");

    const now = new Date().toISOString();
    let keyHint = existing.keyHint;
    let keyVersion = existing.keyVersion;

    if (input.rotateApiKey) {
      const encrypted = encryptSecret(input.rotateApiKey);
      keyHint = maskApiKey(input.rotateApiKey);
      keyVersion = encrypted.keyVersion;
      this.state.aiProviderSecrets.set(providerId, {
        providerId,
        workspaceId: existing.workspaceId,
        ciphertext: encrypted.ciphertext,
        keyVersion: encrypted.keyVersion,
        rotatedAt: now,
      });
    }

    const updated: AIProviderMetadata = {
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      baseUrl: input.baseUrl !== undefined ? input.baseUrl || null : existing.baseUrl,
      enabled: input.enabled ?? existing.enabled,
      keyHint,
      keyVersion,
      updatedAt: now,
    };
    this.state.aiProviders.set(providerId, updated);
    this.recordAudit({
      workspaceId: existing.workspaceId,
      actor,
      action: input.rotateApiKey ? "ai_provider.key_rotated" : "ai_provider.updated",
      entityType: "ai_provider",
      entityId: providerId,
      metadata: { enabled: updated.enabled, keyHint: updated.keyHint },
    });
    return updated;
  }

  /** Strictly server/worker-internal decryption method — never exposed via API responses. */
  getDecryptedProviderCredentialsInternal(providerId: string): {
    provider: AIProviderMetadata;
    apiKey: string;
    baseUrl?: string | null;
  } {
    const provider = this.state.aiProviders.get(providerId);
    const secret = this.state.aiProviderSecrets.get(providerId);
    if (!provider || !secret) {
      throw new NotFoundError("AIProviderSecret", providerId);
    }
    return {
      provider,
      apiKey: decryptSecret(secret.ciphertext),
      baseUrl: provider.baseUrl,
    };
  }

  recordProviderTestResult(
    actor: ActorContext,
    providerId: string,
    result: { ok: boolean; message: string }
  ): AIProviderMetadata {
    const existing = this.state.aiProviders.get(providerId);
    if (!existing) throw new NotFoundError("AIProvider", providerId);
    this.requireWorkspacePermission(actor, existing.workspaceId, "workspace:manage_ai_providers");
    const now = new Date().toISOString();
    const updated: AIProviderMetadata = {
      ...existing,
      lastTestedAt: now,
      lastTestStatus: result.ok ? "ok" : "error",
      lastTestError: result.ok ? null : result.message,
      updatedAt: now,
    };
    this.state.aiProviders.set(providerId, updated);
    return updated;
  }

  listAIModels(actor: ActorContext, workspaceId: string): {
    models: AIModel[];
    policies: AITaskPolicy[];
  } {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:read");
    const enabledProviderIds = new Set(
      Array.from(this.state.aiProviders.values())
        .filter((p) => p.workspaceId === workspaceId && p.enabled)
        .map((p) => p.id)
    );
    const models = Array.from(this.state.aiModels.values())
      .filter((m) => m.workspaceId === workspaceId && enabledProviderIds.has(m.providerId));
    const policies = Array.from(this.state.aiTaskPolicies.values()).filter(
      (p) => p.workspaceId === workspaceId
    );
    return { models, policies };
  }

  upsertAITaskPolicy(
    actor: ActorContext,
    workspaceId: string,
    taskType: AITaskType,
    input: {
      defaultModelId?: string | null;
      fallbackModelId?: string | null;
      allowedModelIds: string[];
      allowUserOverride: boolean;
      maxTokens: number;
      monthlyBudgetUsd?: number | null;
    }
  ): AITaskPolicy {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:manage_ai_policies");
    const key = `${workspaceId}:${taskType}`;
    const existing = this.state.aiTaskPolicies.get(key);
    const providers = Array.from(this.state.aiProviders.values()).filter(
      (p) => p.workspaceId === workspaceId
    );
    const models = Array.from(this.state.aiModels.values()).filter(
      (m) => m.workspaceId === workspaceId
    );

    // Validate chosen default model compatibility server-side
    if (input.defaultModelId) {
      resolveModelForTask({
        taskType,
        providers,
        models,
        modelOverrideId: input.defaultModelId,
      });
    }

    const policy: AITaskPolicy = {
      id: existing?.id ?? crypto.randomUUID(),
      workspaceId,
      taskType,
      defaultModelId: input.defaultModelId ?? null,
      fallbackModelId: input.fallbackModelId ?? null,
      allowedModelIds: input.allowedModelIds,
      allowUserOverride: input.allowUserOverride,
      maxTokens: input.maxTokens,
      monthlyBudgetUsd: input.monthlyBudgetUsd ?? null,
      updatedAt: new Date().toISOString(),
    };
    this.state.aiTaskPolicies.set(key, policy);
    this.recordAudit({
      workspaceId,
      actor,
      action: "ai_task_policy.updated",
      entityType: "ai_task_policy",
      entityId: policy.id,
      metadata: { taskType, defaultModelId: policy.defaultModelId, allowUserOverride: policy.allowUserOverride },
    });
    return policy;
  }

  resolveWorkspaceModel(
    workspaceId: string,
    taskType: AITaskType,
    modelOverrideId?: string | null
  ): ResolvedModelRoute {
    const providers = Array.from(this.state.aiProviders.values()).filter(
      (p) => p.workspaceId === workspaceId
    );
    const models = Array.from(this.state.aiModels.values()).filter(
      (m) => m.workspaceId === workspaceId
    );
    const policy = this.state.aiTaskPolicies.get(`${workspaceId}:${taskType}`) ?? null;
    return resolveModelForTask({
      taskType,
      providers,
      models,
      policy,
      modelOverrideId,
    });
  }

  async enqueueJob(
    actor: ActorContext,
    projectId: string,
    params: {
      jobType: JobType;
      taskType?: AITaskType;
      modelOverrideId?: string;
      inputPayload: Record<string, unknown>;
      idempotencyKey?: string;
      buildEnvelope: (jobId: string, workspaceId: string, idempotencyKey: string) => JobEnvelope;
    }
  ): Promise<{ job: AIJob; deduplicated: boolean }> {
    const { project } = this.requireProjectAccess(actor, projectId, "project:contribute");
    const idempotencyKey =
      params.idempotencyKey ?? `${params.jobType}:${projectId}:${crypto.randomUUID()}`;

    // JOB-02: Workspace-scoped idempotency prevents duplicate execution
    for (const existing of this.state.aiJobs.values()) {
      if (existing.workspaceId === project.workspaceId && existing.idempotencyKey === idempotencyKey) {
        return { job: existing, deduplicated: true };
      }
    }

    // Resolve and validate model compatibility BEFORE enqueueing AI jobs (MODEL-01, MODEL-02)
    let resolvedProviderId: string | null = null;
    let resolvedModelId: string | null = null;
    let wasUserOverride = false;

    const needsModel = params.jobType !== "export.generate" && params.jobType !== "usage.reconcile";
    if (needsModel && params.taskType) {
      const route = this.resolveWorkspaceModel(
        project.workspaceId,
        params.taskType,
        params.modelOverrideId
      );
      resolvedProviderId = route.provider.id;
      resolvedModelId = route.primary.modelId;
      wasUserOverride = route.wasUserOverride;
    }

    const now = new Date().toISOString();
    const jobId = crypto.randomUUID();
    const job: AIJob = {
      id: jobId,
      workspaceId: project.workspaceId,
      projectId,
      jobType: params.jobType,
      taskType: params.taskType ?? null,
      status: "queued",
      resolvedProviderId,
      resolvedModelId,
      wasUserOverride,
      inputPayload: params.inputPayload,
      resultPayload: null,
      idempotencyKey,
      attemptCount: 0,
      maxAttempts: Number(process.env.AI_MAX_RETRIES || 3),
      requestedBy: actor.userId,
      events: [
        {
          id: crypto.randomUUID(),
          jobId,
          eventType: "queued",
          message: resolvedModelId
            ? `Job queued with model ${resolvedModelId}${wasUserOverride ? " (task override)" : " (workspace default)"}`
            : "Job queued for worker execution",
          progressPct: 0,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.state.aiJobs.set(jobId, job);
    const envelope = params.buildEnvelope(jobId, project.workspaceId, idempotencyKey);
    await this.queue.enqueue(envelope);
    return { job, deduplicated: false };
  }

  getAIJob(actor: ActorContext, jobId: string): AIJob {
    const job = this.state.aiJobs.get(jobId);
    if (!job) throw new NotFoundError("AIJob", jobId);
    this.requireProjectAccess(actor, job.projectId, "project:read");
    return job;
  }

  listAIJobs(actor: ActorContext, projectId: string): AIJob[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.aiJobs.values())
      .filter((j) => j.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  cancelAIJob(actor: ActorContext, jobId: string): AIJob {
    const job = this.state.aiJobs.get(jobId);
    if (!job) throw new NotFoundError("AIJob", jobId);
    const { role } = this.requireProjectAccess(actor, job.projectId, "project:read");
    if (job.requestedBy !== actor.userId && !hasPermission(role, "project:manage")) {
      throw new ForbiddenError("Only the job requester or a project manager can cancel this job.");
    }
    if (job.status === "succeeded" || job.status === "failed") {
      throw new ConflictError(`Job in terminal state "${job.status}" cannot be cancelled.`);
    }
    const now = new Date().toISOString();
    const updated: AIJob = {
      ...job,
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      events: [
        ...(job.events ?? []),
        {
          id: crypto.randomUUID(),
          jobId,
          eventType: "cancelled",
          message: `Cancellation requested by ${actor.fullName}`,
          createdAt: now,
        },
      ],
    };
    this.state.aiJobs.set(jobId, updated);
    return updated;
  }

  getAIUsageSummary(actor: ActorContext, workspaceId: string): {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEstimatedCostUsd: number;
    byModel: Array<{ modelId: string; requests: number; tokens: number; costUsd: number }>;
    byTask: Array<{ taskType: string; requests: number; tokens: number; costUsd: number }>;
    records: AIUsageRecord[];
  } {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:read");
    const role = this.getWorkspaceRole(actor, workspaceId);
    const canSeeAll = hasPermission(role, "workspace:view_ai_usage");
    const records = Array.from(this.state.aiUsageRecords.values())
      .filter((r) => r.workspaceId === workspaceId && (canSeeAll || r.actorUserId === actor.userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const modelMap = new Map<string, { modelId: string; requests: number; tokens: number; costUsd: number }>();
    const taskMap = new Map<string, { taskType: string; requests: number; tokens: number; costUsd: number }>();

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalEstimatedCostUsd = 0;

    for (const rec of records) {
      totalInputTokens += rec.inputTokens;
      totalOutputTokens += rec.outputTokens;
      totalEstimatedCostUsd += rec.estimatedCostUsd;

      const m = modelMap.get(rec.modelId) ?? { modelId: rec.modelId, requests: 0, tokens: 0, costUsd: 0 };
      m.requests += 1;
      m.tokens += rec.inputTokens + rec.outputTokens;
      m.costUsd = Number((m.costUsd + rec.estimatedCostUsd).toFixed(6));
      modelMap.set(rec.modelId, m);

      const t = taskMap.get(rec.taskType) ?? { taskType: rec.taskType, requests: 0, tokens: 0, costUsd: 0 };
      t.requests += 1;
      t.tokens += rec.inputTokens + rec.outputTokens;
      t.costUsd = Number((t.costUsd + rec.estimatedCostUsd).toFixed(6));
      taskMap.set(rec.taskType, t);
    }

    return {
      totalRequests: records.length,
      totalInputTokens,
      totalOutputTokens,
      totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
      byModel: Array.from(modelMap.values()),
      byTask: Array.from(taskMap.values()),
      records,
    };
  }

  listAuditLogs(actor: ActorContext, workspaceId: string, projectId?: string): AuditLog[] {
    this.requireWorkspacePermission(actor, workspaceId, "workspace:read");
    const role = this.getWorkspaceRole(actor, workspaceId);
    const isAdmin = hasPermission(role, "workspace:view_audit");
    return this.state.auditLogs.filter(
      (log) =>
        log.workspaceId === workspaceId &&
        (!projectId || log.projectId === projectId) &&
        (isAdmin || log.actorUserId === actor.userId || Boolean(projectId))
    );
  }

  // ---------------------------------------------------------------------------
  // Exports (P10-03)
  // ---------------------------------------------------------------------------

  listExports(actor: ActorContext, projectId: string): ExportFile[] {
    this.requireProjectAccess(actor, projectId, "project:read");
    return Array.from(this.state.exportFiles.values())
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getExport(actor: ActorContext, exportId: string): ExportFile & { signedDownloadUrl?: string } {
    const exp = this.state.exportFiles.get(exportId);
    if (!exp) throw new NotFoundError("ExportFile", exportId);
    this.requireProjectAccess(actor, exp.projectId, "project:read");
    return {
      ...exp,
      signedDownloadUrl:
        exp.status === "succeeded" ? `/api/exports/${exp.id}/download` : undefined,
    };
  }

  async createExportJob(
    actor: ActorContext,
    projectId: string,
    input: { format: ExportFormat; artifactRevisionIds: string[]; includeTraceability: boolean; idempotencyKey?: string }
  ): Promise<{ exportFile: ExportFile; job: AIJob }> {
    const { project } = this.requireProjectAccess(actor, projectId, "project:export");
    const exportId = crypto.randomUUID();
    const now = new Date().toISOString();
    const extMap: Record<ExportFormat, { ext: string; mime: string }> = {
      pdf: { ext: "pdf", mime: "application/pdf" },
      docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      markdown: { ext: "md", mime: "text/markdown" },
      json: { ext: "json", mime: "application/json" },
      sql: { ext: "sql", mime: "application/sql" },
      openapi: { ext: "yaml", mime: "application/yaml" },
    };
    const meta = extMap[input.format];
    const fileName = `${project.slug}-blueprint.${meta.ext}`;

    // Verify all requested artifact revisions belong to this project
    for (const revId of input.artifactRevisionIds) {
      const rev = this.state.artifactRevisions.get(revId);
      if (!rev || rev.projectId !== projectId) {
        throw new ValidationError(`Artifact revision (${revId}) does not belong to project ${projectId}.`);
      }
    }

    const exportFile: ExportFile = {
      id: exportId,
      workspaceId: project.workspaceId,
      projectId,
      format: input.format,
      artifactRevisionIds: input.artifactRevisionIds,
      fileName,
      mimeType: meta.mime,
      storageBucket: process.env.STORAGE_BUCKET_EXPORTS || "exports",
      storagePath: `${project.workspaceId}/${projectId}/${exportId}-${fileName}`,
      status: "queued",
      requestedBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.exportFiles.set(exportId, exportFile);

    const { job } = await this.enqueueJob(actor, projectId, {
      jobType: "export.generate",
      taskType: "export_rendering",
      inputPayload: { exportId, ...input },
      idempotencyKey: input.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId,
        requestedBy: actor.userId,
        idempotencyKey,
        jobType: "export.generate",
        taskType: "export_rendering",
        exportId,
        format: input.format,
        artifactRevisionIds: input.artifactRevisionIds,
        includeTraceability: input.includeTraceability,
      }),
    });

    exportFile.jobId = job.id;
    this.state.exportFiles.set(exportId, exportFile);
    return { exportFile, job };
  }
}

// Singleton shared across Next.js server routes during development/preview
const globalForRepo = globalThis as unknown as { __blueprintRepo?: BlueprintRepository };

export function getBlueprintRepository(): BlueprintRepository {
  if (!globalForRepo.__blueprintRepo) {
    globalForRepo.__blueprintRepo = new BlueprintRepository();
  }
  return globalForRepo.__blueprintRepo;
}
