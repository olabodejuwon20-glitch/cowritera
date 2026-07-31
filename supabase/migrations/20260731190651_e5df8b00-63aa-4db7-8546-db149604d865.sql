-- role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='app_role' AND e.enumlabel='ambassador') THEN
    ALTER TYPE public.app_role ADD VALUE 'ambassador';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  commission_kobo integer NOT NULL DEFAULT 50000,
  status text NOT NULL DEFAULT 'draft',
  eligibility text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.ambassador_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_by uuid,
  accepted_at timestamptz,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ambassador_invites TO service_role;
ALTER TABLE public.ambassador_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.ambassador_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ambassadors TO authenticated;
GRANT ALL ON public.ambassadors TO service_role;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ambassadors" ON public.ambassadors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Ambassadors read own record" ON public.ambassadors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read clicks" ON public.referral_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  referred_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registered',
  commission_kobo integer NOT NULL DEFAULT 0,
  payment_id uuid,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read referrals" ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Ambassadors read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = referrals.ambassador_id AND a.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.ambassador_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  amount_kobo integer NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ambassador_payouts TO authenticated;
GRANT ALL ON public.ambassador_payouts TO service_role;
ALTER TABLE public.ambassador_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payouts" ON public.ambassador_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Ambassadors read own payouts" ON public.ambassador_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = ambassador_payouts.ambassador_id AND a.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.campaign_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_announcements TO authenticated;
GRANT ALL ON public.campaign_announcements TO service_role;
ALTER TABLE public.campaign_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage announcements" ON public.campaign_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read announcements" ON public.campaign_announcements FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.marketing_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'flyer',
  body text,
  url text,
  storage_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketing_resources TO authenticated;
GRANT ALL ON public.marketing_resources TO service_role;
ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage resources" ON public.marketing_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read resources" ON public.marketing_resources FOR SELECT TO authenticated USING (true);

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ambassador_invites_updated_at BEFORE UPDATE ON public.ambassador_invites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ambassadors_updated_at BEFORE UPDATE ON public.ambassadors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER campaign_announcements_updated_at BEFORE UPDATE ON public.campaign_announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER marketing_resources_updated_at BEFORE UPDATE ON public.marketing_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();