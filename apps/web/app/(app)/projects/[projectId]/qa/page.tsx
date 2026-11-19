"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { TestCase } from "@blueprint/domain";
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

export default function QATestCasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [area, setArea] = useState("Security");
  const [title, setTitle] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [testType, setTestType] = useState<TestCase["testType"]>("integration");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ testCases: TestCase[] }>(`/api/projects/${projectId}/test-cases`);
      setTestCases(res.testCases);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load QA test cases.");
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
    const { testCase } = await apiFetch<{ testCase: TestCase }>(`/api/projects/${projectId}/test-cases`, {
      method: "POST",
      body: JSON.stringify({ area, title, expectedResult, testType, priority: "high", status: "ready", steps: [] }),
    });
    setTestCases((prev) => [...prev, testCase]);
    setTitle("");
    setExpectedResult("");
    setFeedback(`Added QA test case ${testCase.testKey}.`);
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">QA & Test Cases</h1>
        <p className="text-sm text-[#64748b]">Structured verification cases linked directly to canonical requirements and acceptance criteria.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Add QA Test Case" />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="tc-area" required>Area</FieldLabel>
              <Input id="tc-area" required value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="md:col-span-4">
              <FieldLabel htmlFor="tc-title" required>Scenario Title</FieldLabel>
              <Input id="tc-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="tc-exp" required>Expected Result</FieldLabel>
              <Input id="tc-exp" required value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <FieldLabel htmlFor="tc-type">Type</FieldLabel>
              <Select id="tc-type" value={testType} onChange={(e) => setTestType(e.target.value as TestCase["testType"])}>
                <option value="unit">Unit</option>
                <option value="integration">Integration</option>
                <option value="api">API</option>
                <option value="e2e">E2E</option>
                <option value="security">Security</option>
                <option value="accessibility">A11y</option>
              </Select>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add Test</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={testCases}
        getRowKey={(tc) => tc.id}
        columns={[
          { key: "key", header: "Test ID", render: (tc) => <span className="font-mono text-xs font-bold text-[#1d4ed8]">{tc.testKey}</span> },
          { key: "area", header: "Area", render: (tc) => <span className="text-xs font-medium">{tc.area}</span> },
          { key: "title", header: "Scenario", render: (tc) => <span className="text-xs">{tc.title}</span> },
          { key: "exp", header: "Expected Result", render: (tc) => <span className="text-xs text-[#475569]">{tc.expectedResult}</span> },
          { key: "type", header: "Method", render: (tc) => <StatusBadge status="info" label={tc.testType} /> },
          { key: "status", header: "Status", render: (tc) => <StatusBadge status={tc.status} /> },
        ]}
      />
    </div>
  );
}
