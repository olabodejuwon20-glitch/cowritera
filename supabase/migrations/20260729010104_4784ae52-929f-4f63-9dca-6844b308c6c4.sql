
-- 1. Grant admin role to the founder account (now + on future signup/confirmation)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'olabodejuwon20@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_founder_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'olabodejuwon20@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_founder ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_founder
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_founder_admin();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_founder ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_founder
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_founder_admin();

-- 2. Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('full_unlock','discount')),
  discount_percent integer CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  discount_amount_kobo integer CHECK (discount_amount_kobo IS NULL OR discount_amount_kobo >= 0),
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER coupons_set_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paper_id uuid,
  amount_discount_kobo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id, paper_id)
);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Redeem function (server-side atomic redemption, respects RLS bypass via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text, _paper_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _c public.coupons%ROWTYPE;
  _paper_owner uuid;
  _paper_paid boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, paid INTO _paper_owner, _paper_paid
  FROM public.papers WHERE id = _paper_id;
  IF _paper_owner IS NULL THEN
    RAISE EXCEPTION 'Paper not found';
  END IF;
  IF _paper_owner <> _uid THEN
    RAISE EXCEPTION 'Not your paper';
  END IF;
  IF _paper_paid THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  SELECT * INTO _c FROM public.coupons WHERE lower(code) = lower(_code) FOR UPDATE;
  IF _c.id IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  IF NOT _c.active THEN
    RAISE EXCEPTION 'Code is not active';
  END IF;
  IF _c.expires_at IS NOT NULL AND _c.expires_at < now() THEN
    RAISE EXCEPTION 'Code has expired';
  END IF;
  IF _c.max_uses IS NOT NULL AND _c.uses >= _c.max_uses THEN
    RAISE EXCEPTION 'Code has reached its usage limit';
  END IF;

  IF _c.type = 'full_unlock' THEN
    UPDATE public.papers SET paid = true, status = 'active' WHERE id = _paper_id;
    UPDATE public.coupons SET uses = uses + 1 WHERE id = _c.id;
    INSERT INTO public.coupon_redemptions (coupon_id, user_id, paper_id, amount_discount_kobo)
    VALUES (_c.id, _uid, _paper_id, 350000)
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'type', 'full_unlock', 'unlocked', true);
  ELSE
    -- discount: return the computed discount; checkout will use it
    RETURN jsonb_build_object(
      'ok', true,
      'type', 'discount',
      'discount_percent', _c.discount_percent,
      'discount_amount_kobo', _c.discount_amount_kobo,
      'coupon_id', _c.id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) TO authenticated;

-- 5. Admin visibility on existing tables (profiles/papers/payments already have admin SELECT; user_roles doesn't yet)
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
