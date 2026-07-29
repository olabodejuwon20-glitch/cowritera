import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers } from "@/lib/admin.functions";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }, { name: "description", content: "Manage users" }] }),
  component: UsersPage,
});

function UsersPage() {
  const fn = useServerFn(adminListUsers);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => fn() });
  const [q, setQ] = useState("");

  const rows = (data ?? []).filter((u: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.full_name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Every student account on the platform.</p>
      </header>
      <Tip>
        Suspending an account is safer than deleting it. Deleted data may not be recoverable. Search by name or email below.
      </Tip>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full sm:w-80 rounded-xl border bg-background px-3 py-2 text-sm"
      />

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {data && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">No users match your search.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs text-muted-foreground">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Institution</Th>
                  <Th>Projects</Th>
                  <Th>Active pass</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((u: any) => (
                  <tr key={u.id}>
                    <Td>{u.full_name || <span className="text-muted-foreground">Unnamed</span>}</Td>
                    <Td className="text-muted-foreground">{u.email}</Td>
                    <Td>{u.university || "—"}</Td>
                    <Td>{u.papers}</Td>
                    <Td>{u.active_paper ? <span className="text-primary">Yes</span> : "No"}</Td>
                    <Td className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 whitespace-nowrap ${className ?? ""}`}>{children}</td>;
}
