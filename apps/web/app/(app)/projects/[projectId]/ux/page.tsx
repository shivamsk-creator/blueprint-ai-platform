"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScreenSpec, UserJourney, UXPersona } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  SkeletonBlock,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function UXSpecPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [personas, setPersonas] = useState<UXPersona[]>([]);
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [screens, setScreens] = useState<ScreenSpec[]>([]);
  const [screenName, setScreenName] = useState("");
  const [routePath, setRoutePath] = useState("/");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ personas: UXPersona[]; journeys: UserJourney[]; screens: ScreenSpec[] }>(
        `/api/projects/${projectId}/ux`
      );
      setPersonas(res.personas);
      setJourneys(res.journeys);
      setScreens(res.screens);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load UX specs.");
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

  const handleAddScreen = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { screen } = await apiFetch<{ screen: ScreenSpec }>(`/api/projects/${projectId}/ux`, {
      method: "POST",
      body: JSON.stringify({
        kind: "screen",
        name: screenName,
        routePath,
        purpose,
        components: ["AppShell", "DataTable"],
        interactions: ["Filter", "Inspect"],
      }),
    });
    setScreens((prev) => [...prev, screen]);
    setScreenName("");
    setRoutePath("/");
    setPurpose("");
    setFeedback(`Added screen specification ${screen.screenKey}.`);
  };

  if (loading) return <SkeletonBlock className="h-72 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">UX / UI Specification</h1>
        <p className="text-sm text-[#64748b]">Personas, end-to-end user journeys, and screen-to-route inventory with mandatory UI states.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={`User Personas (${personas.length})`} />
          <CardBody className="space-y-3 text-xs">
            {personas.map((p) => (
              <div key={p.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
                <div className="font-semibold text-[#0f172a]">{p.name} <span className="font-normal text-[#64748b]">({p.roleLabel})</span></div>
                <div className="mt-1.5 text-[#334155]"><strong>Goals:</strong> {p.goals.join(" · ")}</div>
                <div className="mt-1 text-[#64748b]"><strong>Pain Points:</strong> {p.painPoints.join(" · ")}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`User Journeys (${journeys.length})`} />
          <CardBody className="space-y-3 text-xs">
            {journeys.map((j) => (
              <div key={j.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
                <div className="font-semibold text-[#0f172a]">{j.name}</div>
                <p className="mt-0.5 text-[#475569]">{j.goal}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-[#334155]">
                  {j.steps.map((s) => (
                    <li key={s.stepNo}>
                      <strong>{s.action}</strong> → {s.systemResponse} <span className="font-mono text-[10px] text-[#1d4ed8]">({s.touchpoint})</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Add Screen Specification" />
        <CardBody>
          <form onSubmit={handleAddScreen} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <FieldLabel htmlFor="scr-name" required>Screen Name</FieldLabel>
              <Input id="scr-name" required value={screenName} onChange={(e) => setScreenName(e.target.value)} placeholder="e.g., Audit Log Inspector" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="scr-route" required>Route Path</FieldLabel>
              <Input id="scr-route" required value={routePath} onChange={(e) => setRoutePath(e.target.value)} placeholder="/settings/audit" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="scr-purpose">Purpose</FieldLabel>
              <Input id="scr-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add Screen</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {screens.map((s) => (
          <Card key={s.id}>
            <CardHeader
              title={<span className="flex items-center gap-2"><span className="font-mono text-[#1d4ed8]">{s.screenKey}</span>{s.name}</span>}
              subtitle={<span className="font-mono">{s.routePath}</span>}
            />
            <CardBody className="text-xs space-y-2">
              <p className="text-[#475569]">{s.purpose}</p>
              <div className="flex flex-wrap gap-1">
                {s.components.map((c) => (
                  <span key={c} className="rounded bg-[#eff6ff] px-2 py-0.5 font-mono text-[11px] text-[#1d4ed8]">{c}</span>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
