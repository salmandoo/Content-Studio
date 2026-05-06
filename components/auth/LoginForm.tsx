"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Mail } from "lucide-react";

export function LoginForm({ next, error: initialError }: { next?: string; error?: string }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const supabase = supabaseBrowser();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? "/")}`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue/12 text-blue">
          <Mail className="size-5" strokeWidth={2.2} />
        </div>
        <h2 className="mt-3 text-title-3">Check your email</h2>
        <p className="mt-1 text-callout text-label-secondary">
          We sent a sign-in link to <span className="font-semibold text-label">{email}</span>.
          It expires in 60 minutes.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-[12.5px] font-semibold text-label">
        Work email
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="mt-1.5 block w-full rounded-[10px] border border-separator bg-bg px-3 py-2.5 text-[14.5px] text-label placeholder:text-label-tertiary focus:border-blue focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-[10px] bg-red/10 px-3 py-2 text-[13px] font-medium text-red">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Sending…" : "Send magic link"}
        {!submitting && <ArrowRight className="size-4" strokeWidth={2.4} />}
      </Button>
    </form>
  );
}
