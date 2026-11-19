"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import type { ProjectFile } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, FeedbackBanner } from "./primitives";
import { StatusBadge } from "./StatusBadge";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_BYTES = 25 * 1024 * 1024;

export function FileUploader({
  files,
  uploading = false,
  onUpload,
}: {
  files: ProjectFile[];
  uploading?: boolean;
  onUpload: (payload: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    extractedText?: string;
  }) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const inferredMime =
      file.type || (file.name.endsWith(".md") ? "text/markdown" : "text/plain");
    if (!ALLOWED_TYPES.has(inferredMime)) {
      setError(`Unsupported file type "${inferredMime}". Allowed: PDF, DOCX, Markdown, TXT, JSON, CSV, PNG/JPG/WebP.`);
      return;
    }
    if (file.size > MAX_BYTES || file.size === 0) {
      setError("File size must be between 1 byte and 25 MB.");
      return;
    }

    let extractedText: string | undefined;
    if (inferredMime.startsWith("text/") || inferredMime === "application/json") {
      extractedText = (await file.text()).slice(0, 50_000);
    }

    await onUpload({
      fileName: file.name,
      mimeType: inferredMime,
      sizeBytes: file.size,
      extractedText,
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader
        title="Private Project Files & Evidence Uploads"
        subtitle="Stored in private tenant-scoped Supabase Storage buckets with signed URL access."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              id="blueprint-project-file-input"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              Upload Source File
            </Button>
          </>
        }
      />
      <CardBody className="space-y-3">
        {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
        {files.length === 0 ? (
          <p className="text-xs text-[#64748b]">No private files uploaded to this project yet.</p>
        ) : (
          <ul className="divide-y divide-[#eef2f7] rounded-[8px] border border-[#dce3ee]">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
                  <div>
                    <div className="font-medium text-[#0f172a]">{f.fileName}</div>
                    <div className="bp-tabular font-mono text-[11px] text-[#64748b]">
                      {f.mimeType} · {(f.sizeBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <StatusBadge status={f.uploadStatus} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
