import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null as User | null, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Marketing/public pages call this so signed-in users are sent straight into
 * the app instead of seeing the marketing site.
 */
export function useRedirectWhenAuthed(to: string = "/dashboard") {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: to as never, replace: true });
  }, [user, loading, navigate, to]);
  return { redirecting: !!user };
}
