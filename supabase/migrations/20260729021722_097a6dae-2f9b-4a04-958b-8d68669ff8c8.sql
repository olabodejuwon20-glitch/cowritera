-- Trigger/event-trigger only functions: no direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.grant_founder_admin() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;

-- Application functions: signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) TO authenticated, service_role;