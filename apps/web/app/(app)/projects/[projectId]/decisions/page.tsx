"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Decision } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  SkeletonBlock,
  StatusBadge,
  Textarea,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function DecisionRegisterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decisionStatement, setDecisionStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ decisions: Decision[] }>(`/api/projects/${projectId}/decisions`);
      setDecisions(res.decisions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load decisions.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { decision } = await apiFetch<{ decision: Decision }>(`/api/projects/${projectId}/decisions`, {
      method: "POST",
      body: JSON.stringify({ title, context, decisionStatement, rationale, alternatives: [], status: "accepted" }),
    });
    setDecisions((prev) => [decision, ...prev]);
    setTitle("");
    setContext("");
    setDecisionStatement("");
    setRationale("");
    setFeedback(`Recorded ${decision.decisionKey}.`);
  };

  if (loading) return <SkeletonBlock className="h-72 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Decision Register</h1>
        <p className="text-sm text-[#64748b]">Immutable record of product and engineering decisions with rationale and alternatives considered.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Log Decision" />
        <CardBody>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="dec-title" required>Decision Title</FieldLabel>
              <Input id="dec-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="dec-context" required>Context</FieldLabel>
              <Textarea id="dec-context" rows={2} required value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="dec-stmt" required>Decision Statement</FieldLabel>
              <Textarea id="dec-stmt" rows={2} required value={decisionStatement} onChange={(e) => setDecisionStatement(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="dec-rat" required>Rationale</FieldLabel>
              <Textarea id="dec-rat" rows={2} required value={rationale} onChange={(e) => setRationale(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Record Decision</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {decisions.length === 0 ? (
        <EmptyState title="No decisions logged yet" description="Record architectural or product trade-offs above." />
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <Card key={d.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[#1d4ed8]">{d.decisionKey}</span>
                    <span>{d.title}</span>
                  </span>
                }
                action={<StatusBadge status={d.status} />}
              />
              <CardBody className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                <div><div className="font-semibold text-[#64748b]">Context</div><p className="mt-1 text-[#0f172a]">{d.context}</p></div>
                <div><div className="font-semibold text-[#64748b]">Decision</div><p className="mt-1 text-[#0f172a]">{d.decisionStatement}</p></div>
                <div><div className="font-semibold text-[#64748b]">Rationale</div><p className="mt-1 text-[#0f172a]">{d.rationale}</p></div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
