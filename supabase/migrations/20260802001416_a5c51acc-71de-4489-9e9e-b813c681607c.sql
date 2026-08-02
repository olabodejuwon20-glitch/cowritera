-- Admin read access (replaces service-role usage)
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all papers" ON public.papers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Ambassadors read own clicks" ON public.referral_clicks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = referral_clicks.ambassador_id AND a.user_id = auth.uid()));

-- Referral click tracking (public, no auth)
CREATE OR REPLACE FUNCTION public.track_referral_click(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _amb public.ambassadors%ROWTYPE;
BEGIN
  SELECT * INTO _amb FROM public.ambassadors WHERE referral_code = upper(trim(_code));
  IF _amb.id IS NULL OR _amb.status <> 'active' THEN RETURN false; END IF;
  INSERT INTO public.referral_clicks (ambassador_id, referral_code) VALUES (_amb.id, upper(trim(_code)));
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.track_referral_click(text) TO anon, authenticated;

-- Attach a referral to the calling user
CREATE OR REPLACE FUNCTION public.attach_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _amb public.ambassadors%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;
  SELECT * INTO _amb FROM public.ambassadors WHERE referral_code = upper(trim(_code));
  IF _amb.id IS NULL OR _amb.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF _amb.user_id = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;
  INSERT INTO public.referrals (ambassador_id, campaign_id, referred_user_id, status)
  VALUES (_amb.id, _amb.campaign_id, _uid, 'registered');
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.attach_referral(text) TO authenticated;

-- Accept an ambassador invitation
CREATE OR REPLACE FUNCTION public.accept_ambassador_invite(_token text, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _inv public.ambassador_invites%ROWTYPE; _code text; _existing text; _try int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.ambassador_invites WHERE token = _token;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'This invitation link is not valid.'; END IF;
  IF _inv.status = 'revoked' THEN RAISE EXCEPTION 'This invitation has been revoked.'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'This invitation has expired.'; END IF;
  IF lower(_inv.email) <> lower(coalesce(_email, '')) THEN
    RAISE EXCEPTION 'This invitation was sent to %. Sign in with that email to accept it.', _inv.email;
  END IF;

  SELECT referral_code INTO _existing FROM public.ambassadors WHERE user_id = _uid;
  IF _existing IS NOT NULL THEN
    _code := _existing;
  ELSE
    WHILE _code IS NULL AND _try < 8 LOOP
      _try := _try + 1;
      BEGIN
        _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
        INSERT INTO public.ambassadors (user_id, campaign_id, referral_code) VALUES (_uid, _inv.campaign_id, _code);
      EXCEPTION WHEN unique_violation THEN _code := NULL;
      END;
    END LOOP;
    IF _code IS NULL THEN RAISE EXCEPTION 'Could not generate a referral code. Please try again.'; END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'ambassador') ON CONFLICT (user_id, role) DO NOTHING;

  IF _inv.status <> 'accepted' THEN
    UPDATE public.ambassador_invites
       SET status = 'accepted', accepted_by = _uid, accepted_at = now()
     WHERE id = _inv.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_code', _code);
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_ambassador_invite(text, text) TO authenticated;

-- Coupon quote (no coupon rows exposed)
CREATE OR REPLACE FUNCTION public.coupon_quote(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.coupons%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid', false); END IF;
  SELECT * INTO _c FROM public.coupons WHERE lower(code) = lower(trim(_code));
  IF _c.id IS NULL OR NOT _c.active THEN RETURN jsonb_build_object('valid', false); END IF;
  IF _c.expires_at IS NOT NULL AND _c.expires_at < now() THEN RETURN jsonb_build_object('valid', false); END IF;
  IF _c.max_uses IS NOT NULL AND coalesce(_c.uses, 0) >= _c.max_uses THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'id', _c.id,
    'type', _c.type,
    'discount_percent', _c.discount_percent,
    'discount_amount_kobo', _c.discount_amount_kobo
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.coupon_quote(text) TO authenticated;

-- Credit an ambassador commission after the referred user has a verified payment
CREATE OR REPLACE FUNCTION public.credit_referral_for_user(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.referrals%ROWTYPE; _commission bigint := 50000;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('credited', false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE user_id = _user_id AND status = 'success') THEN
    RETURN jsonb_build_object('credited', false);
  END IF;
  SELECT * INTO _r FROM public.referrals WHERE referred_user_id = _user_id;
  IF _r.id IS NULL OR _r.status = 'paid' THEN RETURN jsonb_build_object('credited', false); END IF;
  IF _r.campaign_id IS NOT NULL THEN
    SELECT coalesce(commission_kobo, _commission) INTO _commission FROM public.campaigns WHERE id = _r.campaign_id;
  END IF;
  UPDATE public.referrals
     SET status = 'paid', commission_kobo = _commission, credited_at = now()
   WHERE id = _r.id AND status <> 'paid';
  RETURN jsonb_build_object('credited', true, 'commission_kobo', _commission);
END; $$;
GRANT EXECUTE ON FUNCTION public.credit_referral_for_user(uuid) TO authenticated;