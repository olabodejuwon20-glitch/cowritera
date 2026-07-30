-- Consolidated base schema for Co-Research AI (v3)
-- Order: enum -> helper -> user_roles table -> has_role -> policies -> other tables.

-- 1. Role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END$$;

-- 2. Updated-at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. User roles (must exist before has_role references it)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Role checker (created after user_roles table exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 5. Admin role policy (now safe to reference has_role)
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  university text,
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Papers
CREATE TABLE IF NOT EXISTS public.papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  course_code text NOT NULL,
  project jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO authenticated;
GRANT ALL ON public.papers TO service_role;

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own papers" ON public.papers;
CREATE POLICY "Users manage own papers" ON public.papers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS papers_set_updated_at ON public.papers;
CREATE TRIGGER papers_set_updated_at
BEFORE UPDATE ON public.papers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paper_id uuid REFERENCES public.papers(id) ON DELETE SET NULL,
  paystack_reference text,
  amount_kobo integer NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 9. AI generations
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paper_id uuid REFERENCES public.papers(id) ON DELETE CASCADE,
  kind text NOT NULL,
  prompt text,
  output text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ai_generations" ON public.ai_generations;
CREATE POLICY "Users read own ai_generations" ON public.ai_generations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own ai_generations" ON public.ai_generations;
CREATE POLICY "Users insert own ai_generations" ON public.ai_generations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 10. New-user handler: creates a profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Placeholder for rls_auto_enable referenced by later migration grants
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- no-op; keeps grant revocation in later migration valid
END;
$$;

-- 12. Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
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

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users read active coupons" ON public.coupons;
CREATE POLICY "Users read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

DROP TRIGGER IF EXISTS coupons_set_updated_at ON public.coupons;
CREATE TRIGGER coupons_set_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 13. Coupon redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
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

DROP POLICY IF EXISTS "Users read own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users read own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins read all redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 14. Redeem function
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
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) TO service_role;

-- 15. Founder admin trigger
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

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'olabodejuwon20@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 16. Lock down trigger/event functions from direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.grant_founder_admin() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
