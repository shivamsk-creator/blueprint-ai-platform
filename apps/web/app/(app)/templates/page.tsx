"use client";

import React from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, Button, StatusBadge } from "@blueprint/ui";

const TEMPLATES = [
  {
    id: "saas-b2b",
    title: "Multi-Tenant B2B SaaS Blueprint",
    category: "SaaS & Tenancy",
    stages: "10 Stages · RLS Matrix + RBAC + OpenAPI 3.1",
    summary: "Pre-structured BRD/PRD sections, tenant isolation constraints, billing webhooks, and SOC2 audit test cases.",
  },
  {
    id: "fintech-ledger",
    title: "Financial Double-Entry Ledger",
    category: "Fintech & Compliance",
    stages: "10 Stages · Immutable Journals + Maker-Checker",
    summary: "Includes atomic transaction posting rules, exact decimal numeric schemas, and reconciliation worker contracts.",
  },
  {
    id: "ai-workflow",
    title: "AI Agent & Async Pipeline Platform",
    category: "AI Engineering",
    stages: "10 Stages · BYOK Routing + pgmq Worker",
    summary: "Pre-wired model compatibility matrices, encrypted credential storage policies, and idempotent job lifecycle specs.",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Blueprint Templates</h1>
        <p className="text-sm text-[#64748b]">
          Standardized industry blueprints for accelerating discovery, requirements, and architecture setup.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col justify-between">
            <div>
              <CardHeader
                title={tpl.title}
                subtitle={tpl.stages}
                action={<StatusBadge status="active" label={tpl.category} tone="info" />}
              />
              <CardBody>
                <p className="text-xs leading-relaxed text-[#475569]">{tpl.summary}</p>
              </CardBody>
            </div>
            <div className="border-t border-[#eef2f7] px-5 py-3">
              <Link href="/projects/new">
                <Button size="sm" variant="outline" className="w-full">
                  Use Template in New Project
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
