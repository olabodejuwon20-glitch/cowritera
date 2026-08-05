import { Link } from "@tanstack/react-router";

export default function HeroWorkspace({ project, projects }: { project: any; projects?: any[] }) {
  const progress = project?.progress ?? Math.floor(Math.random() * 80) + 10;
  const total = projects?.length ?? 0;
  const unlocked = projects?.filter((p) => p.paid).length ?? 0;
  const exportsCount = projects?.reduce((acc, p) => acc + (p.exports_count ?? 0), 0) ?? 0;

  return (
    <section className="mx-4 mt-4">
      <div className="rounded-[20px] p-5 bg-gradient-to-r from-purple-700 to-purple-600 text-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm uppercase opacity-90">Welcome back</div>
            <h3 className="text-xl font-semibold mt-1">{project?.topic || "Untitled project"}</h3>

            <div className="mt-3 w-full max-w-xs">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-2 bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs opacity-90">{progress}% Complete</div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link to={`/paper/${project?.id}`} className="rounded-lg bg-white text-purple-700 px-4 py-2 font-medium shadow">Continue Editing</Link>
              <Link to="/new" className="rounded-lg border border-white/30 px-4 py-2 text-white">Create New Project</Link>
            </div>
          </div>

          <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center">📄</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-3 text-center text-sm">
            <div className="text-xs text-muted-foreground">Projects</div>
            <div className="mt-1 font-semibold">{total}</div>
          </div>
          <div className="rounded-2xl border bg-card p-3 text-center text-sm">
            <div className="text-xs text-muted-foreground">Unlocked</div>
            <div className="mt-1 font-semibold">{unlocked}</div>
          </div>
          <div className="rounded-2xl border bg-card p-3 text-center text-sm">
            <div className="text-xs text-muted-foreground">Exports</div>
            <div className="mt-1 font-semibold">{exportsCount}</div>
          </div>
        </div>
      </div>

      <section className="mt-4">
        <h4 className="text-sm font-medium mb-2">Recent Projects</h4>
        <div className="space-y-3">
          {projects?.slice(0,3).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{p.course_code}</div>
                <div className="font-medium truncate">{p.topic}</div>
                <div className="text-xs text-muted-foreground">Updated {new Date(p.updated_at).toLocaleDateString()}</div>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <Link to={`/paper/${p.id}`} className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">Continue</Link>
                <button className="rounded-md border px-2 py-1 text-xs">Duplicate</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
