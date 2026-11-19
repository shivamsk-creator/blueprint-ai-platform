"use client";

import React from "react";
import { ErrorState } from "@blueprint/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-6">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Something went wrong in Blueprint AI"
          message={error.message || "An unexpected client error occurred."}
          requestId={error.digest}
          onRetry={reset}
        />
      </div>
    </div>
  );
}
