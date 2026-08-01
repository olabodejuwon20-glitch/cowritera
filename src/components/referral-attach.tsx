import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { attachReferral } from "@/lib/ambassadors.functions";
import { clearReferralCode, readReferralCode } from "@/lib/referral-code";

/**
 * Attaches a stored referral code to the signed-in user. Mounted on the whole
 * authenticated layout so attribution never depends on visiting the dashboard.
 * The stored code is only cleared once the server gives a definitive answer.
 */
export function ReferralAttach() {
  const attach = useServerFn(attachReferral);

  useEffect(() => {
    const code = readReferralCode();
    if (!code) return;
    let cancelled = false;
    attach({ data: { code } })
      .then(() => {
        if (!cancelled) clearReferralCode();
      })
      .catch(() => {
        /* keep the code and retry on the next authenticated page load */
      });
    return () => {
      cancelled = true;
    };
  }, [attach]);

  return null;
}
