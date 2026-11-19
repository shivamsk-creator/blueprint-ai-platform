import type {
  ApiEndpoint,
  Artifact,
  DbEntity,
  DbRelationship,
  DevelopmentTask,
  Feature,
  Requirement,
  ScreenSpec,
  TestCase,
  TraceabilityLink,
  ValidationIssue,
} from "./entities";
import type { EntityType, ValidationSeverity } from "./enums";

export interface SectionDiffItem {
  sectionKey: string;
  heading: string;
  status: "added" | "removed" | "modified" | "unchanged";
  beforeMarkdown: string;
  afterMarkdown: string;
  addedLines: number;
  removedLines: number;
}

export interface RevisionDiffResult {
  baseRevisionId: string | null;
  targetRevisionId: string;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  sections: SectionDiffItem[];
}

export function computeRevisionDiff(
  baseRevisionId: string | null,
  targetRevisionId: string,
  baseSections: ReadonlyArray<{ sectionKey: string; heading: string; bodyMarkdown: string }>,
  targetSections: ReadonlyArray<{ sectionKey: string; heading: string; bodyMarkdown: string }>
): RevisionDiffResult {
  const baseMap = new Map(baseSections.map((s) => [s.sectionKey, s]));
  const targetMap = new Map(targetSections.map((s) => [s.sectionKey, s]));
  const allKeys = Array.from(new Set([...baseMap.keys(), ...targetMap.keys()]));

  const sections: SectionDiffItem[] = [];
  const summary = { added: 0, removed: 0, modified: 0, unchanged: 0 };

  for (const key of allKeys) {
    const before = baseMap.get(key);
    const after = targetMap.get(key);
    const beforeLines = before ? before.bodyMarkdown.split("\n") : [];
    const afterLines = after ? after.bodyMarkdown.split("\n") : [];

    if (!before && after) {
      summary.added += 1;
      sections.push({
        sectionKey: key,
        heading: after.heading,
        status: "added",
        beforeMarkdown: "",
        afterMarkdown: after.bodyMarkdown,
        addedLines: afterLines.length,
        removedLines: 0,
      });
    } else if (before && !after) {
      summary.removed += 1;
      sections.push({
        sectionKey: key,
        heading: before.heading,
        status: "removed",
        beforeMarkdown: before.bodyMarkdown,
        afterMarkdown: "",
        addedLines: 0,
        removedLines: beforeLines.length,
      });
    } else if (before && after) {
      const changed = before.bodyMarkdown !== after.bodyMarkdown || before.heading !== after.heading;
      if (!changed) {
        summary.unchanged += 1;
        sections.push({
          sectionKey: key,
          heading: after.heading,
          status: "unchanged",
          beforeMarkdown: before.bodyMarkdown,
          afterMarkdown: after.bodyMarkdown,
          addedLines: 0,
          removedLines: 0,
        });
      } else {
        summary.modified += 1;
        const beforeSet = new Set(beforeLines);
        const afterSet = new Set(afterLines);
        const addedLines = afterLines.filter((line) => !beforeSet.has(line)).length;
        const removedLines = beforeLines.filter((line) => !afterSet.has(line)).length;
        sections.push({
          sectionKey: key,
          heading: after.heading,
          status: "modified",
          beforeMarkdown: before.bodyMarkdown,
          afterMarkdown: after.bodyMarkdown,
          addedLines,
          removedLines,
        });
      }
    }
  }

  return { baseRevisionId, targetRevisionId, summary, sections };
}

export interface TraceabilityRow {
  requirementId: string;
  requirementKey: string;
  requirementTitle: string;
  requirementStatus: Requirement["status"];
  priority: Requirement["priority"];
  linkedFeatures: Array<{ id: string; key: string; name: string }>;
  linkedScreens: Array<{ id: string; key: string; name: string }>;
  linkedApiEndpoints: Array<{ id: string; key: string; path: string }>;
  linkedTasks: Array<{ id: string; key: string; title: string }>;
  linkedTests: Array<{ id: string; key: string; title: string; status: TestCase["status"] }>;
  coverageGaps: string[];
  coveragePct: number;
}

