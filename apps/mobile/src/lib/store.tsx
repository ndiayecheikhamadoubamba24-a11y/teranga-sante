import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BackgroundId } from './backgrounds';
import { TERMS_VERSION } from './legal';
import { translate, type I18nKey, type Lang } from './i18n';
import { ensureAnonymousSession, supabase, withTimeout } from './supabase';

export type AvatarConfig = { face: number; accessory: string | null };

export type Player = {
  pseudo: string;
  avatar: AvatarConfig;
  points: number;
  streak: number;
  lastPlayed: string | null; // AAAA-MM-JJ
  badges: string[];
  gamesPlayed: number;
  /** Version des conditions d'utilisation acceptée, et date d'acceptation. */
  termsVersion?: string;
  termsAcceptedAt?: string;
};

type Settings = { lang: Lang; shakeToHide: boolean; background?: BackgroundId };

export type LocalBooking = { id: string; code: string; centreName: string; startsAt: string; status: string };

type Store = {
  ready: boolean;
  settings: Settings;
  player: Player | null;
  t: (k: I18nKey) => string;
  setLang: (l: Lang) => void;
  setShakeToHide: (v: boolean) => void;
  setBackground: (b: BackgroundId) => void;
  /** Crée ou modifie le profil ; `acceptTerms` enregistre l'acceptation de la version en vigueur des CGU. */
  createPlayer: (pseudo: string, avatar: AvatarConfig, acceptTerms?: boolean) => Promise<void>;
  recordGame: (pointsWon: number, correct: number, total: number) => Promise<{ streak: number; newBadges: string[] }>;
  /** Garantit la session anonyme + la ligne `players` (nécessaire pour réserver). */
  syncNow: () => Promise<boolean>;
  bookings: LocalBooking[];
  saveBooking: (b: LocalBooking) => void;
  /** Efface le compte sur le serveur puis toutes les données du téléphone. Renvoie un message d'erreur, ou null si tout est effacé. */
  eraseAll: () => Promise<string | null>;
};

const KEY = 'teranga.v1';
const Ctx = createContext<Store | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// Le profil est d'abord local (fonctionne hors ligne), puis synchronisé vers `players`
// via une session anonyme Supabase (pseudo, avatar, progression : aucune donnée de santé dans ce profil ;
// les rendez-vous et messages, eux, sont des données de santé : voir la politique de confidentialité).
// Dernière erreur de connexion au serveur, traduite pour l'utilisateur (affichée par les écrans).
let lastSyncError: string | null = null;
export const getSyncError = () => lastSyncError ?? 'Connexion impossible. Vérifie ton internet puis réessaie.';

export function explainError(raw: string): string {
  if (/anonymous sign-?ins? (are )?disabled/i.test(raw)) {
    return 'La connexion anonyme est désactivée sur le serveur. Administrateur : Supabase → Authentication → Sign In / Providers → activer « Allow anonymous sign-ins ».';
  }
  if (/relation .*does not exist|could not find the table|schema cache/i.test(raw)) {
    return 'La base de données n’est pas prête : les scripts SQL (migrations) doivent être exécutés dans Supabase.';
  }
  if (/timeout|network request failed|fetch failed|failed to fetch/i.test(raw)) {
    return 'Serveur injoignable. Vérifie ta connexion internet puis réessaie.';
  }
  if (/rate limit/i.test(raw)) return 'Trop de tentatives. Patiente une minute puis réessaie.';
  return `Connexion impossible (${raw}).`;
}

