const KEY = "cra:referral-code";
const INVITE_KEY = "cra:ambassador-invite";

export function storeReferralCode(code: string) {
  try {
    localStorage.setItem(KEY, code.toUpperCase());
  } catch {
    /* ignore */
  }
}

export function readReferralCode(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function storeInviteToken(token: string) {
  try {
    localStorage.setItem(INVITE_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readInviteToken(): string | null {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearInviteToken() {
  try {
    localStorage.removeItem(INVITE_KEY);
  } catch {
    /* ignore */
  }
}