export interface TraceabilityMatrixReport {
  totalRequirements: number;
  confirmedRequirements: number;
  requirementsWithFeatures: number;
  requirementsWithTasks: number;
  requirementsWithTests: number;
  overallCoveragePct: number;
  rows: TraceabilityRow[];
}

export function computeTraceabilityMatrix(input: {
  requirements: Requirement[];
  features: Feature[];
  screens: ScreenSpec[];
  apiEndpoints: ApiEndpoint[];
  tasks: DevelopmentTask[];
  testCases: TestCase[];
  links: TraceabilityLink[];
}): TraceabilityMatrixReport {
  const featureById = new Map(input.features.map((f) => [f.id, f]));
  const screenById = new Map(input.screens.map((s) => [s.id, s]));
  const apiById = new Map(input.apiEndpoints.map((a) => [a.id, a]));
  const taskById = new Map(input.tasks.map((t) => [t.id, t]));
  const testById = new Map(input.testCases.map((tc) => [tc.id, tc]));

  // Build undirected adjacency per entity to support direct and 2-hop (Req -> Feature -> Task/Test) coverage
  const adjacency = new Map<string, Set<string>>();
  const keyOf = (type: EntityType, id: string): string => `${type}:${id}`;
  const connect = (a: string, b: string): void => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for (const link of input.links) {
    connect(keyOf(link.sourceType, link.sourceId), keyOf(link.targetType, link.targetId));
  }

  let requirementsWithFeatures = 0;
  let requirementsWithTasks = 0;
  let requirementsWithTests = 0;

  const rows: TraceabilityRow[] = input.requirements.map((req) => {
    const startKey = keyOf("requirement", req.id);
    const reachable = new Set<string>();
    const queue: Array<{ node: string; depth: number }> = [{ node: startKey, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= 2) continue;
      const neighbors = adjacency.get(current.node);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (n !== startKey && !reachable.has(n)) {
          reachable.add(n);
          queue.push({ node: n, depth: current.depth + 1 });
        }
      }
    }

    const linkedFeatures: TraceabilityRow["linkedFeatures"] = [];
    const linkedScreens: TraceabilityRow["linkedScreens"] = [];
    const linkedApiEndpoints: TraceabilityRow["linkedApiEndpoints"] = [];
    const linkedTasks: TraceabilityRow["linkedTasks"] = [];
    const linkedTests: TraceabilityRow["linkedTests"] = [];

    for (const node of reachable) {
      const [type, id] = node.split(":") as [EntityType, string];
      if (type === "feature" && featureById.has(id)) {
        const f = featureById.get(id)!;
        linkedFeatures.push({ id: f.id, key: f.featureKey, name: f.name });
      } else if (type === "screen" && screenById.has(id)) {
        const s = screenById.get(id)!;
        linkedScreens.push({ id: s.id, key: s.screenKey, name: s.name });
      } else if (type === "api_endpoint" && apiById.has(id)) {
        const a = apiById.get(id)!;
        linkedApiEndpoints.push({ id: a.id, key: a.endpointKey, path: `${a.method} ${a.path}` });
      } else if (type === "development_task" && taskById.has(id)) {
        const t = taskById.get(id)!;
        linkedTasks.push({ id: t.id, key: t.taskKey, title: t.title });
      } else if (type === "test_case" && testById.has(id)) {
        const tc = testById.get(id)!;
        linkedTests.push({ id: tc.id, key: tc.testKey, title: tc.title, status: tc.status });
      }
    }

    if (linkedFeatures.length > 0) requirementsWithFeatures += 1;
    if (linkedTasks.length > 0) requirementsWithTasks += 1;
    if (linkedTests.length > 0) requirementsWithTests += 1;

    const coverageGaps: string[] = [];
    if (linkedFeatures.length === 0) coverageGaps.push("Missing MVP feature link");
    if (linkedTasks.length === 0) coverageGaps.push("Missing development task link");
    if (linkedTests.length === 0) coverageGaps.push("Missing QA test case link");

    const dimensionsHit =
      (linkedFeatures.length > 0 ? 1 : 0) +
      (linkedTasks.length > 0 ? 1 : 0) +
      (linkedTests.length > 0 ? 1 : 0);

    return {
      requirementId: req.id,
      requirementKey: req.requirementKey,
      requirementTitle: req.title,
      requirementStatus: req.status,
      priority: req.priority,
      linkedFeatures,
      linkedScreens,
      linkedApiEndpoints,
      linkedTasks,
      linkedTests,
      coverageGaps,
      coveragePct: Math.round((dimensionsHit / 3) * 100),
    };
  });

  const activeReqs = input.requirements.filter((r) => r.status !== "rejected");
  const totalPct =
    activeReqs.length === 0
      ? 0
      : Math.round(
          rows
            .filter((r) => r.requirementStatus !== "rejected")
            .reduce((acc, r) => acc + r.coveragePct, 0) / activeReqs.length
        );

  return {
    totalRequirements: input.requirements.length,
    confirmedRequirements: input.requirements.filter((r) => r.status === "confirmed").length,
    requirementsWithFeatures,
    requirementsWithTasks,
    requirementsWithTests,
    overallCoveragePct: totalPct,
    rows,
  };
}

