import type { WorkspaceRole } from "./enums";

export type PermissionAction =
  | "workspace:read"
  | "workspace:update"
  | "workspace:manage_members"
  | "workspace:invite"
  | "workspace:manage_ai_providers"
  | "workspace:manage_ai_policies"
  | "workspace:view_ai_usage"
  | "workspace:view_audit"
  | "project:read"
  | "project:create"
  | "project:manage"
  | "project:contribute"
  | "project:approve"
  | "project:manage_changes"
  | "project:export";

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<PermissionAction>> = {
  owner: new Set<PermissionAction>([
    "workspace:read",
    "workspace:update",
    "workspace:manage_members",
    "workspace:invite",
    "workspace:manage_ai_providers",
    "workspace:manage_ai_policies",
    "workspace:view_ai_usage",
    "workspace:view_audit",
    "project:read",
    "project:create",
    "project:manage",
    "project:contribute",
    "project:approve",
    "project:manage_changes",
    "project:export",
  ]),
  admin: new Set<PermissionAction>([
    "workspace:read",
    "workspace:update",
    "workspace:manage_members",
    "workspace:invite",
    "workspace:manage_ai_providers",
    "workspace:manage_ai_policies",
    "workspace:view_ai_usage",
    "workspace:view_audit",
    "project:read",
    "project:create",
    "project:manage",
    "project:contribute",
    "project:approve",
    "project:manage_changes",
    "project:export",
  ]),
  manager: new Set<PermissionAction>([
    "workspace:read",
    "project:read",
    "project:create",
    "project:manage",
    "project:contribute",
    "project:approve",
    "project:manage_changes",
    "project:export",
  ]),
  contributor: new Set<PermissionAction>([
    "workspace:read",
    "project:read",
    "project:create",
    "project:contribute",
    "project:export",
  ]),
  reviewer: new Set<PermissionAction>([
    "workspace:read",
    "project:read",
    "project:approve",
    "project:export",
  ]),
};

export function hasPermission(role: WorkspaceRole | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

export function isWorkspaceAdmin(role: WorkspaceRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canContribute(role: WorkspaceRole | null | undefined): boolean {
  return hasPermission(role, "project:contribute");
}

export function canApprove(role: WorkspaceRole | null | undefined): boolean {
  return hasPermission(role, "project:approve");
}

export function canManageProject(role: WorkspaceRole | null | undefined): boolean {
  return hasPermission(role, "project:manage");
}

export function getPermissionsForRole(role: WorkspaceRole): PermissionAction[] {
  return Array.from(ROLE_PERMISSIONS[role]);
}
