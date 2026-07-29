import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, AppBar, MenuDrawer } from "@/components/app-shell";
import { useState } from "react";
import { Menu } from "lucide-react";
import { listPapers } from "@/lib/papers.functions";
import { Plus, FileText, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your papers — Co-Research AI" },
      { name: "description", content: "Your Co-Research AI dashboard. See all your term paper projects." },
      { property: "og:title", content: "Your papers — Co-Research AI" },
      { property: "og:description", content: "Your Co-Research AI dashboard." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchPapers = useServerFn(listPapers);
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["papers"],
    queryFn: () => fetchPapers(),
  });

  return (
    <AppShell
      appBar={
        <AppBar
          title="Your papers"
          subtitle="Each Project Pass unlocks one project"
          leading={
            <button
              aria-label="Open menu"
              onClick={() => setMenu(true)}
              className="grid h-11 w-11 place-items-center rounded-full active:scale-95 active:bg-primary-soft transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          }
        />
      }
    >
      <MenuDrawer open={menu} onOpenChange={setMenu} />
      <div className="px-4 py-5">
        <div className="mt-0">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}
          {data && data.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <h2 className="mt-3 font-medium">No papers yet</h2>
              <p className="text-sm text-muted-foreground mt-1">Start a new project to begin writing with Co-Research AI.</p>
              <button
                onClick={() => navigate({ to: "/new" })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Create your first paper
              </button>
            </div>
          )}
          {data && data.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/paper/$id"
                    params={{ id: p.id }}
                    className="block rounded-3xl border bg-card p-5 transition active:scale-[0.99] active:bg-primary-soft"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.course_code}</span>
                      {p.paid ? (
                        <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Awaiting payment</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium line-clamp-2">{p.topic || "Untitled paper"}</h3>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Updated {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
