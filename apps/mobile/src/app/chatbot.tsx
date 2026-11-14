import { Ionicons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../components/Baobi';
import { Header, PrivacyNote, tap } from '../components/ui';
import { CHATBOT, matchNode } from '../data/content';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../theme';

type AiAction = 'none' | 'centres' | 'infirmieres' | 'reserver' | 'jeu' | 'urgence';
type Line = { from: 'bot' | 'me'; text: string; ai?: boolean; action?: AiAction; voice?: boolean };

const GREETING =
  'Salut ! Moi c’est Baobi 🌳 Raconte-moi ce qui te préoccupe, avec tes mots : écris ou envoie un vocal. ' +
  'Il n’y a pas de mauvaise question, et personne ne saura qui tu es.';

// Suggestion d'action proposée par Baobi sous une réponse (jamais un menu de questions).
const ACTION_BUTTON: Record<Exclude<AiAction, 'none'>, { label: string; icon: keyof typeof Ionicons.glyphMap; go: () => void }> = {
  centres: { label: 'Voir les centres de dépistage', icon: 'location', go: () => router.push('/carte') },
  reserver: { label: 'Réserver un créneau anonyme', icon: 'calendar', go: () => router.push('/carte') },
  infirmieres: { label: 'Parler à une infirmière', icon: 'chatbubbles', go: () => router.push('/infirmieres') },
  jeu: { label: 'Jouer à Vrai ou Faux', icon: 'game-controller', go: () => router.push('/jeu') },
  urgence: { label: 'Appeler le SAMU (1515)', icon: 'call', go: () => Linking.openURL('tel:1515') },
};

// Voix : AAC mono, léger, lisible par la transcription.
const VOICE = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, sampleRate: 16000, bitRate: 32000 };
const MAX_VOICE_MS = 60000;

