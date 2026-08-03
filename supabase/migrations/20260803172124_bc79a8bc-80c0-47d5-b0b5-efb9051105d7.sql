REVOKE ALL ON FUNCTION public.attach_referral(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_ambassador_invite(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coupon_quote(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.credit_referral_for_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_founder_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.attach_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_ambassador_invite(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coupon_quote(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_referral(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_ambassador_invite(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.coupon_quote(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_referral_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_referral_click(text) TO anon, authenticated, service_role;