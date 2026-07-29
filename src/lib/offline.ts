import { get, set, del } from "idb-keyval";

/* ------------------------------------------------------------------ *
 * Offline outbox — queued section saves that flush when back online.
 * ------------------------------------------------------------------ */

export type PendingSave = {
  id: string;
  paper_id: string;
  section_key: string;
  content: string;
  queued_at: number;
};

const OUTBOX_KEY = "coresearch.outbox.v1";

export async function readOutbox(): Promise<PendingSave[]> {
  try {
    return ((await get(OUTBOX_KEY)) as PendingSave[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function enqueueSave(item: Omit<PendingSave, "id" | "queued_at">) {
  const outbox = await readOutbox();
  // keep one pending entry per (paper, section)
  const next = outbox.filter((o) => !(o.paper_id === item.paper_id && o.section_key === item.section_key));
  next.push({ ...item, id: `${item.paper_id}:${item.section_key}`, queued_at: Date.now() });
  await set(OUTBOX_KEY, next);
  notifyOutbox(next.length);
}

export async function clearOutbox() {
  await del(OUTBOX_KEY);
  notifyOutbox(0);
}

type Sender = (item: PendingSave) => Promise<unknown>;

let flushing = false;

export async function flushOutbox(send: Sender): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let done = 0;
  try {
    let outbox = await readOutbox();
    for (const item of [...outbox]) {
      try {
        await send(item);
        outbox = outbox.filter((o) => o.id !== item.id);
        await set(OUTBOX_KEY, outbox);
        done += 1;
      } catch {
        break; // stop on first failure; retry later
      }
    }
    notifyOutbox(outbox.length);
  } finally {
    flushing = false;
  }
  return done;
}

/* Pending-count pub/sub so the shell can show a "Syncing…" chip. */
const listeners = new Set<(n: number) => void>();
function notifyOutbox(n: number) {
  listeners.forEach((l) => l(n));
}
export function subscribeOutbox(fn: (n: number) => void) {
  listeners.add(fn);
  void readOutbox().then((o) => fn(o.length));
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------------ *
 * Native-style notifications
 * ------------------------------------------------------------------ */

export async function requestNotifications(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function notify(title: string, body: string, tag = "coresearch") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ *
 * Haptics
 * ------------------------------------------------------------------ */

export function tap(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}
