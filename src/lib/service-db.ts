/**
 * Privileged-optional database access.
 *
 * The app must run identically whether or not a service-role key exists in the
 * environment (Lovable Cloud provides one; other hosts may not). When it is
 * absent we fall back to the caller's own authenticated client, which is safe
 * because every privileged read is covered by an admin/owner RLS policy and
 * every privileged write goes through a SECURITY DEFINER database function.
 */
import { supabaseServiceRoleKey } from "@/integrations/supabase/env";

export function hasServiceRole(): boolean {
  return !!supabaseServiceRoleKey();
}

/** Returns the admin client when available, otherwise the caller's client. */
export async function serviceDb<T>(userClient: T): Promise<T> {
  if (!hasServiceRole()) return userClient;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin as unknown as T;
  } catch {
    return userClient;
  }
}

/** Emails via the Auth Admin API — only possible with a service-role key. */
export async function listUserEmails(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!hasServiceRole()) return map;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    for (const u of data?.users ?? []) map.set(u.id, u.email ?? "");
  } catch {
    /* no admin access — emails stay blank */
  }
  return map;
}
