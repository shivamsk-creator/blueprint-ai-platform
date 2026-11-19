"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, FeedbackBanner, FieldLabel, Input } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Reset your password"
        subtitle="We will send a secure recovery link via Supabase Auth."
      />
      <CardBody className="space-y-4">
        {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
        {message && <FeedbackBanner tone="success" message={message} />}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <FieldLabel htmlFor="forgot-email" required>Work Email</FieldLabel>
            <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Send recovery link
          </Button>
        </form>
        <p className="text-center text-xs text-[#64748b]">
          <Link href="/sign-in" className="font-semibold text-[#1d4ed8] hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
