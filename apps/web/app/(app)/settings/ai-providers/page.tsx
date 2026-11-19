"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { AIProviderMetadata, AIProviderType } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  Select,
  SkeletonBlock,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function AIProvidersSettingsPage() {
  const [providers, setProviders] = useState<AIProviderMetadata[]>([]);
  const [providerType, setProviderType] = useState<AIProviderType>("openai");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ providers: AIProviderMetadata[] }>("/api/settings/ai-providers");
      setProviders(res.providers);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load AI providers.");
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

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const { provider } = await apiFetch<{ provider: AIProviderMetadata }>("/api/settings/ai-providers", {
        method: "POST",
        body: JSON.stringify({ providerType, displayName, baseUrl, apiKey, enabled: true }),
      });
      setProviders((prev) => [provider, ...prev]);
      setDisplayName("");
      setBaseUrl("");
      setApiKey("");
      setFeedback({
        tone: "success",
        message: `Connected "${provider.displayName}". Credential encrypted server-side with AES-256-GCM (${provider.keyHint}).`,
      });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Failed to save provider." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (p: AIProviderMetadata): Promise<void> => {
    try {
      const { provider } = await apiFetch<{ provider: AIProviderMetadata }>(`/api/settings/ai-providers/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !p.enabled }),
      });
      setProviders((prev) => prev.map((item) => (item.id === p.id ? provider : item)));
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Toggle failed." });
    }
  };

  const handleTest = async (providerId: string): Promise<void> => {
    setTestingId(providerId);
    setFeedback(null);
    try {
      const res = await apiFetch<{ provider: AIProviderMetadata; testResult: { ok: boolean; message: string; latencyMs: number } }>(
        `/api/settings/ai-providers/${providerId}/test`,
        { method: "POST" }
      );
      setProviders((prev) => prev.map((p) => (p.id === providerId ? res.provider : p)));
      setFeedback({
        tone: res.testResult.ok ? "success" : "error",
        message: `${res.testResult.message} (${res.testResult.latencyMs}ms)`,
      });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Test failed." });
    } finally {
      setTestingId(null);
    }
  };

  if (loading) return <SkeletonBlock className="h-64 w-full" />;
  if (error) return <ErrorState title="Workspace Admin Required" message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">AI Provider Connections</h1>
        <p className="text-sm text-[#64748b]">
          Configure OpenAI, Google Gemini, Anthropic Claude, or OpenAI-compatible endpoints. Secrets are encrypted at rest and never returned to the browser.
        </p>
      </div>

      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Connect AI Provider" subtitle="Credentials are stored strictly in server-only ai_provider_secrets." />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <FieldLabel htmlFor="prov-type">Provider Adapter</FieldLabel>
              <Select id="prov-type" value={providerType} onChange={(e) => setProviderType(e.target.value as AIProviderType)}>
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openai_compatible">OpenAI-Compatible</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="prov-name" required>Display Name</FieldLabel>
              <Input id="prov-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Gemini Enterprise" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="prov-key" required>API Key (write-only)</FieldLabel>
              <Input id="prov-key" type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-... / AIza..." />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="prov-url">Custom Base URL (optional)</FieldLabel>
              <Input id="prov-url" type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end md:col-span-12">
              <Button type="submit" loading={submitting}>Save Encrypted Connection</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {providers.map((p) => (
          <Card key={p.id}>
            <CardHeader
              title={p.displayName}
              subtitle={`${p.providerType} · Key Hint: ${p.keyHint} · Key Version: ${p.keyVersion ?? "v1"}`}
              action={<StatusBadge status={p.enabled ? "active" : "archived"} label={p.enabled ? "Enabled" : "Disabled"} />}
            />
            <CardBody className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-[#64748b]">
                {p.lastTestStatus ? (
                  <span className="flex items-center gap-1.5">
                    Last test: <StatusBadge status={p.lastTestStatus} />
                  </span>
                ) : (
                  "Not tested yet"
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" loading={testingId === p.id} onClick={() => void handleTest(p.id)}>
                  Test Connection
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void handleToggle(p)}>
                  {p.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
