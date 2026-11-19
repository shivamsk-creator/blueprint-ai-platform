"use client";

import React from "react";
import {
  Compass,
  HelpCircle,
  BookOpen,
  Scale,
  FileText,
  Layers,
  Layout,
  Network,
  Database,
  Webhook,
  ListChecks,
  TestTube2,
  GitBranch,
  ShieldAlert,
  GitPullRequest,
  CheckSquare,
  History,
  Activity,
  Download,
} from "lucide-react";
import type { ProjectStage } from "@blueprint/domain";
import { cn } from "./primitives";

export interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
  currentPath: string;
  stages: ProjectStage[];
  renderLink: (href: string, children: React.ReactNode, className?: string) => React.ReactNode;
}

export function ProjectSidebar({
  projectId,
  projectName,
  currentPath,
  stages,
  renderLink,
}: ProjectSidebarProps) {
  const stageMap = new Map(stages.map((s) => [s.stageKey, s]));
  const base = `/projects/${projectId}`;

  const groups = [
    {
      label: "Discovery & Knowledge",
      items: [
        { href: base, label: "Overview", icon: Compass, stageKey: "idea" as const },
        { href: `${base}/discovery`, label: "Discovery Studio", icon: Compass, stageKey: "discovery" as const },
        { href: `${base}/discovery/questions`, label: "Clarification Q&A", icon: HelpCircle, stageKey: "discovery" as const },
        { href: `${base}/knowledge`, label: "Knowledge Repo", icon: BookOpen, stageKey: "knowledge" as const },
        { href: `${base}/decisions`, label: "Decision Register", icon: Scale, stageKey: "knowledge" as const },
      ],
    },
    {
      label: "Specifications",
      items: [
        { href: `${base}/artifacts/brd`, label: "BRD Document", icon: FileText, stageKey: "brd_prd" as const },
        { href: `${base}/artifacts/prd`, label: "PRD Document", icon: FileText, stageKey: "brd_prd" as const },
        { href: `${base}/scope`, label: "MVP Scope Planner", icon: Layers, stageKey: "scope" as const },
        { href: `${base}/ux`, label: "UX / UI Spec", icon: Layout, stageKey: "ux" as const },
      ],
    },
    {
      label: "Technical Blueprints",
      items: [
        { href: `${base}/architecture`, label: "Architecture", icon: Network, stageKey: "architecture" as const },
        { href: `${base}/database`, label: "Database Designer", icon: Database, stageKey: "database_api" as const },
        { href: `${base}/api`, label: "API Designer", icon: Webhook, stageKey: "database_api" as const },
        { href: `${base}/development`, label: "Development Plan", icon: ListChecks, stageKey: "dev_qa" as const },
        { href: `${base}/qa`, label: "QA & Test Cases", icon: TestTube2, stageKey: "dev_qa" as const },
      ],
    },
    {
      label: "Governance & Export",
      items: [
        { href: `${base}/traceability`, label: "Traceability Matrix", icon: GitBranch, stageKey: "validate_export" as const },
        { href: `${base}/validation`, label: "Validation Center", icon: ShieldAlert, stageKey: "validate_export" as const },
        { href: `${base}/changes`, label: "Change Requests", icon: GitPullRequest, stageKey: "validate_export" as const },
        { href: `${base}/reviews`, label: "Review Center", icon: CheckSquare, stageKey: "validate_export" as const },
        { href: `${base}/history`, label: "Version History", icon: History, stageKey: "validate_export" as const },
        { href: `${base}/activity`, label: "Project Activity", icon: Activity, stageKey: "validate_export" as const },
        { href: `${base}/exports`, label: "Export Center", icon: Download, stageKey: "validate_export" as const },
      ],
    },
  ];

  const dotColor = (status?: string): string => {
    if (status === "approved") return "bg-[#047857]";
    if (status === "ready_for_review" || status === "in_progress") return "bg-[#1d4ed8]";
    if (status === "needs_input") return "bg-[#d97706]";
    if (status === "blocked") return "bg-[#be123c]";
    return "bg-[#cbd5e1]";
  };

  return (
    <aside
      aria-label="Project lifecycle navigation"
      className="hidden w-60 shrink-0 border-r border-[#dce3ee] bg-white px-3 py-5 xl:block"
    >
      <div className="mb-4 border-b border-[#eef2f7] px-2 pb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">Active Blueprint</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-[#0f172a]">{projectName}</div>
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.href;
              const st = stageMap.get(item.stageKey);
              return (
                <div key={item.href}>
                  {renderLink(
                    item.href,
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span
                        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor(st?.status))}
                        title={st ? `Stage ${st.stageKey}: ${st.status}` : undefined}
                        aria-hidden="true"
                      />
                    </span>,
                    cn(
                      "flex items-center rounded-[7px] px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-[#eff6ff] text-[#1d4ed8] font-semibold"
                        : "text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