async function fileToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Écran 7 — Chatbot « Question sans honte » (M8) : conversation libre (écrit ou vocal) avec Baobi, propulsé par l'IA.
export default function Chatbot() {
  const { settings, syncNow } = useStore();
  const [lines, setLines] = useState<Line[]>([{ from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const recorder = useAudioRecorder(VOICE);
  const rec = useAudioRecorderState(recorder, 250);
  const started = lines.some((l) => l.from === 'me');

  const toEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);

  // Statistique anonyme pour le CNLS (réponses hors IA) : seul le sujet est enregistré.
  const track = (node_id: string) => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.from('chatbot_hits').insert({ node_id }).then(() => {});
    });
  };

  async function ask(text: string, voice = false) {
    const q = text.trim();
    if (!q || thinking) return;
    setInput('');
    const history: Line[] = [...lines, { from: 'me', text: q, voice }];
    setLines(history);
    setThinking(true);
    toEnd();
    try {
      if (!(await syncNow())) throw new Error('offline');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          lang: settings.lang,
          // On n'envoie pas le message d'accueil, seulement l'échange réel.
          messages: history.slice(1).map((l) => ({ role: l.from === 'me' ? 'user' : 'assistant', content: l.text })),
        },
      });
      if (error || !data?.reply) throw error ?? new Error('vide');
      setLines((l) => [...l, { from: 'bot', text: data.reply, ai: true, action: data.action as AiAction }]);
    } catch {
      // Sans IA (hors ligne, non configurée) : réponse validée par mots-clés.
      const node = CHATBOT[matchNode(q)] ?? CHATBOT.fallback;
      track(node.id);
      const action: AiAction = node.id === 'depister' || node.id === 'autotest' || node.id === 'prep' ? 'centres' : 'infirmieres';
      setLines((l) => [...l, { from: 'bot', text: node.message, action }]);
    } finally {
      setThinking(false);
      toEnd();
    }
  }

  // ---------- Vocal ----------
  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_VOICE_MS) stopAndSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.isRecording, rec.durationMillis]);

  async function startRecording() {
    if (Platform.OS === 'web') return Alert.alert('Vocal', 'Les messages vocaux fonctionnent dans l’application sur téléphone.');
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return Alert.alert('Micro', 'Autorise le micro pour parler à Baobi.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    tap();
  }

  async function cancelRecording() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
  }

  async function stopAndSend() {
    const duration = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (!recorder.uri || duration < 800) return;
    setTranscribing(true);
    try {
      if (!(await syncNow())) throw new Error('offline');
      const audio = await fileToBase64(recorder.uri);
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { audio, mime: 'audio/mp4' } });
      if (error || !data?.text) throw error ?? new Error('vide');
      await ask(data.text, true);
    } catch {
      Alert.alert('Vocal', 'Je n’ai pas réussi à comprendre le message vocal. Tu peux réessayer ou l’écrire.');
    } finally {
      setTranscribing(false);
    }
  }

  function restart() {
    Alert.alert('Nouvelle conversation', 'Effacer cette conversation de l’écran ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: () => setLines([{ from: 'bot', text: GREETING }]) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header
        title="Question sans honte"
        right={
          <View style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'center' }}>
            {started && (
              <Pressable onPress={restart} hitSlop={10} accessibilityLabel="Nouvelle conversation">
                <Ionicons name="refresh" size={22} color={colors.night} />
              </Pressable>
            )}
            <Ionicons name="lock-closed" size={20} color={colors.night} />
          </View>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onContentSizeChange={toEnd}>
          <View style={styles.hero}>
            <Baobi size={120} />
          </View>

          {lines.map((l, i) =>
            l.from === 'me' ? (
              <View key={i} style={styles.me}>
                {l.voice && <Text style={styles.voiceTag}>🎤 Message vocal</Text>}
                <Text style={styles.meText}>{l.text}</Text>
              </View>
            ) : (
              <View key={i} style={styles.botRow}>
                <View style={styles.botAvatar}><Baobi size={34} /></View>
                <View style={styles.bot}>
                  <Text style={styles.botText}>{l.text}</Text>
                  {l.action && l.action !== 'none' && (
                    <Pressable
                      onPress={() => { tap(); ACTION_BUTTON[l.action as Exclude<AiAction, 'none'>].go(); }}
                      style={[styles.aiAction, l.action === 'urgence' && { backgroundColor: colors.red }]}
                    >
                      <Ionicons name={ACTION_BUTTON[l.action].icon} size={16} color={colors.white} />
                      <Text style={styles.aiActionText}>{ACTION_BUTTON[l.action].label}</Text>
                    </Pressable>
                  )}
                  {l.ai && <Text style={styles.aiNote}>Réponse générée par l’IA · pour ta situation, parle à une infirmière</Text>}
                </View>
              </View>
            ),
          )}

          {(thinking || transcribing) && (
            <View style={styles.botRow}>
              <View style={styles.botAvatar}><Baobi size={34} /></View>
              <View style={[styles.bot, styles.typing]}>
                <ActivityIndicator size="small" color={colors.green} />
                <Text style={styles.aiNote}>{transcribing ? 'Baobi écoute ton vocal…' : 'Baobi écrit…'}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {rec.isRecording ? (
          <View style={styles.inputBar}>
            <Pressable onPress={cancelRecording} style={[styles.round, { backgroundColor: colors.white }]} accessibilityLabel="Annuler le vocal">
              <Ionicons name="trash" size={20} color={colors.red} />
            </Pressable>
            <View style={[styles.input, styles.recording]}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>Je t’écoute… {Math.floor(rec.durationMillis / 1000)} s</Text>
            </View>
            <Pressable onPress={stopAndSend} style={styles.round} accessibilityLabel="Envoyer le vocal">
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Écris ce que tu ressens ou ta question…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={1000}
            />
            {input.trim() ? (
              <Pressable onPress={() => ask(input)} disabled={thinking} style={styles.round} accessibilityLabel="Envoyer">
                {thinking ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
              </Pressable>
            ) : (
              <Pressable onPress={startRecording} disabled={thinking || transcribing} style={styles.round} accessibilityLabel="Parler à Baobi (message vocal)">
                <Ionicons name="mic" size={22} color={colors.white} />
              </Pressable>
            )}
          </View>
        )}
        <PrivacyNote />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(4), gap: spacing(3), paddingBottom: spacing(6) },
  hero: { alignItems: 'center', marginBottom: spacing(1) },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), maxWidth: '82%' },
  meText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.white },
  voiceTag: { fontFamily: fonts.semibold, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), maxWidth: '90%' },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bot: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: spacing(3), ...shadow },
  botText: { fontFamily: fonts.medium, fontSize: 15, color: colors.night, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), flex: 0 },
  aiAction: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(2), marginTop: spacing(2) },
  aiActionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  aiNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: spacing(1) },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), paddingHorizontal: spacing(4), paddingTop: spacing(2) },
  input: {
    flex: 1, minHeight: 50, maxHeight: 140, borderRadius: 25, backgroundColor: colors.white, paddingHorizontal: spacing(4), paddingTop: 13, paddingBottom: 11,
    fontFamily: fonts.medium, fontSize: 15, color: colors.night, borderWidth: 2, borderColor: colors.border,
  },
  recording: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingTop: 0, paddingBottom: 0, borderColor: colors.red },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  recText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night },
  round: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
