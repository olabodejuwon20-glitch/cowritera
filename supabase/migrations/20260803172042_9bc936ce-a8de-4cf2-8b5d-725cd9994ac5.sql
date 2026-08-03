-- Trigger/event-trigger helpers: never called directly by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_founder_admin() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- Superseded by server-side redemption logic
REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid) FROM anon, authenticated;

-- Signed-in only routines: drop anonymous access
REVOKE ALL ON FUNCTION public.attach_referral(text) FROM anon;
REVOKE ALL ON FUNCTION public.accept_ambassador_invite(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.coupon_quote(text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_referral_for_user(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.attach_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_ambassador_invite(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coupon_quote(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral_for_user(uuid) TO authenticated;

-- Public referral-click tracking stays callable by visitors
GRANT EXECUTE ON FUNCTION public.track_referral_click(text) TO anon, authenticated;