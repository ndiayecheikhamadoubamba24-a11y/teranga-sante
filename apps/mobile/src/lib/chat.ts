import { supabase, withTimeout } from './supabase';

export type ProStatus = 'online' | 'busy' | 'away';
export type Nurse = { id: string; display_name: string; specialty: string | null; languages: string[]; status: ProStatus; centre_id: string | null; centre_name: string | null };
export type Conversation = { id: string; nurse_id: string | null; alias: string | null; topic: string | null; urgent: boolean; closed: boolean; last_message_at: string };
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  kind: 'text' | 'audio' | 'booking_offer' | 'referral';
  payload: { slot_id?: string; starts_at?: string; centre_id?: string; reason?: string } | null;
  read_at: string | null;
  created_at: string;
};

export const TOPICS = ['Dépistage', 'PrEP', 'Autotest', 'Traitement', 'Autre question'] as const;

export async function myUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function loadNurses(): Promise<Nurse[]> {
  const { data, error } = await withTimeout(supabase.rpc('nurses_directory'));
  if (error) throw error;
  return (data as Nurse[]) ?? [];
}

/** Dernière conversation ouverte du jeune (une seule à la fois). */
export async function loadOpenConversation(playerId: string): Promise<Conversation | null> {
  const { data } = await withTimeout(
    supabase.from('conversations').select('*').eq('player_id', playerId).eq('closed', false).order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
  );
  return (data as Conversation | null) ?? null;
}

export async function startConversation(playerId: string, topic: string, nurseId: string | null) {
  const { data, error } = await supabase.from('conversations').insert({ player_id: playerId, topic, nurse_id: nurseId }).select('*').single();
  if (error) throw error;
  return data as Conversation;
}

export async function loadMessages(conversationId: string) {
  const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at');
  return (data as Message[]) ?? [];
}

export async function sendText(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body, kind: 'text' });
  if (error) throw error;
}

/** Message vocal : fichier m4a déposé dans le bucket privé « voice », dossier = conversation. */
export async function sendVoice(conversationId: string, senderId: string, uri: string, durationMs: number) {
  const bytes = await (await fetch(uri)).arrayBuffer();
  const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.m4a`;
  const up = await supabase.storage.from('voice').upload(path, bytes, { contentType: 'audio/mp4' });
  if (up.error) throw up.error;
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId, sender_id: senderId, audio_path: path, kind: 'audio', payload: { duration_ms: Math.round(durationMs) },
  });
  if (error) throw error;
}

export async function voiceUrl(path: string) {
  const { data } = await supabase.storage.from('voice').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export const markRead = (conversationId: string) => supabase.rpc('mark_read', { p_conversation_id: conversationId }).then(() => {});
export const flagUrgent = (conversationId: string) => supabase.rpc('flag_urgent', { p_conversation_id: conversationId });
