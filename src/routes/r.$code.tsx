import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackReferralClick } from "@/lib/ambassadors.functions";
import { storeReferralCode } from "@/lib/referral-code";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  head: () => ({
    meta: [
      { title: "Start your term paper — Co-Research AI" },
      { name: "description", content: "You were invited by a Co-Research AI campus ambassador. Create your account and write a lecturer-compliant term paper." },
      { property: "og:title", content: "Start your term paper — Co-Research AI" },
      { property: "og:description", content: "Invited by a campus ambassador. Get your Project Pass today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralLanding,
});

function ReferralLanding() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const track = useServerFn(trackReferralClick);

  useEffect(() => {
    storeReferralCode(code);
    track({ data: { code } }).catch(() => {});
    const t = setTimeout(() => navigate({ to: "/register" }), 450);
    return () => clearTimeout(t);
  }, [code, navigate, track]);

  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div className="space-y-3">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Taking you to Co-Research AI…</p>
      </div>
    </div>
  );
}
