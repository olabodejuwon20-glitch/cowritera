/**
 * Host-agnostic Supabase environment resolution.
 *
 * Works identically on Lovable Cloud and on any other host (Vercel, Netlify, …).
 * Every value can be provided under either the VITE_-prefixed or the plain name,
 * so a Vercel project only needs:
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (or *_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY
 * (VITE_ variants are also accepted and are inlined at build time by vite.config.ts).
 */

type Env = Record<string, string | undefined>;

function viteEnv(): Env {
  try {
    return (import.meta as unknown as { env?: Env }).env ?? {};
  } catch {
    return {};
  }
}

function nodeEnv(): Env {
  try {
    return typeof process !== "undefined" && process.env ? (process.env as Env) : {};
  } catch {
    return {};
  }
}

function pick(...names: string[]): string | undefined {
  const sources = [viteEnv(), nodeEnv()];
  for (const source of sources) {
    for (const name of names) {
      const value = source[name];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  return undefined;
}

export function supabaseUrl(): string | undefined {
  return pick("VITE_SUPABASE_URL", "SUPABASE_URL");
}

export function supabasePublishableKey(): string | undefined {
  return pick(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  );
}

export function supabaseServiceRoleKey(): string | undefined {
  return pick("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
}

export function missingEnvError(missing: string[]): Error {
  const message =
    `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
    `Set them in your hosting provider's environment variables (e.g. Vercel → Settings → Environment Variables).`;
  console.error(`[Supabase] ${message}`);
  return new Error(message);
}
