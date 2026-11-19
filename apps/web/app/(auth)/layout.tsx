import React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bp-grid-bg flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#1d4ed8] text-white shadow-sm">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-bold tracking-tight text-[#0f172a]">Blueprint AI</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
