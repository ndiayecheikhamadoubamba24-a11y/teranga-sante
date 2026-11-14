import { createClient } from '@supabase/supabase-js';

// « Se souvenir de moi » : session dans localStorage, sinon dans sessionStorage (fermée avec l'onglet).
const REMEMBER = 'ts.remember';
export const setRemember = (v: boolean) => localStorage.setItem(REMEMBER, v ? '1' : '0');
const store = () => (localStorage.getItem(REMEMBER) === '0' ? sessionStorage : localStorage);

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
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
  languages: Lang[];
  status: ProStatus;
  /** Mot de passe provisoire donné par le super admin : à changer avant tout accès. */
  must_change_password?: boolean;
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
  sender_id: string;
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
