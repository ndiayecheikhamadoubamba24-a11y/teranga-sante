import { Ionicons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../components/Baobi';
import { NURSE_STATUS, NurseAvatar } from '../components/NurseAvatar';
import { Bubble, Button, Chip, tap } from '../components/ui';
import { VoiceNote } from '../components/VoiceNote';
import {
  type Conversation, flagUrgent, loadMessages, loadNurses, loadOpenConversation, markRead, type Message, myUserId, type Nurse, sendText, sendVoice,
  startConversation, TOPICS,
} from '../lib/chat';
import { getSyncError, useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../theme';

// Voix : AAC mono basse qualité (≈ 15 Ko / 10 s), lisible aussi dans le navigateur de l'infirmière.
const VOICE = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, sampleRate: 22050, bitRate: 32000 };
const MAX_VOICE_MS = 60000;
const QUICK = ['Je voudrais me faire dépister', 'J’ai une question sur la PrEP', 'Comment faire un autotest ?', 'Merci !'];
const STATUS = NURSE_STATUS;
const SAMU = '1515';

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// M7 — Discussion avec une infirmière : écrit + vocal, réponses rapides, confidentialité, réservation intégrée, Urgence.
export default function Discussion() {
  const params = useLocalSearchParams<{ nurse?: string; topic?: string }>();
  const { syncNow, bookings, saveBooking, player } = useStore();
  const [me, setMe] = useState<string | null>(null);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [conv, setConv] = useState<Conversation | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setError(null);
    setConv(undefined);
    try {
      const ok = await syncNow();
      const id = await myUserId();
      if (!ok || !id) throw new Error('offline');
      setMe(id);
      const [n, c] = await Promise.all([loadNurses(), loadOpenConversation(id)]);
      setNurses(n);
      setConv(c);
    } catch {
      setError(getSyncError());
      setConv(null);
    }
  }, [syncNow]);
  useEffect(() => {
    init();
  }, [init]);

  if (!player) return null;
  if (conv === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Baobi size={110} />
        <Text style={styles.errorText}>{error}</Text>
        <Button label="Réessayer" icon="refresh" onPress={init} />
        <Button label="Retour" variant="light" small onPress={() => router.back()} style={{ marginTop: spacing(2) }} />
      </SafeAreaView>
    );
  }
  if (!conv) {
    return <Intro nurses={nurses} me={me!} initialNurse={params.nurse} initialTopic={params.topic} onStarted={setConv} />;
  }
  return <Chat me={me!} conv={conv} setConv={setConv} msgs={msgs} setMsgs={setMsgs} nurses={nurses} hasBooking={bookings.length > 0} saveBooking={saveBooking} />;
}