export interface DeterministicIssueCandidate {
  ruleCode: string;
  severity: ValidationSeverity;
  title: string;
  description: string;
  recommendation: string;
  entityType?: EntityType;
  entityId?: string;
}

export function runDeterministicValidation(input: {
  requirements: Requirement[];
  artifacts: Artifact[];
  features: Feature[];
  screens: ScreenSpec[];
  dbEntities: DbEntity[];
  apiEndpoints: ApiEndpoint[];
  tasks: DevelopmentTask[];
  testCases: TestCase[];
  links: TraceabilityLink[];
}): DeterministicIssueCandidate[] {
  const issues: DeterministicIssueCandidate[] = [];
  const matrix = computeTraceabilityMatrix({
    requirements: input.requirements,
    features: input.features,
    screens: input.screens,
    apiEndpoints: input.apiEndpoints,
    tasks: input.tasks,
    testCases: input.testCases,
    links: input.links,
  });

  if (input.requirements.filter((r) => r.status === "confirmed").length === 0) {
    issues.push({
      ruleCode: "REQ_NONE_CONFIRMED",
      severity: "blocker",
      title: "No confirmed requirements",
      description: "At least one confirmed requirement is required before locking BRD/PRD and technical blueprints.",
      recommendation: "Review proposed requirements in the Knowledge Repository and mark validated ones as confirmed.",
    });
  }

  for (const row of matrix.rows) {
    if (row.requirementStatus === "confirmed") {
      if (row.linkedTests.length === 0) {
        issues.push({
          ruleCode: "TRACE_REQ_NO_TEST",
          severity: row.priority === "critical" ? "blocker" : "high",
          title: `${row.requirementKey} lacks QA test coverage`,
          description: `Confirmed requirement "${row.requirementTitle}" has no linked verification test case.`,
          recommendation: "Create or link at least one QA test case verifying this requirement's acceptance criteria.",
          entityType: "requirement",
          entityId: row.requirementId,
        });
      }
      if (row.linkedTasks.length === 0) {
        issues.push({
          ruleCode: "TRACE_REQ_NO_TASK",
          severity: "medium",
          title: `${row.requirementKey} lacks a development task`,
          description: `Confirmed requirement "${row.requirementTitle}" is not mapped to any implementation task.`,
          recommendation: "Add a development task and link it via the Traceability Matrix.",
          entityType: "requirement",
          entityId: row.requirementId,
        });
      }
    }
  }

  for (const entity of input.dbEntities) {
    if (!entity.rlsEnabled) {
      issues.push({
        ruleCode: "DB_RLS_DISABLED",
        severity: "blocker",
        title: `RLS disabled on table "${entity.tableName}"`,
        description: `Proposed database table "${entity.schemaName}.${entity.tableName}" does not have Row-Level Security enabled.`,
        recommendation: "Enable RLS on all tenant-owned tables before generating SQL migrations.",
        entityType: "db_entity",
        entityId: entity.id,
      });
    }
    const hasPk = entity.attributes.some((a) => a.isPrimaryKey);
    if (!hasPk) {
      issues.push({
        ruleCode: "DB_NO_PK",
        severity: "high",
        title: `Table "${entity.tableName}" has no primary key`,
        description: "Every relational entity must define an explicit primary key column.",
        recommendation: "Add a UUID primary key column (id) to the table definition.",
        entityType: "db_entity",
        entityId: entity.id,
      });
    }
  }

  for (const artifact of input.artifacts) {
    if (artifact.needsReview) {
      issues.push({
        ruleCode: "ARTIFACT_STALE_REVIEW",
        severity: "high",
        title: `${artifact.title} flagged for impact review`,
        description: "Upstream requirements or decisions changed after the latest revision of this artifact.",
        recommendation: "Review change impacts, regenerate or update affected sections, and re-approve.",
        entityType: "artifact",
        entityId: artifact.id,
      });
    }
  }

  for (const endpoint of input.apiEndpoints) {
    if (!endpoint.authPolicy || endpoint.authPolicy.trim() === "") {
      issues.push({
        ruleCode: "API_MISSING_AUTH_POLICY",
        severity: "high",
        title: `Endpoint ${endpoint.method} ${endpoint.path} missing authorization policy`,
        description: "Every API endpoint must declare an explicit authentication/authorization contract.",
        recommendation: "Specify the required role or public policy in the API Designer.",
        entityType: "api_endpoint",
        entityId: endpoint.id,
      });
    }
  }

  return issues;
}

