"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Workspace } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, ErrorState, FeedbackBanner, FieldLabel, Input, SkeletonBlock, Textarea } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function GeneralSettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const session = await apiFetch<{ activeWorkspaceId: string }>("/api/auth/session");
      const { workspace: ws } = await apiFetch<{ workspace: Workspace }>(`/api/workspaces/${session.activeWorkspaceId}`);
      setWorkspace(ws);
      setName(ws.name);
      setDescription(ws.description ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load workspace settings.");
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

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!workspace) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { workspace: updated } = await apiFetch<{ workspace: Workspace }>(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      });
      setWorkspace(updated);
      setFeedback({ tone: "success", message: "Workspace settings saved and audited." });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonBlock className="h-56 w-full" />;
  if (error || !workspace) return <ErrorState message={error ?? "Workspace not found."} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Workspace General Settings</h1>
        <p className="text-sm text-[#64748b]">Configure tenant identity and governance defaults (Owner/Admin only).</p>
      </div>
      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}
      <Card>
        <CardHeader title={workspace.name} subtitle={`Tenant Slug: ${workspace.slug} · ID: ${workspace.id}`} />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <FieldLabel htmlFor="ws-general-name" required>Workspace Name</FieldLabel>
              <Input id="ws-general-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <FieldLabel htmlFor="ws-general-desc">Description</FieldLabel>
              <Textarea id="ws-general-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
