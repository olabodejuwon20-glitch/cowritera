import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPapers } from "@/lib/admin.functions";
import { FolderKanban, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  head: () => ({ meta: [{ title: "Projects — Admin" }, { name: "description", content: "All projects" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const fn = useServerFn(adminListPapers);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-papers"], queryFn: () => fn() });
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "paid">("all");

  const rows = (data ?? []).filter((p: any) => {
    if (filter === "all") return true;
    if (filter === "paid") return p.paid;
    if (filter === "active") return p.status === "active";
    if (filter === "draft") return p.status === "draft";
    return true;
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">All student projects across the platform.</p>
      </header>
      <Tip>
        Only remove projects when absolutely necessary. Archived projects remain available for future reference.
      </Tip>
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "draft", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary-soft"}`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}
      {data && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">No projects match this filter.</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Topic</th>
                <th className="text-left px-4 py-2 font-medium">Course</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Paid</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
                <th className="text-left px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 max-w-md truncate">{p.topic || "Untitled"}</td>
                  <td className="px-4 py-2">{p.course_code}</td>
                  <td className="px-4 py-2">{p.status}</td>
                  <td className="px-4 py-2">{p.paid ? <span className="text-primary">Yes</span> : "No"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
