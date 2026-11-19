import Link from "next/link";
import { Compass, Layers, ShieldCheck, GitBranch, Cpu, Download, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const pillars = [
    {
      icon: Compass,
      title: "Structured Discovery & Knowledge",
      desc: "Turn raw ideas and uploaded briefs into clarification Q&A, canonical requirements, assumptions, constraints, and decision logs.",
    },
    {
      icon: Layers,
      title: "Versioned BRD, PRD & Technical Blueprints",
      desc: "Immutable artifact revisions with section-level AI regeneration, inline diffs, ERD modeling, and validated OpenAPI 3.1 contracts.",
    },
    {
      icon: Cpu,
      title: "BYOK Multi-Provider AI Governance",
      desc: "Workspace admins configure OpenAI, Google Gemini, Anthropic Claude, or compatible APIs with server-only encrypted secrets and per-task overrides.",
    },
    {
      icon: GitBranch,
      title: "Live Traceability & Impact Analysis",
      desc: "Compute real coverage from requirements through features, screens, APIs, tasks, and QA test cases, flagging impacted artifacts automatically.",
    },
    {
      icon: ShieldCheck,
      title: "Tenant Isolation & Exact-Revision Approvals",
      desc: "PostgreSQL RLS across all 52 tables, RBAC authorization gates, append-only audit logs, and approvals bound to immutable revisions.",
    },
    {
      icon: Download,
      title: "Async Worker & Multi-Format Exports",
      desc: "Durable pgmq queue worker renders PDF, DOCX, Markdown, JSON, PostgreSQL SQL drafts, and OpenAPI YAML securely.",
    },
  ];

  return (
    <div className="bp-grid-bg min-h-screen">
      <header className="border-b border-[#dce3ee] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#1d4ed8] text-white shadow-sm">
              <Compass className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-bold tracking-tight text-[#0f172a]">Blueprint AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-[8px] px-3.5 py-2 text-sm font-medium text-[#334155] hover:bg-[#f1f5f9]"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#1d4ed8] px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-[#1e40af]"
            >
              Open Studio
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
            Idea → Discovery → BRD/PRD → Architecture → DB/API → Traceability → Export
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#0f172a] sm:text-5xl">
            Precision software blueprints, governed end to end.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#475569] sm:text-lg">
            Blueprint AI unifies structured product discovery, canonical requirements, immutable BRD/PRD authoring,
            editable system architecture, PostgreSQL schema design, OpenAPI generation, and traceable approval gates
            inside one multi-tenant engineering studio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e40af]"
            >
              Launch Workspace Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[#c2cede] bg-white px-5 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
            >
              Create Account
            </Link>
          </div>
        </div>

        <section aria-label="Platform capabilities" className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[12px] border border-[#dce3ee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#eff6ff] text-[#1d4ed8]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="mt-3.5 text-sm font-semibold text-[#0f172a]">{item.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">{item.desc}</p>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
