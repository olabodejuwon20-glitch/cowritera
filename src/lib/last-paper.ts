const KEY = "coresearch.lastPaper.v1";

export function setLastPaper(id: string, topic?: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, topic: topic ?? "" }));
  } catch {
    /* noop */
  }
}

export function getLastPaper(): { id: string; topic: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { id: string; topic: string }) : null;
  } catch {
    return null;
  }
}