export function analyzeChangeImpact(input: {
  sourceEntityType: EntityType;
  sourceEntityId: string;
  links: TraceabilityLink[];
}): Array<{ affectedEntityType: EntityType; affectedEntityId: string; impactSeverity: "blocker" | "high" | "medium" | "low"; rationale: string }> {
  const visited = new Set<string>([`${input.sourceEntityType}:${input.sourceEntityId}`]);
  const queue: Array<{ type: EntityType; id: string; depth: number }> = [
    { type: input.sourceEntityType, id: input.sourceEntityId, depth: 0 },
  ];
  const results: Array<{
    affectedEntityType: EntityType;
    affectedEntityId: string;
    impactSeverity: "blocker" | "high" | "medium" | "low";
    rationale: string;
  }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= 3) continue;

    for (const link of input.links) {
      let nextType: EntityType | null = null;
      let nextId: string | null = null;
      if (link.sourceType === current.type && link.sourceId === current.id) {
        nextType = link.targetType;
        nextId = link.targetId;
      } else if (link.targetType === current.type && link.targetId === current.id) {
        nextType = link.sourceType;
        nextId = link.sourceId;
      }

      if (nextType && nextId) {
        const key = `${nextType}:${nextId}`;
        if (!visited.has(key)) {
          visited.add(key);
          const nextDepth = current.depth + 1;
          results.push({
            affectedEntityType: nextType,
            affectedEntityId: nextId,
            impactSeverity: nextDepth === 1 ? "high" : nextDepth === 2 ? "medium" : "low",
            rationale:
              nextDepth === 1
                ? `Directly linked (${link.relationType}) to modified ${input.sourceEntityType}.`
                : `Transitively impacted (${nextDepth} hops via ${link.relationType}).`,
          });
          queue.push({ type: nextType, id: nextId, depth: nextDepth });
        }
      }
    }
  }

  return results;
}

