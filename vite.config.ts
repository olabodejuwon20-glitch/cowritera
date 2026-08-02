// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";

/**
 * Host-agnostic Supabase config.
 * Works on Lovable Cloud (VITE_* in .env) and on Vercel, where the project may
 * only define SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (or *_ANON_KEY).
 */
const fileEnv = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
/** Host env vars (Vercel, Netlify, …) always win over the committed .env file. */
const pick = (...names: string[]) =>
  names.map((n) => process.env[n]).find(Boolean) ?? names.map((n) => fileEnv[n]).find(Boolean);

const supabaseUrl = pick("VITE_SUPABASE_URL", "SUPABASE_URL");
const supabaseKey = pick(
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
);

const define: Record<string, string> = {};
if (supabaseUrl) define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(supabaseUrl);
if (supabaseKey) define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(supabaseKey);


export default defineConfig({

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define,

    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        manifestFilename: "manifest.webmanifest",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "cra-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              urlPattern: ({ url, request, sameOrigin }) =>
                sameOrigin &&
                !url.pathname.startsWith("/api/") &&
                (request.destination === "script" ||
                  request.destination === "style" ||
                  request.destination === "font" ||
                  request.destination === "image"),
              handler: "CacheFirst",
              options: {
                cacheName: "cra-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com" || url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "cra-fonts", expiration: { maxEntries: 30 } },
            },
          ],
        },
      }),
    ],
  },
});
