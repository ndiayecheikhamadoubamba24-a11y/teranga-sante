import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, type Pro, type ProStatus } from './supabase';

// La validation en 2 étapes (TOTP) est obligatoire, sauf si VITE_MFA_OPTIONAL=true (démo).
export const MFA_OPTIONAL = import.meta.env.VITE_MFA_OPTIONAL === 'true';

type AuthState = {
  loading: boolean;
  session: Session | null;
  pro: Pro | null;
  aal2: boolean;
  refresh: () => Promise<void>;
  setStatus: (s: ProStatus) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export async function fetchPro(userId: string) {
  const { data } = await supabase.from('pros').select('*, centre:centres(name)').eq('id', userId).maybeSingle();
  return (data as Pro | null) ?? null;
}

export async function currentAal() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? 'aal1', next: data?.nextLevel ?? 'aal1' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pro, setPro] = useState<Pro | null>(null);
  const [aal2, setAal2] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setPro(null);
      setAal2(false);
      setLoading(false);
      return;
    }
    const [p, aal] = await Promise.all([fetchPro(s.user.id), currentAal()]);
    setPro(p);
    setAal2(aal.current === 'aal2');
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
    aal2,
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
