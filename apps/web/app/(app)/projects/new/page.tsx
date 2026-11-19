"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, FeedbackBanner, FieldLabel, Input, Textarea } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [restrictedAccess, setRestrictedAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { project } = await apiFetch<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, restrictedAccess }),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Create New Blueprint Project</h1>
        <p className="text-sm text-[#64748b]">
          Automatically provisions all 10 lifecycle stages and 9 versioned specification artifacts.
        </p>
      </div>

      <Card>
        <CardHeader title="Project Charter & Initial Brief" />
        <CardBody className="space-y-4">
          {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel htmlFor="proj-name" required>Project Name</FieldLabel>
              <Input
                id="proj-name"
                required
                placeholder="e.g., Clinical Trial Intake Portal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="proj-brief" required>Initial Problem Brief</FieldLabel>
              <Textarea
                id="proj-brief"
                rows={5}
                required
                placeholder="Describe target users, business goals, key workflows, security/regulatory constraints, and target MVP timeline..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#334155]">
              <input
                type="checkbox"
                checked={restrictedAccess}
                onChange={(e) => setRestrictedAccess(e.target.checked)}
                className="rounded border-[#c2cede]"
              />
              Restrict access to explicit project members only (workspace admins always retain governance access)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" loading={saving}>Create Project</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
