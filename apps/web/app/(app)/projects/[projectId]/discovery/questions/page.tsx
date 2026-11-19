"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ClarificationQuestion, DiscoverySession } from "@blueprint/domain";
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
  Select,
  SkeletonBlock,
  StatusBadge,
  Textarea,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ClarificationQuestionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("functional");
  const [newPriority, setNewPriority] = useState<"critical" | "high" | "medium" | "low">("high");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        apiFetch<{ questions: ClarificationQuestion[] }>(`/api/projects/${projectId}/discovery/questions`),
        apiFetch<{ sessions: DiscoverySession[] }>(`/api/projects/${projectId}/discovery/sessions`),
      ]);
      setQuestions(qRes.questions);
      setSessions(sRes.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load clarification questions.");
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

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const sessionId = sessions[0]?.id;
    if (!sessionId) return;
    const { question } = await apiFetch<{ question: ClarificationQuestion }>(
      `/api/projects/${projectId}/discovery/questions`,
      {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          category: newCategory,
          questionText: newQuestion,
          priority: newPriority,
        }),
      }
    );
    setQuestions((prev) => [...prev, question]);
    setNewQuestion("");
    setFeedback("Clarification question added.");
  };

  const handleRespond = async (qId: string, isDeferral: boolean): Promise<void> => {
    const text = (draftAnswers[qId] ?? "").trim();
    if (!text) return;
    const { question } = await apiFetch<{ question: ClarificationQuestion }>(
      `/api/discovery/questions/${qId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          answerText: text,
          isDeferral,
          deferralReason: isDeferral ? text : undefined,
          provenance: "stakeholder_interview",
        }),
      }
    );
    setQuestions((prev) => prev.map((q) => (q.id === qId ? question : q)));
    setDraftAnswers((prev) => ({ ...prev, [qId]: "" }));
    setFeedback(isDeferral ? "Question deferred with recorded rationale." : "Answer saved with provenance.");
  };

  if (loading) return <SkeletonBlock className="h-72 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Clarification Questions</h1>
        <p className="text-sm text-[#64748b]">
          Resolve product ambiguities with traceable stakeholder answers or explicit deferrals.
        </p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      {sessions.length > 0 && (
        <Card>
          <CardHeader title="Add Manual Clarification Question" />
          <CardBody>
            <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <FieldLabel htmlFor="q-text" required>Question</FieldLabel>
                <Input id="q-text" required value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Ask a specific scoping, compliance, or UX question..." />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="q-cat">Category</FieldLabel>
                <Input id="q-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="q-pri">Priority</FieldLabel>
                <Select id="q-pri" value={newPriority} onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div className="flex items-end md:col-span-2">
                <Button type="submit" className="w-full">Add</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {questions.length === 0 ? (
        <EmptyState
          title="No clarification questions yet"
          description="Run AI Discovery Analysis or add a manual question above."
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardHeader
                title={q.questionText}
                subtitle={`${q.category} · Source: ${q.source}${q.rationale ? ` · ${q.rationale}` : ""}`}
                action={
                  <div className="flex gap-2">
                    <StatusBadge status={q.priority} />
                    <StatusBadge status={q.status} />
                  </div>
                }
              />
              <CardBody className="space-y-3">
                {q.answers.map((ans) => (
                  <div key={ans.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3 text-xs">
                    <div className="font-semibold text-[#0f172a]">
                      {ans.isDeferral ? "Deferred Decision" : "Recorded Answer"}{" "}
                      <span className="font-mono font-normal text-[#64748b]">({ans.provenance})</span>
                    </div>
                    <p className="mt-1 text-[#334155]">{ans.answerText}</p>
                  </div>
                ))}
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    aria-label={`Answer for ${q.questionText}`}
                    placeholder="Record stakeholder answer or deferral reason..."
                    value={draftAnswers[q.id] ?? ""}
                    onChange={(e) => setDraftAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleRespond(q.id, false)}>
                      Record Answer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleRespond(q.id, true)}>
                      Defer with Reason
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
