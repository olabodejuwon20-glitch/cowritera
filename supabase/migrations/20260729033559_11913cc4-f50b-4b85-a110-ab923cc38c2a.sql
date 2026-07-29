
DROP TABLE IF EXISTS public.project_sections;
DROP TABLE IF EXISTS public.projects;

-- Narrow SELECT policy for coupons: authenticated users can see only active, non-expired codes.
CREATE POLICY "Users read active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Restrict redeem_coupon: only service_role can invoke; server functions call via admin client.
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) TO service_role;
