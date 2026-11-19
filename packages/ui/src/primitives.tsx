"use client";

import React from "react";
import { AlertCircle, Inbox, Loader2, RefreshCw, CheckCircle2, X } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-[#1d4ed8] text-white hover:bg-[#1e40af] border border-[#1d4ed8] shadow-xs",
    secondary: "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] border border-[#dce3ee]",
    outline: "bg-white text-[#0f172a] hover:bg-[#f8fafc] border border-[#c2cede]",
    ghost: "bg-transparent text-[#334155] hover:bg-[#f1f5f9] border border-transparent",
    danger: "bg-[#be123c] text-white hover:bg-[#9f1239] border border-[#be123c]",
  };
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-[6px]",
    md: "h-9 px-4 text-sm gap-2 rounded-[8px]",
    lg: "h-11 px-5 text-sm gap-2 rounded-[8px]",
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[#dce3ee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-[#e8edf5] px-5 py-4", className)}>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-[#0f172a]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[#64748b]">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-[#334155]">
      {children}
      {required && <span className="ml-0.5 text-[#be123c]" aria-hidden="true">*</span>}
    </label>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-[8px] border border-[#c2cede] bg-white px-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/15 disabled:bg-[#f8fafc]",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[8px] border border-[#c2cede] bg-white px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/15 disabled:bg-[#f8fafc]",
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-[8px] border border-[#c2cede] bg-white px-3 text-sm text-[#0f172a] focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/15 disabled:bg-[#f8fafc]",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "cobalt" | "emerald" | "amber" | "crimson";
}) {
  const barColors = {
    cobalt: "bg-[#1d4ed8]",
    emerald: "bg-[#047857]",
    amber: "bg-[#d97706]",
    crimson: "bg-[#be123c]",
  };
  return (
    <Card className="relative overflow-hidden p-4">
      {accent && <div className={cn("absolute inset-x-0 top-0 h-0.5", barColors[accent])} />}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">{label}</div>
      <div className="bp-tabular mt-1.5 text-2xl font-semibold tracking-tight text-[#0f172a]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[#64748b]">{hint}</div>}
    </Card>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-[8px] bg-[#e2e8f0]", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#c2cede] bg-[#f8fafc] px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eff6ff] text-[#1d4ed8]">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-[#0f172a]">{title}</h4>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-[#64748b]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  requestId,
  onRetry,
}: {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[12px] border border-[#fecdd3] bg-[#fff1f2] p-4 text-[#881337]"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#be123c]" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-0.5 text-xs leading-relaxed">{message}</p>
          {requestId && (
            <p className="mt-1 font-mono text-[11px] text-[#9f1239]">Correlation ID: {requestId}</p>
          )}
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function FeedbackBanner({
  tone,
  message,
  onDismiss,
}: {
  tone: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]",
    error: "border-[#fecdd3] bg-[#fff1f2] text-[#881337]",
    info: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a]",
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-between gap-3 rounded-[10px] border px-4 py-2.5 text-xs font-medium", styles[tone])}
    >
      <span className="flex items-center gap-2">
        {tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
        {message}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded p-0.5 hover:bg-black/5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
