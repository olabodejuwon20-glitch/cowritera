REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, public;

DROP POLICY IF EXISTS "Users read active coupons" ON public.coupons;
CREATE POLICY "Users read active coupons" ON public.coupons
FOR SELECT TO authenticated
USING (active = true AND (expires_at IS NULL OR expires_at > now()));