REVOKE ALL ON FUNCTION public.track_referral_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_referral_click(text) TO anon, authenticated, service_role;