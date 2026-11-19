"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, FeedbackBanner, FieldLabel, Input, Textarea } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { workspace } = await apiFetch<{ workspace: { id: string } }>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      await apiFetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-8">
      <Card>
        <CardHeader
          title="Workspace Onboarding"
          subtitle="Create a dedicated tenant boundary for your team's projects, AI providers, and audit trails."
        />
        <CardBody className="space-y-4">
          {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel htmlFor="ws-name" required>Workspace Name</FieldLabel>
              <Input
                id="ws-name"
                required
                placeholder="e.g., Acme Platform Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="ws-desc">Workspace Purpose</FieldLabel>
              <Textarea
                id="ws-desc"
                rows={3}
                placeholder="Describe your product portfolio or governance scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Create Workspace & Continue
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
