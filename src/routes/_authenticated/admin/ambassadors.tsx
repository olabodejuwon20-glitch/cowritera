import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateAnnouncement, adminDeleteAnnouncement, adminDeleteResource, adminInviteAmbassador,
  adminListAmbassadors, adminListAnnouncements, adminListCampaigns, adminListInvites,
  adminListResources, adminRecordPayout, adminRevokeInvite, adminSaveCampaign, adminSaveResource,
} from "@/lib/ambassadors.functions";
import { nairaFromKobo } from "@/lib/ambassadors.shared";
import { Loader2, Plus, Trash2, Copy, Megaphone, Users, Ticket, Wallet } from "lucide-react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/ambassadors")({
  head: () => ({ meta: [{ title: "Ambassadors — Admin" }, { name: "description", content: "Manage campaigns, invitations, resources and payouts" }] }),
  component: AmbassadorsAdmin,
});

const TABS = ["Campaigns", "Invitations", "Ambassadors", "Resources", "Announcements"] as const;

function AmbassadorsAdmin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Campaigns");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Campus Ambassadors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run invitation-only referral campaigns, equip ambassadors with marketing assets and settle their payouts.
        </p>
      </header>
      <Tip>
        Commission is credited automatically only after a referred student completes a <strong>verified payment</strong>.
      </Tip>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm ${tab === t ? "bg-primary text-primary-foreground" : "border hover:bg-surface"}`}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Campaigns" && <CampaignsTab />}
      {tab === "Invitations" && <InvitesTab />}
      {tab === "Ambassadors" && <AmbassadorsTab />}
      {tab === "Resources" && <ResourcesTab />}
      {tab === "Announcements" && <AnnouncementsTab />}
    </div>
  );
}

function useCampaigns() {
  const list = useServerFn(adminListCampaigns);
  return useQuery({ queryKey: ["admin-campaigns"], queryFn: () => list() });
}

function CampaignsTab() {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveCampaign);
  const { data, isLoading } = useCampaigns();
  const [form, setForm] = useState<any>(null);

  const saveM = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); setForm(null); toast.success("Campaign saved"); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <button
        onClick={() => setForm({ name: "", description: "", starts_at: new Date().toISOString().slice(0, 10), ends_at: "", commission_naira: 500, status: "draft", eligibility: "" })}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
      >
        <Plus className="h-4 w-4" /> New campaign
      </button>

      {form && (
        <form
          className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveM.mutate({
              id: form.id,
              name: form.name,
              description: form.description || null,
              starts_at: new Date(form.starts_at).toISOString(),
              ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
              commission_kobo: Math.round(Number(form.commission_naira) * 100),
              status: form.status,
              eligibility: form.eligibility || null,
            });
          }}
        >
          <Field label="Campaign name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Commission per paid referral (₦)" type="number" value={form.commission_naira} onChange={(v) => setForm({ ...form, commission_naira: v })} required />
          <Field label="Starts" type="date" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} required />
          <Field label="Ends" type="date" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })} />
          <label className="text-sm">
            <span className="text-muted-foreground">Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
              {["draft", "active", "paused", "ended"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <Field label="Eligibility rules" value={form.eligibility} onChange={(v) => setForm({ ...form, eligibility: v })} />
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border bg-background px-3 py-2" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saveM.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {saveM.isPending ? "Saving…" : "Save campaign"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((c: any) => (
          <li key={c.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.status}</p>
              </div>
              <button
                onClick={() => setForm({
                  id: c.id, name: c.name, description: c.description ?? "",
                  starts_at: String(c.starts_at).slice(0, 10),
                  ends_at: c.ends_at ? String(c.ends_at).slice(0, 10) : "",
                  commission_naira: Number(c.commission_kobo) / 100,
                  status: c.status, eligibility: c.eligibility ?? "",
                })}
                className="rounded-lg border px-2 py-1 text-xs hover:bg-surface"
              >Edit</button>
            </div>
            <p className="mt-2 text-sm">{nairaFromKobo(c.commission_kobo)} per paid referral</p>
            {c.ends_at && <p className="text-xs text-muted-foreground">Ends {new Date(c.ends_at).toLocaleDateString()}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvitesTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListInvites);
  const invite = useServerFn(adminInviteAmbassador);
  const revoke = useServerFn(adminRevokeInvite);
  const { data, isLoading } = useQuery({ queryKey: ["admin-invites"], queryFn: () => list() });
  const campaigns = useCampaigns();
  const [email, setEmail] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const inviteM = useMutation({
    mutationFn: (v: any) => invite({ data: v }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
      setEmail("");
      const url = `${window.location.origin}/invite/${res.token}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Invitation created — link copied to clipboard");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const revokeM = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invites"] }),
  });

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr,1fr,auto]"
        onSubmit={(e) => { e.preventDefault(); inviteM.mutate({ email, campaign_id: campaignId || null }); }}
      >
        <Field label="Ambassador email" type="email" value={email} onChange={setEmail} required />
        <label className="text-sm">
          <span className="text-muted-foreground">Campaign</span>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            <option value="">No campaign</option>
            {(campaigns.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button disabled={inviteM.isPending} className="self-end rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {inviteM.isPending ? "Creating…" : "Invite"}
        </button>
      </form>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-xs text-muted-foreground">
            <tr><Th>Email</Th><Th>Status</Th><Th>Expires</Th><Th>Link</Th><Th /></tr>
          </thead>
          <tbody>
            {(data ?? []).map((i: any) => (
              <tr key={i.id} className="border-t">
                <Td>{i.email}</Td>
                <Td className="capitalize">{i.status}</Td>
                <Td>{new Date(i.expires_at).toLocaleDateString()}</Td>
                <Td>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invite/${i.token}`); toast.success("Invite link copied"); }}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-surface"
                  ><Copy className="h-3 w-3" /> Copy</button>
                </Td>
                <Td>
                  {i.status === "pending" && (
                    <button onClick={() => revokeM.mutate(i.id)} className="rounded-lg border px-2 py-1 text-xs text-destructive hover:bg-destructive/5">Revoke</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AmbassadorsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListAmbassadors);
  const payout = useServerFn(adminRecordPayout);
  const { data, isLoading } = useQuery({ queryKey: ["admin-ambassadors"], queryFn: () => list() });
  const payoutM = useMutation({
    mutationFn: (v: any) => payout({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-ambassadors"] }); toast.success("Payout recorded"); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-xs text-muted-foreground">
          <tr><Th>Ambassador</Th><Th>Code</Th><Th>Signups</Th><Th>Paid</Th><Th>Earned</Th><Th>Pending</Th><Th /></tr>
        </thead>
        <tbody>
          {(data ?? []).map((a: any) => (
            <tr key={a.id} className="border-t">
              <Td><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.email}</div></Td>
              <Td><code>{a.referral_code}</code></Td>
              <Td>{a.registrations}</Td>
              <Td>{a.paid_referrals}</Td>
              <Td>{nairaFromKobo(a.earned_kobo)}</Td>
              <Td>{nairaFromKobo(a.pending_kobo)}</Td>
              <Td>
                <button
                  disabled={a.pending_kobo <= 0 || payoutM.isPending}
                  onClick={() => payoutM.mutate({ ambassador_id: a.id, amount_kobo: a.pending_kobo, note: "Manual settlement" })}
                  className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40 hover:bg-surface"
                >Mark paid</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No ambassadors yet — send an invitation.</p>}
    </div>
  );
}

function ResourcesTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListResources);
  const save = useServerFn(adminSaveResource);
  const del = useServerFn(adminDeleteResource);
  const campaigns = useCampaigns();
  const { data, isLoading } = useQuery({ queryKey: ["admin-resources"], queryFn: () => list() });
  const [form, setForm] = useState({ title: "", kind: "flyer", body: "", url: "", campaign_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-resources"] }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let storage_path: string | null = null;
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("marketing-assets").upload(path, file);
        if (error) throw new Error(error.message);
        storage_path = path;
      }
      await save({
        data: {
          title: form.title,
          kind: form.kind as any,
          body: form.body || null,
          url: form.url || null,
          storage_path,
          campaign_id: form.campaign_id || null,
        },
      });
      setForm({ title: "", kind: "flyer", body: "", url: "", campaign_id: "" });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      toast.success("Resource published to ambassadors");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
        <label className="text-sm">
          <span className="text-muted-foreground">Type</span>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            {["flyer", "whatsapp", "video", "asset", "link"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-muted-foreground">Message / caption (use {"{{link}}"} to insert the ambassador&apos;s link)</span>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border bg-background px-3 py-2" />
        </label>
        <Field label="External URL (optional)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
        <label className="text-sm">
          <span className="text-muted-foreground">Upload file (flyer, video, asset)</span>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Campaign</span>
          <select value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            <option value="">All campaigns</option>
            {(campaigns.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {busy ? "Publishing…" : "Publish resource"}
          </button>
        </div>
      </form>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((r: any) => (
          <li key={r.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.title}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.kind}</p>
              </div>
              <button onClick={() => delM.mutate(r.id)} className="rounded-lg border px-2 py-1 text-xs text-destructive hover:bg-destructive/5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {r.body && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>}
            {(r.signed_url || r.url) && (
              <a href={r.signed_url || r.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">Preview</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnnouncementsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListAnnouncements);
  const create = useServerFn(adminCreateAnnouncement);
  const del = useServerFn(adminDeleteAnnouncement);
  const campaigns = useCampaigns();
  const { data, isLoading } = useQuery({ queryKey: ["admin-announcements"], queryFn: () => list() });
  const [form, setForm] = useState({ title: "", body: "", campaign_id: "" });

  const createM = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-announcements"] }); setForm({ title: "", body: "", campaign_id: "" }); toast.success("Announcement posted"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border bg-card p-4"
        onSubmit={(e) => { e.preventDefault(); createM.mutate({ ...form, campaign_id: form.campaign_id || null }); }}
      >
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
        <label className="text-sm">
          <span className="text-muted-foreground">Message</span>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} required className="mt-1 w-full rounded-xl border bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Campaign</span>
          <select value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            <option value="">All ambassadors</option>
            {(campaigns.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div>
          <button disabled={createM.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {createM.isPending ? "Posting…" : "Post announcement"}
          </button>
        </div>
      </form>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      <ul className="space-y-3">
        {(data ?? []).map((a: any) => (
          <li key={a.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </div>
              <button onClick={() => delM.mutate(a.id)} className="rounded-lg border px-2 py-1 text-xs text-destructive hover:bg-destructive/5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: any; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
      />
    </label>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 text-left font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

export const AmbassadorIcons = { Megaphone, Users, Ticket, Wallet };
