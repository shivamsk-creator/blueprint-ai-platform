"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  FileCode2,
  BarChart3,
  Settings,
  Users,
  Cpu,
  Sliders,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Compass,
  LogOut,
} from "lucide-react";
import type { Workspace, WorkspaceRole } from "@blueprint/domain";
import { cn } from "./primitives";

export interface AppShellBreadcrumb {
  label: string;
  href?: string;
}

export interface AppShellProps {
  workspaces: Array<Workspace & { role: WorkspaceRole }>;
  activeWorkspaceId: string;
  onSelectWorkspace?: (workspaceId: string) => void;
  user: { email: string; fullName: string; role: WorkspaceRole };
  demoActors?: Array<{ id: string; label: string; role: WorkspaceRole }>;
  activeActorId?: string;
  onSwitchDemoActor?: (actorId: string) => void;
  onSignOut?: () => void;
  currentPath: string;
  breadcrumbs?: AppShellBreadcrumb[];
  renderLink: (href: string, children: React.ReactNode, className?: string) => React.ReactNode;
  secondarySidebar?: React.ReactNode;
  children: React.ReactNode;
}

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/templates", label: "Templates", icon: FileCode2 },
  { href: "/ai-usage", label: "AI Usage", icon: BarChart3 },
];

const SETTINGS_NAV = [
  { href: "/settings/general", label: "General", icon: Settings },
  { href: "/settings/members", label: "Team & Roles", icon: Users },
  { href: "/settings/ai-providers", label: "AI Providers", icon: Cpu },
  { href: "/settings/ai-models", label: "Model Catalogue", icon: Sliders },
  { href: "/settings/ai-usage", label: "Usage & Costs", icon: BarChart3 },
  { href: "/settings/audit", label: "Audit Trail", icon: ShieldCheck },
];

export function AppShell({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  user,
  demoActors,
  activeActorId,
  onSwitchDemoActor,
  onSignOut,
  currentPath,
  breadcrumbs = [],
  renderLink,
  secondarySidebar,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col bg-[#0b1220] text-[#e2e8f0]">
      <div className="flex h-14 items-center justify-between border-b border-[#1e293b] px-4">
        {renderLink(
          "/dashboard",
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#1d4ed8] text-white shadow-sm">
              <Compass className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight text-white">Blueprint AI</span>
          </span>
        )}
        <button
          type="button"
          className="rounded p-1 text-[#94a3b8] hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-[#1e293b] p-3">
        <label htmlFor="workspace-switcher" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
          Workspace
        </label>
        <select
          id="workspace-switcher"
          value={activeWorkspaceId}
          onChange={(e) => onSelectWorkspace?.(e.target.value)}
          className="h-8 w-full rounded-[6px] border border-[#334155] bg-[#131c31] px-2.5 text-xs font-medium text-white focus:border-[#3b82f6] focus:outline-none"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name} ({ws.role})
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
            Studio
          </div>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <div key={item.href} onClick={() => setMobileOpen(false)}>
                {renderLink(
                  item.href,
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>,
                  cn(
                    "flex items-center rounded-[7px] px-2.5 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-[#1d4ed8]/20 text-white border-l-2 border-[#3b82f6]"
                      : "text-[#cbd5e1] hover:bg-[#131c31] hover:text-white"
                  )
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-0.5">
          <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
            Admin & Governance
          </div>
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.href;
            return (
              <div key={item.href} onClick={() => setMobileOpen(false)}>
                {renderLink(
                  item.href,
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>,
                  cn(
                    "flex items-center rounded-[7px] px-2.5 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-[#1d4ed8]/20 text-white border-l-2 border-[#3b82f6]"
                      : "text-[#cbd5e1] hover:bg-[#131c31] hover:text-white"
                  )
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#1e293b] p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{user.fullName}</div>
            <div className="truncate text-[11px] text-[#94a3b8]">
              {user.email} · <span className="uppercase">{user.role}</span>
            </div>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded p-1.5 text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f6f8fb] text-[#0f172a]">
      {/* Desktop primary sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">{navContent}</aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-64 max-w-[82vw]">{navContent}</div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#dce3ee] bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-[6px] p-1.5 text-[#334155] hover:bg-[#f1f5f9] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" aria-hidden="true" />}
                  {crumb.href ? (
                    renderLink(
                      crumb.href,
                      <span className="truncate font-medium text-[#64748b] hover:text-[#0f172a]">{crumb.label}</span>
                    )
                  ) : (
                    <span className="truncate font-semibold text-[#0f172a]">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {demoActors && demoActors.length > 0 && onSwitchDemoActor && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <label htmlFor="demo-role-switch" className="text-[11px] font-medium text-[#64748b]">
                  Session Role:
                </label>
                <select
                  id="demo-role-switch"
                  value={activeActorId}
                  onChange={(e) => onSwitchDemoActor(e.target.value)}
                  className="h-8 rounded-[6px] border border-[#c2cede] bg-[#f8fafc] px-2 text-xs font-medium text-[#0f172a]"
                >
                  {demoActors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        <div className="flex min-w-0 flex-1">
          {secondarySidebar}
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
