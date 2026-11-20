import { createClient } from '@supabase/supabase-js';

// « Se souvenir de moi » : session dans localStorage, sinon dans sessionStorage (fermée avec l'onglet).
const REMEMBER = 'ts.remember';
export const setRemember = (v: boolean) => localStorage.setItem(REMEMBER, v ? '1' : '0');
const store = () => (localStorage.getItem(REMEMBER) === '0' ? sessionStorage : localStorage);

// Projet Supabase du prototype. La clé « publishable » est publique par conception (la sécurité repose
// sur les règles RLS) : elle sert de valeur par défaut si apps/web/.env est absent. Ne JAMAIS mettre ici
// la clé secrète (service_role / sb_secret_…).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://aqmcghhktfsntdcrfxtd.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY?.trim() || 'sb_publishable_8pNDm69DoKJ8lgHhDKRivA_2aC_tfhR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: {
      getItem: (k) => sessionStorage.getItem(k) ?? localStorage.getItem(k),
      setItem: (k, v) => store().setItem(k, v),
      removeItem: (k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      },
    },
  },
});

export type ProRole = 'nurse' | 'manager' | 'national_admin' | 'super_admin';
export type ProStatus = 'online' | 'busy' | 'away';
export type Service = 'screening' | 'consultation' | 'prep' | 'selftest_pickup' | 'counselling';
export type BookingStatus = 'pending' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
export type Lang = 'fr' | 'wo' | 'ff';
export type I18n = Partial<Record<Lang, string>>;

export type Pro = {
  id: string;
  role: ProRole;
  centre_id: string | null;
  display_name: string;
  specialty: string | null;
  /** Présentation affichée aux jeunes (M6). */
  bio?: string | null;
  /** Numéro professionnel affiché aux jeunes sur la page du poste (facultatif). */
  phone?: string | null;
  languages: Lang[];
  status: ProStatus;
  /** Mot de passe provisoire donné par le super admin : à changer avant tout accès. */
  must_change_password?: boolean;
  /** Version des CGU acceptée (null = jamais). */
  terms_version?: string | null;
  centre?: { name: string } | null;
};

export type Slot = {
  id: string;
  centre_id: string;
  nurse_id: string | null;
  service: Service;
  starts_at: string;
  ends_at: string;
  capacity: number;
  blocked: boolean;
};

export type Booking = {
  id: string;
  code: string;
  slot_id: string;
  centre_id: string;
  nurse_id: string | null;
  service: Service;
  status: BookingStatus;
  created_at: string;
  slot?: Pick<Slot, 'starts_at' | 'ends_at'> | null;
};

export type Conversation = {
  id: string;
  player_id: string;
  nurse_id: string | null;
  alias: string | null;
  topic: string | null;
  lang: Lang;
  urgent: boolean;
  closed: boolean;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null; // null : auteur dont le compte a été supprimé
  body: string | null;
  audio_path?: string | null;
  kind: 'text' | 'audio' | 'booking_offer' | 'referral';
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

/** Journal d'activité (exigence « Accès sécurisé et traçable »). */
export async function logAction(action: string, entity?: string, entityId?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('activity_log').insert({ actor_id: data.user.id, action, entity, entity_id: entityId });
}
