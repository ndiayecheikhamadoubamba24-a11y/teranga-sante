import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Projet Supabase du prototype. La clé « publishable » est publique par conception (la sécurité repose
// sur les règles RLS) : elle sert de valeur par défaut si apps/mobile/.env est absent. Ne JAMAIS mettre ici
// la clé secrète (service_role / sb_secret_…).
const DEFAULT_URL = 'https://aqmcghhktfsntdcrfxtd.supabase.co';
const DEFAULT_KEY = 'sb_publishable_8pNDm69DoKJ8lgHhDKRivA_2aC_tfhR';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() || DEFAULT_KEY;

export const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rafraîchit le jeton seulement quand l'app est au premier plan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Réseau faible : on abandonne vite et on bascule sur les contenus hors ligne. */
export function withTimeout<T>(p: PromiseLike<T>, ms = 4000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Usager sans compte (M1) : session anonyme Supabase, aucun nom ni numéro.
 * Le pseudo et l'avatar sont stockés dans la table `players`.
 */
export async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signed, error } = await withTimeout(supabase.auth.signInAnonymously(), 8000);
  if (error) throw error;
  return signed.session;
}
