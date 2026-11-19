import React from "react";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
