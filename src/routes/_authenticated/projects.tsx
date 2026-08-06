import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileAppLayout, Card, PageTitle, ActionButton, CardSkeleton } from "@/components/mobile-app-layout";
import { listPapers } from "@/lib/papers.functions";
import { Plus, FileText, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Co-Research AI" },
      { name: "description", content: "All your Co-Research AI term paper projects in one place." },
      { property: "og:title", content: "Projects — Co-Research AI" },
      { property: "og:description", content: "All your Co-Research AI term paper projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const fetchPapers = useServerFn(listPapers);
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["papers"], queryFn: () => fetchPapers() });

  return (
    <MobileAppLayout
      title="Projects"
      status="All your papers"
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Projects" }]}
      wide
    >
      <PageTitle
        eyebrow="Workspace"
        title="Projects"
        description="Open a project to keep writing, or start a new one."
        actions={
          <ActionButton icon={Plus} variant="primary" onClick={() => navigate({ to: "/new" })}>
            New Project
          </ActionButton>
        }
      />

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
    </MobileAppLayout>
  );
}
