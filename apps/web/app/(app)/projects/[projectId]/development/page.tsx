"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { DevelopmentTask } from "@blueprint/domain";
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

export default function DevelopmentPlanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<DevelopmentTask[]>([]);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("P02");
  const [ownerRole, setOwnerRole] = useState("Full Stack");
  const [estimateHours, setEstimateHours] = useState("8");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ tasks: DevelopmentTask[] }>(`/api/projects/${projectId}/development-tasks`);
      setTasks(res.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load development plan.");
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
    const { task } = await apiFetch<{ task: DevelopmentTask }>(
      `/api/projects/${projectId}/development-tasks`,
      {
        method: "POST",
        body: JSON.stringify({
          phase,
          title,
          ownerRole,
          estimateHours: Number(estimateHours) || 8,
          priority: "high",
          status: "not_started",
          acceptanceCriteria: ["Typecheck and unit tests pass"],
        }),
      }
    );
    setTasks((prev) => [...prev, task]);
    setTitle("");
    setFeedback(`Added task ${task.taskKey}.`);
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Development Execution Plan</h1>
        <p className="text-sm text-[#64748b]">Implementation tasks, phase grouping, dependencies, and effort estimates linked to requirements.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Add Development Task" />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <FieldLabel htmlFor="tsk-title" required>Task Title</FieldLabel>
              <Input id="tsk-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="tsk-phase">Phase</FieldLabel>
              <Input id="tsk-phase" value={phase} onChange={(e) => setPhase(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="tsk-role">Owner Role</FieldLabel>
              <Select id="tsk-role" value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)}>
                <option value="Full Stack">Full Stack</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
                <option value="QA">QA</option>
              </Select>
            </div>
            <div className="md:col-span-1">
              <FieldLabel htmlFor="tsk-hrs">Hours</FieldLabel>
              <Input id="tsk-hrs" type="number" min="1" value={estimateHours} onChange={(e) => setEstimateHours(e.target.value)} />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add Task</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={tasks}
        getRowKey={(t) => t.id}
        columns={[
          { key: "key", header: "Task ID", render: (t) => <span className="font-mono text-xs font-bold text-[#1d4ed8]">{t.taskKey}</span> },
          { key: "phase", header: "Phase", render: (t) => <span className="font-mono text-xs">{t.phase}</span> },
          { key: "title", header: "Work Item", render: (t) => <span className="font-medium text-xs">{t.title}</span> },
          { key: "owner", header: "Owner", render: (t) => <span className="text-xs text-[#475569]">{t.ownerRole}</span> },
          { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
          { key: "est", header: "Est. Hours", align: "right", render: (t) => <span className="font-mono text-xs">{t.estimateHours}h</span> },
        ]}
      />
    </div>
  );
}
