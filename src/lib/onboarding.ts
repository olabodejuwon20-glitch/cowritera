/** First-run onboarding flag (per device). */
const KEY = "cr-onboarded-v1";

export function hasOnboarded() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
}
