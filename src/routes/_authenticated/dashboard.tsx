import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WorkspaceShell, Card, PageTitle, ActionButton, CardSkeleton } from "@/components/workspace-shell";
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
    <WorkspaceShell
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


      {data && data.length === 0 && (
        <Card className="border-dashed py-14 text-center shadow-none">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h2 className="mt-3 font-medium">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start a new project to begin writing with Co-Research AI.</p>
          <div className="mt-5 flex justify-center">
            <ActionButton icon={Plus} variant="primary" onClick={() => navigate({ to: "/new" })}>
              Create your first project
            </ActionButton>
          </div>
        </Card>
      )}

      {data && data.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                to="/paper/$id"
                params={{ id: p.id }}
                className="block h-full rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">{p.course_code}</span>
                  {p.paid ? (
                    <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Unlocked</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Awaiting payment</span>
                  )}
                </div>
                <h3 className="mt-3 line-clamp-2 font-medium leading-snug">{p.topic || "Untitled paper"}</h3>
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
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