// ---------- Choix du sujet et de l'infirmière (M6 simplifié) ----------
function Intro({ nurses, me, initialNurse, initialTopic, onStarted }: { nurses: Nurse[]; me: string; initialNurse?: string; initialTopic?: string; onStarted: (c: Conversation) => void }) {
  const [topic, setTopic] = useState<string>(initialTopic && (TOPICS as readonly string[]).includes(initialTopic) ? initialTopic : 'Dépistage');
  const [nurseId, setNurseId] = useState<string | null>(initialNurse ?? null);
  const [busy, setBusy] = useState(false);
  const anyOnline = nurses.some((n) => n.status === 'online');

  const start = async () => {
    setBusy(true);
    try {
      onStarted(await startConversation(me, topic, nurseId));
    } catch (e) {
      Alert.alert('Oups', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={26} color={colors.night} />
        </Pressable>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Parler à une infirmière</Text>
        <Ionicons name="lock-closed" size={22} color={colors.night} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing(5), gap: spacing(4) }}>
        <View style={styles.introHero}>
          <Baobi size={100} mood="wave" />
          <Bubble style={{ flex: 1 }}>Pose ta question à une vraie infirmière. Tu restes anonyme : pas de nom, pas de numéro 🔒</Bubble>
        </View>

        <Text style={styles.label}>De quoi veux-tu parler ?</Text>
        <View style={styles.wrap}>
          {TOPICS.map((t) => <Chip key={t} label={t} active={topic === t} onPress={() => setTopic(t)} />)}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Avec qui ?</Text>
          <Pressable onPress={() => router.push('/infirmieres')} hitSlop={8}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.green }}>Voir les profils →</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => { tap(); setNurseId(null); }} style={[styles.nurseCard, nurseId === null && styles.nurseActive]}>
          <NurseAvatar nurse={null} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nurseName}>Première infirmière disponible</Text>
            <Text style={styles.nurseSub}>{anyOnline ? 'Réponse en général en moins de 30 min' : 'Réponse dès le prochain créneau (8h–18h)'}</Text>
          </View>
          {nurseId === null && <Ionicons name="checkmark-circle" size={24} color={colors.green} />}
        </Pressable>
        {nurses.map((n) => (
          <Pressable key={n.id} onPress={() => { tap(); setNurseId(n.id); }} style={[styles.nurseCard, nurseId === n.id && styles.nurseActive]}>
            <NurseAvatar nurse={n} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nurseName}>{n.display_name}</Text>
              <Text style={styles.nurseSub} numberOfLines={1}>{[n.specialty, n.centre_name].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.nurseSub}>
                <Text style={{ color: STATUS[n.status].color, fontFamily: fonts.bold }}>● {STATUS[n.status].label}</Text>
                {'  ·  '}{n.languages.map((l) => ({ fr: 'Français', wo: 'Wolof', ff: 'Pulaar' })[l] ?? l).join(', ')}
              </Text>
            </View>
            {nurseId === n.id && <Ionicons name="checkmark-circle" size={24} color={colors.green} />}
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ padding: spacing(5), gap: spacing(2) }}>
        <Button label={busy ? 'Ouverture…' : 'Commencer la discussion'} icon="chatbubbles" disabled={busy} onPress={start} />
        <Text style={styles.privacy}>🔒 Seule l’infirmière lit tes messages. Tu peux tout effacer dans « Moi ».</Text>
      </View>
    </SafeAreaView>
  );
}

// ---------- Discussion ----------
type ChatProps = {
  me: string;
  conv: Conversation;
  setConv: (c: Conversation | null) => void;
  msgs: Message[];
  setMsgs: (m: Message[]) => void;
  nurses: Nurse[];
  hasBooking: boolean;
  saveBooking: ReturnType<typeof useStore>['saveBooking'];
};

