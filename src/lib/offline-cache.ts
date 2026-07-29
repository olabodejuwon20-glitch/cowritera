import type { QueryClient } from "@tanstack/react-query";

/**
 * Persists the React Query cache to IndexedDB so previously loaded papers,
 * dashboards and admin data stay readable offline. Client-only.
 */
export async function setupOfflineCache(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  try {
    const [{ persistQueryClient }, { createAsyncStoragePersister }, idb] = await Promise.all([
      import("@tanstack/react-query-persist-client"),
      import("@tanstack/query-async-storage-persister"),
      import("idb-keyval"),
    ]);

    const persister = createAsyncStoragePersister({
      storage: {
        getItem: (key) => idb.get(key).then((v) => (v as string) ?? null),
        setItem: (key, value) => idb.set(key, value),
        removeItem: (key) => idb.del(key),
      },
      key: "coresearch.query-cache.v1",
      throttleTime: 1000,
    });

    await persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 14,
      buster: "v1",
    });
  } catch {
    /* offline cache is best-effort */
  }
}
