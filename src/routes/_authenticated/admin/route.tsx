import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin.functions";
import { MobileAppLayout, Card } from "@/components/mobile-app-layout";
import { LayoutDashboard, Users, FolderKanban, Wallet, Ticket, HelpCircle, Loader2, ShieldAlert, Megaphone } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/finance", label: "Finance", icon: Wallet },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/ambassadors", label: "Ambassadors", icon: Megaphone },
  { to: "/admin/help", label: "Help", icon: HelpCircle },
];

function AdminLayout() {
  const fn = useServerFn(amIAdmin);
  const { data, isLoading, error } = useQuery({ queryKey: ["is-admin"], queryFn: () => fn() });
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && data && !data.admin) navigate({ to: "/dashboard" });
  }, [isLoading, data, navigate]);

  const current = NAV.find((n) => (n.exact ? location === n.to : location.startsWith(n.to)));

  if (isLoading) {
    return (
      <MobileAppLayout title="Admin" status="Checking access">
        <Card className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </Card>
      </MobileAppLayout>
    );
  }
  if (error || !data?.admin) {
    return (
      <MobileAppLayout title="Admin" status="Restricted">
        <Card className="py-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h1 className="mt-3 text-xl font-semibold">Admin only</h1>
          <p className="mt-1 text-sm text-muted-foreground">You don't have admin access on this account.</p>
        </Card>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      title="Admin panel"
      status={current?.label ?? "Overview"}
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Admin", to: "/admin" }, { label: current?.label ?? "Overview" }]}
      wide
    >
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-3xl border bg-card p-1.5 shadow-[var(--shadow-soft)]">
        {NAV.map((n) => {
          const active = n.exact ? location === n.to : location.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to as any}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-sm whitespace-nowrap transition ${
                active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-primary-soft"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </div>
      <div className="min-w-0">
        <Outlet />
      </div>
    </MobileAppLayout>
  );
}
