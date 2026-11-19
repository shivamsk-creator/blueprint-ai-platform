"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, FeedbackBanner, FieldLabel, Input } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("alex@meridian.dev");
  const [password, setPassword] = useState("blueprint-demo-pass");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Sign in to Blueprint AI"
        subtitle="Access your multi-tenant specification studio and governance workspace."
      />
      <CardBody className="space-y-4">
        {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <FieldLabel htmlFor="signin-email" required>Work Email</FieldLabel>
            <Input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="signin-password" required>Password</FieldLabel>
              <Link href="/forgot-password" className="text-xs font-medium text-[#1d4ed8] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="signin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="text-center text-xs text-[#64748b]">
          New to Blueprint AI?{" "}
          <Link href="/sign-up" className="font-semibold text-[#1d4ed8] hover:underline">
            Create an account
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
