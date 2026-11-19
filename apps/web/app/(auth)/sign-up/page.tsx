"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, FeedbackBanner, FieldLabel, Input } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ verificationRequired: boolean }>("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
      });
      if (res.verificationRequired) {
        setSuccess("Account created. Check your inbox to verify your email address before signing in.");
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Create your Blueprint AI account"
        subtitle="Provision an isolated workspace for product discovery and architecture blueprints."
      />
      <CardBody className="space-y-4">
        {error && <FeedbackBanner tone="error" message={error} onDismiss={() => setError(null)} />}
        {success && <FeedbackBanner tone="success" message={success} />}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <FieldLabel htmlFor="signup-name" required>Full Name</FieldLabel>
            <Input id="signup-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="signup-email" required>Work Email</FieldLabel>
            <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="signup-password" required>Password (min 8 chars)</FieldLabel>
            <Input id="signup-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="text-center text-xs text-[#64748b]">
          Already registered?{" "}
          <Link href="/sign-in" className="font-semibold text-[#1d4ed8] hover:underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
