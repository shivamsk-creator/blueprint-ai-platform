"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { DbEntity, DbRelationship } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ERDCanvas,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  SkeletonBlock,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function DatabaseDesignerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [entities, setEntities] = useState<DbEntity[]>([]);
  const [relationships, setRelationships] = useState<DbRelationship[]>([]);
  const [sqlDraft, setSqlDraft] = useState("");
  const [tableName, setTableName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{
        entities: DbEntity[];
        relationships: DbRelationship[];
        sqlMigrationDraft: string;
      }>(`/api/projects/${projectId}/database/entities`);
      setEntities(res.entities);
      setRelationships(res.relationships);
      setSqlDraft(res.sqlMigrationDraft);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load database schema.");
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

  const handleAddTable = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await apiFetch(`/api/projects/${projectId}/database/entities`, {
      method: "POST",
      body: JSON.stringify({
        tableName: tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        schemaName: "public",
        description,
        rlsEnabled: true,
        attributes: [
          { columnName: "id", dataType: "uuid", isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: "gen_random_uuid()", description: "Primary key" },
          { columnName: "workspace_id", dataType: "uuid", isPrimaryKey: false, isNullable: false, isUnique: false, description: "Tenant scope" },
          { columnName: "created_at", dataType: "timestamptz", isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "now()", description: "UTC timestamp" },
        ],
      }),
    });
    setTableName("");
    setDescription("");
    setFeedback("Entity added and SQL migration draft regenerated.");
    await load();
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Database Schema Designer</h1>
        <p className="text-sm text-[#64748b]">Model PostgreSQL tables, RLS protection, foreign keys, and export deterministic SQL migration drafts.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <ERDCanvas entities={entities} relationships={relationships} />

      <Card>
        <CardHeader title="Add Relational Table Entity" subtitle="Automatically provisions UUID PK, workspace_id tenant scope, RLS, and UTC audit columns." />
        <CardBody>
          <form onSubmit={handleAddTable} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <FieldLabel htmlFor="tbl-name" required>Table Name (snake_case)</FieldLabel>
              <Input id="tbl-name" required value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g., settlement_batches" />
            </div>
            <div className="md:col-span-6">
              <FieldLabel htmlFor="tbl-desc">Description</FieldLabel>
              <Input id="tbl-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add Table</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Generated PostgreSQL SQL Migration Draft" subtitle="Deterministic DDL generated directly from structured ERD entities." />
        <CardBody>
          <pre className="max-h-96 overflow-auto rounded-[8px] bg-[#0b1220] p-4 font-mono text-xs leading-relaxed text-[#e2e8f0]">
            {sqlDraft}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
