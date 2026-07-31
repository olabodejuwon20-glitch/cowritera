// Server-only helper: credits an ambassador commission after a VERIFIED payment.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Credits the referring ambassador once a referred user completes a verified
 * payment. Idempotent: a referral row can only be credited once.
 */
export async function creditReferralOnVerifiedPayment(referredUserId: string) {
  const { data: referral } = await supabaseAdmin
    .from("referrals")
    .select("id, ambassador_id, campaign_id, status")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (!referral || referral.status === "paid") return { credited: false };

  let commission = 50_000;
  if (referral.campaign_id) {
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("commission_kobo")
      .eq("id", referral.campaign_id)
      .maybeSingle();
    if (campaign?.commission_kobo != null) commission = Number(campaign.commission_kobo);
  }

  await supabaseAdmin
    .from("referrals")
    .update({
      status: "paid",
      commission_kobo: commission,
      credited_at: new Date().toISOString(),
    })
    .eq("id", referral.id)
    .neq("status", "paid");

  return { credited: true, commission_kobo: commission };
}