export function generateSqlMigrationDraft(
  entities: DbEntity[],
  relationships: DbRelationship[]
): string {
  const lines: string[] = [
    "-- Auto-generated PostgreSQL migration draft from Blueprint AI Database Designer",
    "-- Review constraints, indexes, and RLS policies prior to production execution.",
    "",
  ];

  const entityById = new Map(entities.map((e) => [e.id, e]));

  for (const entity of entities) {
    const schema = entity.schemaName || "public";
    lines.push(`CREATE TABLE IF NOT EXISTS ${schema}.${entity.tableName} (`);
    const colLines = [...entity.attributes]
      .sort((a, b) => a.ordinalPosition - b.ordinalPosition)
      .map((attr) => {
        const parts = [`  ${attr.columnName}`, attr.dataType];
        if (attr.isPrimaryKey) parts.push("PRIMARY KEY");
        if (!attr.isNullable && !attr.isPrimaryKey) parts.push("NOT NULL");
        if (attr.isUnique && !attr.isPrimaryKey) parts.push("UNIQUE");
        if (attr.defaultValue) parts.push(`DEFAULT ${attr.defaultValue}`);
        return parts.join(" ");
      });
    lines.push(colLines.join(",\n"));
    lines.push(");");
    if (entity.rlsEnabled) {
      lines.push(`ALTER TABLE ${schema}.${entity.tableName} ENABLE ROW LEVEL SECURITY;`);
    }
    lines.push("");
  }

  for (const rel of relationships) {
    const src = entityById.get(rel.sourceEntityId);
    const tgt = entityById.get(rel.targetEntityId);
    if (!src || !tgt) continue;
    const fkName = `fk_${src.tableName}_${rel.sourceColumn}_${tgt.tableName}`;
    lines.push(
      `ALTER TABLE ${src.schemaName || "public"}.${src.tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${rel.sourceColumn}) REFERENCES ${tgt.schemaName || "public"}.${tgt.tableName}(${rel.targetColumn}) ON DELETE ${rel.onDelete};`
    );
    lines.push(
      `CREATE INDEX IF NOT EXISTS idx_${src.tableName}_${rel.sourceColumn} ON ${src.schemaName || "public"}.${src.tableName}(${rel.sourceColumn});`
    );
  }

  return lines.join("\n").trim() + "\n";
}

export function generateOpenApiSpec(
  project: { name: string; description: string; slug: string },
  endpoints: ApiEndpoint[]
): { spec: Record<string, unknown>; validationErrors: string[] } {
  const validationErrors: string[] = [];
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of endpoints) {
    if (!ep.path.startsWith("/")) {
      validationErrors.push(`Endpoint ${ep.endpointKey} path "${ep.path}" must start with "/".`);
      continue;
    }
    const methodLower = ep.method.toLowerCase();
    if (!paths[ep.path]) paths[ep.path] = {};
    if (paths[ep.path]![methodLower]) {
      validationErrors.push(`Duplicate endpoint ${ep.method} ${ep.path}.`);
    }
    const responses: Record<string, unknown> = {};
    for (const code of ep.statusCodes.length > 0 ? ep.statusCodes : [200]) {
      responses[String(code)] = {
        description: code >= 400 ? "RFC 7807 Problem Details error response" : "Successful response",
        content: {
          "application/json": {
            schema: code >= 400 ? { $ref: "#/components/schemas/ProblemDetails" } : ep.responseSchema,
          },
        },
      };
    }

    const op: Record<string, unknown> = {
      operationId: ep.endpointKey.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      summary: ep.summary,
      description: ep.description,
      tags: ep.tags.length > 0 ? ep.tags : ["default"],
      "x-auth-policy": ep.authPolicy,
      responses,
    };

    if (["post", "put", "patch"].includes(methodLower) && Object.keys(ep.requestSchema).length > 0) {
      op.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: ep.requestSchema,
          },
        },
      };
    }

    paths[ep.path]![methodLower] = op;
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${project.name} API`,
      version: "1.0.0",
      description: project.description || "Generated by Blueprint AI API Designer",
    },
    servers: [{ url: "/api", description: "Application API Base" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ProblemDetails: {
          type: "object",
          required: ["type", "title", "status", "detail", "requestId"],
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            instance: { type: "string" },
            requestId: { type: "string" },
          },
        },
      },
    },
  };

  return { spec, validationErrors };
}

export function summarizeValidationIssues(issues: ReadonlyArray<Pick<ValidationIssue, "severity">>): {
  blockerCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
} {
  return {
    blockerCount: issues.filter((i) => i.severity === "blocker").length,
    highCount: issues.filter((i) => i.severity === "high").length,
    mediumCount: issues.filter((i) => i.severity === "medium").length,
    lowCount: issues.filter((i) => i.severity === "low" || i.severity === "info").length,
  };
}