async function syncPlayer(p: Player, lang: Lang): Promise<boolean> {
  try {
    const session = await ensureAnonymousSession();
    if (!session) {
      lastSyncError = explainError('anonymous session unavailable');
      return false;
    }
    const { error } = await withTimeout(supabase.from('players').upsert({
      id: session.user.id,
      pseudo: p.pseudo,
      avatar: p.avatar,
      lang,
      points: p.points,
      streak: p.streak,
      last_played: p.lastPlayed,
      badges: p.badges,
      terms_version: p.termsVersion ?? null,
      terms_accepted_at: p.termsAcceptedAt ?? null,
    }), 8000);
    lastSyncError = error ? explainError(error.message) : null;
    return !error;
  } catch (e) {
    // hors ligne ou connexion anonyme désactivée : on réessaiera à la prochaine action
    lastSyncError = explainError((e as Error)?.message ?? String(e));
    return false;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({ lang: 'fr', shakeToHide: true });
  const [player, setPlayer] = useState<Player | null>(null);
  const [bookings, setBookings] = useState<LocalBooking[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.settings) setSettings(saved.settings);
        if (saved.player) setPlayer(saved.player);
        if (saved.bookings) setBookings(saved.bookings);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify({ settings, player, bookings })).catch(() => {});
  }, [ready, settings, player, bookings]);

  const createPlayer = useCallback(
    async (pseudo: string, avatar: AvatarConfig, acceptTerms = false) => {
      const base: Player = player ?? { pseudo, avatar, points: 0, streak: 0, lastPlayed: null, badges: [], gamesPlayed: 0 };
      const p: Player = { ...base, pseudo, avatar, ...(acceptTerms ? { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date().toISOString() } : {}) };
      setPlayer(p);
      syncPlayer(p, settings.lang);
    },
    [player, settings.lang],
  );

  const recordGame = useCallback(
    async (pointsWon: number, correct: number, total: number) => {
      const base = player ?? { pseudo: 'Invité', avatar: { face: 0, accessory: null }, points: 0, streak: 0, lastPlayed: null, badges: [], gamesPlayed: 0 };
      const d = today();
      const streak = base.lastPlayed === d ? base.streak : base.lastPlayed === yesterday() ? base.streak + 1 : 1;
      const earned: string[] = [];
      const gamesPlayed = base.gamesPlayed + 1;
      if (!base.badges.includes('curieux')) earned.push('curieux');
      if (correct >= total - 1 && !base.badges.includes('mythbuster')) earned.push('mythbuster');
      if (streak >= 3 && !base.badges.includes('actif')) earned.push('actif');
      const next: Player = { ...base, points: base.points + pointsWon, streak, lastPlayed: d, gamesPlayed, badges: [...base.badges, ...earned] };
      setPlayer(next);
      syncPlayer(next, settings.lang);
      return { streak, newBadges: earned };
    },
    [player, settings.lang],
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      settings,
      player,
      t: (k) => translate(settings.lang, k),
      setLang: (lang) => setSettings((s) => ({ ...s, lang })),
      setShakeToHide: (shakeToHide) => setSettings((s) => ({ ...s, shakeToHide })),
      setBackground: (background) => setSettings((s) => ({ ...s, background })),
      createPlayer,
      recordGame,
      syncNow: () => (player ? syncPlayer(player, settings.lang) : Promise.resolve(false)),
      bookings,
      saveBooking: (b) => setBookings((cur) => [b, ...cur.filter((x) => x.id !== b.id)]),
      eraseAll: async () => {
        // 1. Sur le serveur : profil, rendez-vous, conversations, messages vocaux (fonction Edge « delete-account »).
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          try {
            const { error } = await withTimeout(supabase.functions.invoke('delete-account', { method: 'POST' }), 15000);
            if (error) return 'L’effacement sur le serveur a échoué. Vérifie ta connexion internet puis réessaie : rien n’a été effacé.';
          } catch {
            return 'Serveur injoignable. Vérifie ta connexion internet puis réessaie : rien n’a été effacé.';
          }
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        // 2. Sur le téléphone : profil, codes, rappel de traitement, réglages, session.
        await AsyncStorage.clear().catch(() => {});
        setPlayer(null);
        setBookings([]);
        setSettings({ lang: 'fr', shakeToHide: true });
        return null;
      },
    }),
    [ready, settings, player, createPlayer, recordGame, bookings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore hors StoreProvider');
  return v;
}

export const LEVELS = [
  { name: 'Débutant', min: 0 },
  { name: 'Informé', min: 300 },
  { name: 'Ambassadeur', min: 1000 },
] as const;

export function levelOf(points: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (points - cur.min) / (next.min - cur.min) : 1;
  return { name: cur.name, progress: Math.max(0, Math.min(1, progress)) };
}