function Chat({ me, conv, setConv, msgs, setMsgs, nurses, hasBooking, saveBooking }: ChatProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [booked, setBooked] = useState<Record<string, string>>({});
  const scroll = useRef<ScrollViewInstance>(null);
  const recorder = useAudioRecorder(VOICE);
  const rec = useAudioRecorderState(recorder, 250);
  const nurse = nurses.find((n) => n.id === conv.nurse_id) ?? null;

  const refresh = useCallback(async () => {
    setMsgs(await loadMessages(conv.id));
    markRead(conv.id);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
  }, [conv.id, setMsgs]);

  useEffect(() => {
    refresh();
    // Temps réel : nouveaux messages + prise en charge par une infirmière.
    const ch = supabase
      .channel(`conv-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conv.id}` }, (p) => setConv(p.new as Conversation))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conv.id, refresh, setConv]);

  // Arrêt automatique à 60 s.
  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_VOICE_MS) stopAndSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.isRecording, rec.durationMillis]);

  async function send(body: string) {
    const b = body.trim();
    if (!b || sending) return;
    setSending(true);
    setText('');
    try {
      await sendText(conv.id, me, b);
      await refresh();
    } catch (e) {
      setText(b);
      Alert.alert('Message non envoyé', (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return Alert.alert('Micro', 'Autorise le micro pour envoyer un message vocal.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    tap();
  }

  async function stopAndSend() {
    const duration = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (!recorder.uri || duration < 800) return;
    setSending(true);
    try {
      await sendVoice(conv.id, me, recorder.uri, duration);
      await refresh();
    } catch (e) {
      Alert.alert('Vocal non envoyé', (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function cancelRecording() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
  }

  function urgence() {
    Alert.alert('Urgence', 'Que veux-tu faire ?', [
      {
        text: 'Prévenir l’infirmière en priorité',
        onPress: async () => {
          await flagUrgent(conv.id);
          await sendText(conv.id, me, '🚨 J’ai besoin d’aide rapidement.');
          refresh();
        },
      },
      { text: `Appeler le SAMU (${SAMU})`, onPress: () => Linking.openURL(`tel:${SAMU}`) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function bookOffer(m: Message) {
    const slotId = m.payload?.slot_id;
    if (!slotId) return;
    const { data, error } = await supabase.rpc('book_slot', { p_slot_id: slotId });
    if (error || !data) return Alert.alert('Réservation impossible', error?.message ?? 'Créneau indisponible');
    tap();
    setBooked((b) => ({ ...b, [m.id]: data.code }));
    saveBooking({ id: data.id, code: data.code, centreName: nurse?.centre_name ?? '', startsAt: m.payload?.starts_at ?? new Date().toISOString(), status: 'confirmed' });
    // Règle 4 : après la réservation, on reste dans l'échange avec l'infirmière.
    await sendText(conv.id, me, `C’est réservé ✅ Mon code : ${data.code}`);
    refresh();
  }

  const nurseReplied = msgs.some((m) => m.sender_id !== me);
  const reserveCentre = nurse?.centre_id ?? nurses.find((n) => n.centre_id)?.centre_id;
  const headerSub = conv.closed
    ? 'Discussion terminée'
    : nurse
      ? `${STATUS[nurse.status].label}${nurse.specialty ? ` · ${nurse.specialty}` : ''}`
      : 'Une infirmière va te répondre';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={26} color={colors.night} />
        </Pressable>
        <NurseAvatar nurse={nurse} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{nurse?.display_name ?? 'Infirmière Teranga'}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{headerSub}</Text>
        </View>
        <Pressable onPress={urgence} style={styles.urgent} accessibilityLabel="Urgence">
          <Ionicons name="alert-circle" size={18} color={colors.white} />
          <Text style={styles.urgentText}>Urgence</Text>
        </Pressable>
      </View>

      <View style={styles.banner}>
        <Ionicons name="lock-closed" size={14} color={colors.greenDark} />
        <Text style={styles.bannerText}>Anonyme · ne partage ni nom ni numéro</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <View style={styles.system}>
            <Text style={styles.systemText}>Sujet : {conv.topic ?? 'Question'} · ton code : {conv.alias}</Text>
          </View>
          {msgs.length === 0 && (
            <View style={styles.introHero}>
              <Baobi size={80} />
              <Bubble style={{ flex: 1 }}>Écris ou envoie un message vocal. L’infirmière te répond ici.</Bubble>
            </View>
          )}
          {msgs.map((m) => {
            const mine = m.sender_id === me;
            return (
              <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                <View style={[styles.msg, mine ? styles.mine : styles.theirs]}>
                  {m.kind === 'audio' && m.audio_path ? (
                    <VoiceNote path={m.audio_path} mine={mine} durationMs={(m.payload as { duration_ms?: number } | null)?.duration_ms} />
                  ) : (
                    <Text style={[styles.msgText, mine && { color: colors.white }]}>{m.body}</Text>
                  )}
                  {m.kind === 'booking_offer' && !mine && (
                    booked[m.id]
                      ? <Text style={styles.offerDone}>✅ Réservé · code {booked[m.id]}</Text>
                      : <Button label="Réserver ce créneau" icon="calendar" small onPress={() => bookOffer(m)} style={{ marginTop: spacing(2) }} />
                  )}
                  {m.kind === 'referral' && !mine && (
                    <Button label="Voir les centres" icon="location" variant="blue" small onPress={() => router.push('/carte')} style={{ marginTop: spacing(2) }} />
                  )}
                </View>
                <Text style={[styles.meta, { textAlign: mine ? 'right' : 'left' }]}>
                  {time(m.created_at)}{mine && m.read_at ? ' · lu' : ''}
                </Text>
              </View>
            );
          })}

          {/* Règle 4 : après un échange avec l'infirmière, proposer de réserver. */}
          {nurseReplied && !hasBooking && reserveCentre && !conv.closed && (
            <Pressable style={styles.suggest} onPress={() => router.push({ pathname: '/reserver/[id]', params: { id: reserveCentre } })}>
              <Ionicons name="calendar" size={20} color={colors.green} />
              <Text style={styles.suggestText}>Prêt·e à passer au centre ? Réserve un créneau anonyme</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.green} />
            </Pressable>
          )}
        </ScrollView>

        {conv.closed ? (
          <View style={{ padding: spacing(4), gap: spacing(2) }}>
            <Text style={styles.privacy}>Cette discussion est terminée.</Text>
            <Button label="Nouvelle question" icon="add" onPress={() => setConv(null)} />
          </View>
        ) : (
          <>
            {!text && !rec.isRecording && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="handled">
                {QUICK.map((q) => (
                  <Pressable key={q} onPress={() => send(q)} style={styles.quickChip}>
                    <Text style={styles.quickText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {rec.isRecording ? (
              <View style={styles.inputBar}>
                <Pressable onPress={cancelRecording} style={[styles.round, { backgroundColor: colors.creamDark }]} accessibilityLabel="Annuler le vocal">
                  <Ionicons name="trash" size={20} color={colors.red} />
                </Pressable>
                <View style={[styles.input, styles.recording]}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>
                    Enregistrement… {Math.floor(rec.durationMillis / 1000)} s / 60 s
                  </Text>
                </View>
                <Pressable onPress={stopAndSend} style={styles.round} accessibilityLabel="Envoyer le vocal">
                  <Ionicons name="send" size={18} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.inputBar}>
                {reserveCentre && (
                  <Pressable onPress={() => router.push({ pathname: '/reserver/[id]', params: { id: reserveCentre } })} style={[styles.round, { backgroundColor: colors.sunLight }]} accessibilityLabel="Réserver un créneau">
                    <Ionicons name="calendar" size={20} color={colors.green} />
                  </Pressable>
                )}
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Écris ton message…"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  multiline
                  maxLength={1000}
                />
                {text.trim() ? (
                  <Pressable onPress={() => send(text)} disabled={sending} style={styles.round} accessibilityLabel="Envoyer">
                    {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
                  </Pressable>
                ) : (
                  <Pressable onPress={startRecording} disabled={sending || Platform.OS === 'web'} style={styles.round} accessibilityLabel="Enregistrer un message vocal">
                    {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="mic" size={22} color={colors.white} />}
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(6), gap: spacing(3) },
  errorText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(2), backgroundColor: 'rgba(255,248,236,0.94)' },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.night },
  headerSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  urgent: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
  urgentText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.greenLight, paddingVertical: spacing(1.5), paddingHorizontal: spacing(4) },
  bannerText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.greenDark },
  list: { padding: spacing(4), gap: spacing(3) },
  system: { alignSelf: 'center', backgroundColor: colors.creamDark, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(1) },
  systemText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  msg: { borderRadius: radius.lg, paddingHorizontal: spacing(4), paddingVertical: spacing(3) },
  mine: { backgroundColor: colors.green, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6, ...shadow },
  msgText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.night },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 2, marginHorizontal: 4 },
  offerDone: { fontFamily: fonts.bold, fontSize: 13, color: colors.green, marginTop: spacing(2) },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), backgroundColor: colors.sunLight, borderRadius: radius.md, padding: spacing(3), marginTop: spacing(2) },
  suggestText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.night },
  quick: { paddingHorizontal: spacing(4), gap: spacing(2), paddingBottom: spacing(2) },
  quickChip: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  quickText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.night },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), paddingHorizontal: spacing(4), paddingBottom: spacing(3), paddingTop: spacing(1) },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, backgroundColor: colors.white, paddingHorizontal: spacing(4), paddingTop: 12, paddingBottom: 10,
    fontFamily: fonts.medium, fontSize: 15, color: colors.night, borderWidth: 2, borderColor: colors.border,
  },
  recording: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingTop: 0, paddingBottom: 0, borderColor: colors.red },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  recText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  introHero: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  nurseCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(3), borderWidth: 2, borderColor: 'transparent', ...shadow },
  nurseActive: { borderColor: colors.green },
  nurseName: { fontFamily: fonts.bold, fontSize: 15, color: colors.night },
  nurseSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  privacy: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
