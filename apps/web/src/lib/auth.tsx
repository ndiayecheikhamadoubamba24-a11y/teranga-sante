import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, type Pro, type ProStatus } from './supabase';


type AuthState = {
  loading: boolean;
  session: Session | null;
  pro: Pro | null;
  refresh: () => Promise<void>;
  setStatus: (s: ProStatus) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export async function fetchPro(userId: string) {
  const { data } = await supabase.from('pros').select('*, centre:centres(name)').eq('id', userId).maybeSingle();
  return (data as Pro | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pro, setPro] = useState<Pro | null>(null);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setPro(null);
      setLoading(false);
      return;
    }
    setPro(await fetchPro(s.user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      // Évite un appel Supabase dans le callback (verrou interne) : on reporte.
      setTimeout(() => load(s), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value: AuthState = {
    loading,
    session,
    pro,
    refresh: async () => load((await supabase.auth.getSession()).data.session),
    setStatus: async (status) => {
      if (!pro) return;
      setPro({ ...pro, status });
      await supabase.from('pros').update({ status }).eq('id', pro.id);
    },
    signOut: async () => {
      if (pro) await supabase.from('pros').update({ status: 'away' }).eq('id', pro.id);
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth hors AuthProvider');
  return v;
}

/** Profil professionnel garanti (pages protégées). */
export function usePro() {
  const { pro } = useAuth();
  if (!pro) throw new Error('profil professionnel requis');
  return pro;
}
