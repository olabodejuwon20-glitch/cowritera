import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { GraduationCap, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Co-Research AI" },
      { name: "description", content: "Log in to Co-Research AI to continue your term paper project." },
      { property: "og:title", content: "Log in — Co-Research AI" },
      { property: "og:description", content: "Log in to Co-Research AI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] flex-1 hero-bg flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-semibold">Welcome back</span>
          </div>
          <h1 className="mt-6 text-2xl font-semibold">Log in to Co-Research AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue where you left off on your term paper.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu.ng" />
            <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {err && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 font-medium hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Log in
            </button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground text-center">
            Don't have an account? <Link to="/register" className="text-primary font-medium">Register</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      />
    </label>
  );
}
