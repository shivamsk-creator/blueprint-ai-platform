"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { WorkspaceInvitation, WorkspaceMember } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  Select,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function TeamMembersSettingsPage() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "contributor" | "reviewer">("contributor");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const session = await apiFetch<{ activeWorkspaceId: string }>("/api/auth/session");
      setWorkspaceId(session.activeWorkspaceId);
      const res = await apiFetch<{ members: WorkspaceMember[]; invitations: WorkspaceInvitation[] }>(
        `/api/workspaces/${session.activeWorkspaceId}/members`
      );
      setMembers(res.members);
      setInvitations(res.invitations);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleInvite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setInviting(true);
    setFeedback(null);
    try {
      const { invitation } = await apiFetch<{ invitation: WorkspaceInvitation }>(
        `/api/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        }
      );
      setInvitations((prev) => [invitation, ...prev]);
      setEmail("");
      setFeedback({ tone: "success", message: `Invitation issued to ${invitation.email} (${invitation.role}).` });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Invite failed." });
    } finally {
      setInviting(false);
    }
  };

  if (error) return <ErrorState title="Admin Access Required" message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Team & Role Management</h1>
        <p className="text-sm text-[#64748b]">
          Enforce workspace RBAC across Owner, Admin, Manager, Contributor, and Reviewer roles.
        </p>
      </div>
      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Invite Member" subtitle="Tokens are SHA-256 hashed at rest and expire in 7 days." />
        <CardBody>
          <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <FieldLabel htmlFor="invite-email" required>Email Address</FieldLabel>
              <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <div className="sm:col-span-3">
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                <option value="contributor">Contributor</option>
                <option value="reviewer">Reviewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-3">
              <Button type="submit" loading={inviting} className="w-full">Send Invitation</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={members}
        getRowKey={(m) => m.id}
        columns={[
          { key: "name", header: "Member", render: (m) => <span className="font-medium">{m.fullName || m.userId}</span> },
          { key: "email", header: "Email", render: (m) => <span className="font-mono text-xs text-[#475569]">{m.email}</span> },
          { key: "role", header: "Workspace Role", render: (m) => <StatusBadge status="active" label={m.role} tone="info" /> },
        ]}
      />

      {invitations.length > 0 && (
        <Card>
          <CardHeader title="Pending Invitations" />
          <CardBody>
            <ul className="divide-y divide-[#eef2f7] text-xs">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2.5">
                  <span className="font-mono">{inv.email}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="proposed" label={inv.role} />
                    <span className="text-[#64748b]">Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
