import { z } from "zod";

export async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function withSignedUrls(rows: any[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(
    rows.map(async (r) => {
      if (!r.storage_path) return r;
      const { data } = await supabaseAdmin.storage
        .from("marketing-assets")
        .createSignedUrl(r.storage_path, 60 * 60 * 6);
      return { ...r, signed_url: data?.signedUrl ?? null };
    }),
  );
}

export const CodeInput = z.object({ code: z.string().min(3).max(20) });
export const IdInput = z.object({ id: z.string().uuid() });
export const TokenInput = z.object({ token: z.string().min(10).max(120) });

export const CampaignInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).nullable().optional(),
  starts_at: z.string().min(4),
  ends_at: z.string().min(4).nullable().optional(),
  commission_kobo: z.number().int().min(0).max(100_000_000),
  status: z.enum(["draft", "active", "paused", "ended"]),
  eligibility: z.string().max(2000).nullable().optional(),
});

export const InviteInput = z.object({
  email: z.string().trim().email().max(255),
  campaign_id: z.string().uuid().nullable().optional(),
});

export const PayoutInput = z.object({
  ambassador_id: z.string().uuid(),
  amount_kobo: z.number().int().min(100).max(100_000_000),
  note: z.string().max(300).nullable().optional(),
});

export const AnnouncementInput = z.object({
  campaign_id: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(160),
  body: z.string().min(2).max(4000),
});

export const ResourceInput = z.object({
  campaign_id: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(160),
  kind: z.enum(["flyer", "whatsapp", "video", "asset", "link"]),
  body: z.string().max(4000).nullable().optional(),
  url: z.string().url().max(1000).nullable().optional(),
  storage_path: z.string().max(400).nullable().optional(),
});

export function nairaFromKobo(kobo: number) {
  return (Number(kobo || 0) / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });
}
