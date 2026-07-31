import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { acceptAmbassadorInvite } from "@/lib/ambassadors.functions";
import { clearInviteToken, storeInviteToken } from "@/lib/referral-code";
import { SiteHeader } from "@/components/site-header";
import { AlertTriangle, CheckCircle2, Loader2, Megaphone } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Campus Ambassador invitation — Co-Research AI" },
      { name: "description", content: "Accept your invitation to join the Co-Research AI Campus Ambassador programme and start earning on every referral." },
      { property: "og:title", content: "Campus Ambassador invitation — Co-Research AI" },
      { property: "og:description", content: "Join the Co-Research AI Campus Ambassador programme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useServerFn(acceptAmbassadorInvite);
  const [state, setState] = useState<"checking" | "signed-out" | "working" | "done" | "error">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeInviteToken(token);
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setState("signed-out");
        return;
      }
      setState("working");
      try {
        await accept({ data: { token } });
        clearInviteToken();
        if (cancelled) return;
        setState("done");
        setTimeout(() => navigate({ to: "/ambassador" }), 900);
      } catch (e) {
        if (cancelled) return;
        setMessage((e as Error).message);
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, accept, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 hero-bg flex items-center justify-center px-4 py-16 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Megaphone className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Campus Ambassador invitation</h1>

          {state === "checking" || state === "working" ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your invitation…
            </p>
          ) : null}

          {state === "signed-out" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                You&apos;ve been invited to become a Co-Research AI Campus Ambassador. Create your account (or sign
                in) with the email that received this invitation, and we&apos;ll activate your workspace instantly.
              </p>
              <div className="mt-6 grid gap-3">
                <Link to="/register" className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground hover:brightness-110">
                  Create my account
                </Link>
                <Link to="/login" className="rounded-xl border px-4 py-3 text-center text-sm font-medium hover:bg-surface">
                  I already have an account
                </Link>
              </div>
            </>
          )}

          {state === "done" && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft p-3 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" /> You&apos;re in! Opening your ambassador workspace…
            </p>
          )}

          {state === "error" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4" /> {message}
              </div>
              <Link to="/login" className="block rounded-xl border px-4 py-3 text-center text-sm font-medium hover:bg-surface">
                Switch account
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
