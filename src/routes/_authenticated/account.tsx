import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  User, LogOut, Shield, Download, Bell, BellOff, Wifi, WifiOff,   FileText, HelpCircle, Wallet, ChevronRight, Smartphone,
} from "lucide-react";
import { MobileAppLayout, Card, PageTitle } from "@/components/mobile-app-layout";
import { useSession, signOut } from "@/lib/auth";
import { amIAdmin } from "@/lib/admin.functions";
import { listPapers } from "@/lib/papers.functions";
import { useInstallPrompt, useOnline, useMounted } from "@/lib/use-pwa";
import { requestNotifications, notify, tap } from "@/lib/offline";
import { isStandalone } from "@/lib/pwa";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Co-Research AI" },
      { name: "description", content: "Manage your Co-Research AI account, app install, notifications and offline settings." },
      { property: "og:title", content: "Account — Co-Research AI" },
      { property: "og:description", content: "Manage your Co-Research AI account and app settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const mounted = useMounted();
  const online = useOnline();
  const { canInstall, installed, install } = useInstallPrompt();
  const [perm, setPerm] = useState<NotificationPermission>("default");

  const adminFn = useServerFn(amIAdmin);
  const papersFn = useServerFn(listPapers);
  const { data: adminData } = useQuery({ queryKey: ["is-admin"], queryFn: () => adminFn(), enabled: !!user });
  const { data: papers } = useQuery({ queryKey: ["papers"], queryFn: () => papersFn(), enabled: !!user });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPerm(Notification.permission);
  }, []);

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const paid = papers?.filter((p) => p.paid).length ?? 0;

  return (
    <MobileAppLayout
      title="Settings"
      status="Account & app preferences"
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Settings" }]}
    >
      <PageTitle eyebrow="System" title="Settings" description="Manage your profile, install options, notifications and offline access." />

      <Card>
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{user?.email ?? "Signed in"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {papers?.length ?? 0} project{(papers?.length ?? 0) === 1 ? "" : "s"} · {paid} unlocked
            </div>
          </div>
        </div>
      </Card>

      {/* App section */}
      <Section title="App">
        <Row
          icon={installed || (mounted && isStandalone()) ? Smartphone : Download}
          label={installed || (mounted && isStandalone()) ? "Installed on this device" : "Install to home screen"}
          hint={
            installed || (mounted && isStandalone())
              ? "Running in app mode"
              : canInstall
                ? "Tap to install"
                : "Use your browser's “Add to Home Screen”"
          }
          onClick={canInstall ? () => void install() : undefined}
        />
        <Row
          icon={perm === "granted" ? Bell : BellOff}
          label="Notifications"
          hint={perm === "granted" ? "Enabled — we'll ping you when drafts finish" : perm === "denied" ? "Blocked in browser settings" : "Tap to enable"}
          onClick={
            perm === "granted"
              ? () => void notify("Co-Research AI", "Notifications are working.")
              : async () => setPerm(await requestNotifications())
          }
        />
      </Section>

      <Section title="Workspace">
        <LinkRow to="/dashboard" icon={FileText} label="My papers" />
        <LinkRow to="/pricing" icon={Wallet} label="Project Pass & pricing" />
        <LinkRow to="/faq" icon={HelpCircle} label="Help & FAQ" />
        {adminData?.admin && <LinkRow to="/admin" icon={Shield} label="Admin panel" />}
      </Section>

      <div>
        <button
          onClick={async () => {
            tap();
            await signOut();
            navigate({ to: "/" });
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium active:scale-[0.99] active:bg-primary-soft transition"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          <User className="mr-1 inline h-3 w-3" /> Co-Research AI · built for students
        </p>
      </div>
    </MobileAppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-3xl border bg-card">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon, label, hint, onClick,
}: { icon: typeof User; label: string; hint?: string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full min-h-14 items-center gap-3 px-4 text-left ${onClick ? "active:bg-primary-soft" : ""}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </Comp>
  );
}

function LinkRow({ to, icon: Icon, label }: { to: string; icon: typeof User; label: string }) {
  return (
    <Link to={to as never} className="flex min-h-14 items-center gap-3 px-4 active:bg-primary-soft">
      <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-sm">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
