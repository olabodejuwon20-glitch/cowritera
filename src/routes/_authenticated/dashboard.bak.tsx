import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileAppLayout, Card, PageTitle, ActionButton, CardSkeleton } from "@/components/mobile-app-layout";
import { listPapers } from "@/lib/papers.functions";
import { Plus, FileText, CheckCircle2, Clock } from "lucide-react";
import { getAmbassadorDashboard } from "@/lib/ambassadors.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your papers — Co-Research AI" },
      { name: "description", content: "Your Co-Research AI dashboard. See all your term paper projects." },
      { property: "og:title", content: "Your papers — Co-Research AI" },
      { property: "og:description", content: "Your Co-Research AI dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchPapers = useServerFn(listPapers);
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["papers"], queryFn: () => fetchPapers() });
  const ambFn = useServerFn(getAmbassadorDashboard);
  const ambassador = useQuery({ queryKey: ["my-ambassador"], queryFn: () => ambFn() });

  const total = data?.length ?? 0;
  const unlocked = data?.filter((p) => p.paid).length ?? 0;

  return (
    <MobileAppLayout
      title="Dashboard"
      status="Workspace overview"
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "My Projects" }]}
      wide
    >
      <PageTitle
        eyebrow="Workspace"
        title="My Projects"
        description="Every Project Pass unlocks one term paper — generation, editing and exports included."
        actions={
          <ActionButton icon={Plus} variant="primary" onClick={() => navigate({ to: "/new" })}>
            New Project
          </ActionButton>
        }
      />

      {(ambassador.data as any)?.ambassador && (
        <Link
          to="/ambassador"
          className="flex items-center justify-between gap-3 rounded-2xl border bg-primary-soft px-4 py-3 text-sm text-primary"
        >
          <span>
            <strong>Campus Ambassador</strong> — track your referrals, commissions and campaign resources.
          </span>
          <span className="shrink-0 font-medium">Open →</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Projects" value={total} />
        <Stat label="Unlocked" value={unlocked} />
        <Stat label="Awaiting payment" value={Math.max(0, total - unlocked)} />
      </div>

      {isLoading && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}><CardSkeleton /></li>
          ))}
        </ul>
      )}

      {error && <Card className="text-sm text-destructive">{(error as Error).message}</Card>}

    </MobileAppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
