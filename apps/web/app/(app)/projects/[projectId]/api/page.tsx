"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ApiEndpoint } from "@blueprint/domain";
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

export default function ApiDesignerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [openApiSpec, setOpenApiSpec] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [method, setMethod] = useState<ApiEndpoint["method"]>("GET");
  const [path, setPath] = useState("/v1/");
  const [summary, setSummary] = useState("");
  const [authPolicy, setAuthPolicy] = useState("workspace:member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{
        endpoints: ApiEndpoint[];
        openApiSpec: Record<string, unknown>;
        validationErrors: string[];
      }>(`/api/projects/${projectId}/api-endpoints`);
      setEndpoints(res.endpoints);
      setOpenApiSpec(res.openApiSpec);
      setValidationErrors(res.validationErrors);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load API catalog.");
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
    await apiFetch(`/api/projects/${projectId}/api-endpoints`, {
      method: "POST",
      body: JSON.stringify({ method, path, summary, description: summary, authPolicy, statusCodes: [200, 401, 403, 422], tags: ["Custom"] }),
    });
    setPath("/v1/");
    setSummary("");
    setFeedback("Endpoint added and OpenAPI 3.1 contract re-validated.");
    await load();
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">API Designer & OpenAPI 3.1 Contract</h1>
        <p className="text-sm text-[#64748b]">Define REST contracts with explicit auth policies and continuously validate OpenAPI 3.1 output.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Add API Endpoint Contract" />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="ep-method">Method</FieldLabel>
              <Select id="ep-method" value={method} onChange={(e) => setMethod(e.target.value as ApiEndpoint["method"])}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="ep-path" required>Path</FieldLabel>
              <Input id="ep-path" required value={path} onChange={(e) => setPath(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="ep-summary" required>Summary</FieldLabel>
              <Input id="ep-summary" required value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="ep-auth" required>Auth Policy</FieldLabel>
              <Input id="ep-auth" required value={authPolicy} onChange={(e) => setAuthPolicy(e.target.value)} />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={endpoints}
        getRowKey={(ep) => ep.id}
        columns={[
          { key: "key", header: "ID", render: (ep) => <span className="font-mono text-xs font-bold text-[#1d4ed8]">{ep.endpointKey}</span> },
          { key: "method", header: "Method", render: (ep) => <StatusBadge status="info" label={ep.method} /> },
          { key: "path", header: "Endpoint", render: (ep) => <span className="font-mono text-xs">{ep.path}</span> },
          { key: "summary", header: "Summary", render: (ep) => <span className="text-xs">{ep.summary}</span> },
          { key: "auth", header: "Auth Policy", render: (ep) => <span className="font-mono text-xs text-[#475569]">{ep.authPolicy}</span> },
        ]}
      />

      <Card>
        <CardHeader
          title="OpenAPI 3.1.0 Specification"
          subtitle={validationErrors.length === 0 ? "Valid OpenAPI 3.1 contract" : `${validationErrors.length} validation warning(s)`}
          action={<StatusBadge status={validationErrors.length === 0 ? "passing" : "failing"} label={validationErrors.length === 0 ? "Validated" : "Errors"} />}
        />
        <CardBody>
          <pre className="max-h-96 overflow-auto rounded-[8px] bg-[#0b1220] p-4 font-mono text-xs text-[#e2e8f0]">
            {JSON.stringify(openApiSpec, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
