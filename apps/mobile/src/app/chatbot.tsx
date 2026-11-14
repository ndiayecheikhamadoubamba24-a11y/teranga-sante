import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../components/Baobi';
import { Bubble, Header, PrivacyNote, tap } from '../components/ui';
import { CHATBOT, matchNode, type ChatNode, type ChatOption } from '../data/content';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../theme';

type AiAction = 'none' | 'centres' | 'infirmieres' | 'reserver' | 'jeu' | 'urgence';
type Line = { from: 'bot' | 'me'; text: string; ai?: boolean; action?: AiAction };

// Boutons proposés sous une réponse de l'IA.
const ACTION_BUTTON: Record<Exclude<AiAction, 'none'>, { label: string; icon: keyof typeof Ionicons.glyphMap; go: () => void }> = {
  centres: { label: 'Voir les centres de dépistage', icon: 'location', go: () => router.push('/carte') },
  reserver: { label: 'Réserver un créneau anonyme', icon: 'calendar', go: () => router.push('/carte') },
  infirmieres: { label: 'Parler à une infirmière', icon: 'chatbubbles', go: () => router.push('/infirmieres') },
  jeu: { label: 'Jouer à Vrai ou Faux', icon: 'game-controller', go: () => router.push('/jeu') },
  urgence: { label: 'Appeler le SAMU (1515)', icon: 'call', go: () => Linking.openURL('tel:1515') },
};
type Row = { id: string; message: Record<string, string>; options: { label: Record<string, string>; next?: string; route?: string }[] };

// Écran 7 — Chatbot « Question sans honte » (M8) : réponses guidées par boutons, orientation vers les modules.
export default function Chatbot() {
  const { settings, syncNow } = useStore();
  const [thinking, setThinking] = useState(false);
  const [nodes, setNodes] = useState<Record<string, ChatNode>>(CHATBOT);
  const [lines, setLines] = useState<Line[]>([]);
  const [current, setCurrent] = useState<ChatNode>(CHATBOT.root);
  const [input, setInput] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);

  // Scénarios éditables depuis l'admin (A6) ; les nœuds manquants restent ceux embarqués.
  useEffect(() => {
    supabase
      .from('chatbot_nodes')
      .select('id, message, options')
      .eq('published', true)
      .then(({ data }) => {
        if (!data?.length) return;
        const remote: Record<string, ChatNode> = {};
        for (const r of data as Row[]) {
          remote[r.id] = {
            id: r.id,
            message: r.message[settings.lang] ?? r.message.fr,
            options: r.options.map((o) => ({ label: o.label[settings.lang] ?? o.label.fr, next: o.next, route: o.route })),
          };
        }
        const merged = { ...CHATBOT, ...remote };
        setNodes(merged);
        setCurrent(merged.root);
      });
  }, [settings.lang]);

  // Statistique anonyme pour le CNLS : seul le sujet est enregistré, jamais le texte de la question.
  const track = (node_id: string, routed_to: string | null = null) => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.from('chatbot_hits').insert({ node_id, routed_to }).then(() => {});
    });
  };

  const goTo = (id: string, userText: string) => {
    const node = nodes[id] ?? nodes.fallback;
    track(node.id);
    setLines((l) => [...l, { from: 'me', text: userText }, { from: 'bot', text: node.message }]);
    setCurrent(node);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const choose = (o: ChatOption) => {
    tap();
    if (o.route) {
      track(current.id, o.route);
      router.push(o.route as never);
      return;
    }
    if (o.next) goTo(o.next, o.label);
  };

  // Question libre : réponse de l'IA (Groq, via la fonction serveur ai-chat).
  // En cas d'échec (hors ligne, IA non configurée), on retombe sur les réponses validées par mots-clés.
  const send = async () => {
    const q = input.trim();
    if (!q || thinking) return;
    setInput('');
    const history = [...lines, { from: 'me' as const, text: q }];
    setLines(history);
    setThinking(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      if (!(await syncNow())) throw new Error('offline');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { lang: settings.lang, messages: history.map((l) => ({ role: l.from === 'me' ? 'user' : 'assistant', content: l.text })) },
      });
      if (error || !data?.reply) throw error ?? new Error('vide');
      setLines((l) => [...l, { from: 'bot', text: data.reply, ai: true, action: data.action as AiAction }]);
      setCurrent(nodes.root);
    } catch {
      const node = nodes[matchNode(q)] ?? nodes.fallback;
      track(node.id);
      setLines((l) => [...l, { from: 'bot', text: node.message }]);
      setCurrent(node);
    } finally {
      setThinking(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Question sans honte" right={<Ionicons name="lock-closed" size={22} color={colors.night} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Baobi size={110} />
            <Bubble style={styles.heroBubble}>{nodes.root.message}</Bubble>
          </View>

          {lines.map((l, i) =>
            l.from === 'me' ? (
              <View key={i} style={styles.me}>
                <Text style={styles.meText}>{l.text}</Text>
              </View>
            ) : (
              <View key={i} style={styles.botRow}>
                <View style={styles.botAvatar}>
                  <Baobi size={34} />
                </View>
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

          {thinking && (
            <View style={styles.botRow}>
              <View style={styles.botAvatar}><Baobi size={34} /></View>
              <View style={[styles.bot, { flexDirection: 'row', alignItems: 'center', gap: spacing(2) }]}>
                <ActivityIndicator size="small" color={colors.green} />
                <Text style={styles.aiNote}>Baobi réfléchit…</Text>
              </View>
            </View>
          )}

          <View style={styles.options}>
            {current.options.map((o) => (
              <Pressable key={o.label} onPress={() => choose(o)} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.greenLight }]}>
                <Text style={styles.optionText}>{o.label}</Text>
                {o.route && <Ionicons name="arrow-forward" size={16} color={colors.green} />}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable
            style={styles.mic}
            accessibilityLabel="Message vocal"
            onPress={() => Alert.alert('Bientôt', 'Les questions vocales en wolof, pulaar et français arrivent bientôt.')}
          >
            <Ionicons name="mic" size={22} color={colors.white} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            placeholder="Écris ou parle…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={send} accessibilityLabel="Envoyer">
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
        <PrivacyNote />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(4), gap: spacing(3) },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  heroBubble: { flex: 1 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), maxWidth: '80%' },
  meText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), maxWidth: '88%' },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bot: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: spacing(3), ...shadow },
  botText: { fontFamily: fonts.medium, fontSize: 15, color: colors.night, lineHeight: 21 },
  options: { gap: spacing(3), marginTop: spacing(2) },
  aiAction: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(2), marginTop: spacing(2) },
  aiActionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  aiNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: spacing(1) },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2), alignSelf: 'center', minWidth: '78%',
    backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, paddingVertical: spacing(3), paddingHorizontal: spacing(5),
  },
  optionText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(4), paddingTop: spacing(2) },
  mic: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.white, paddingHorizontal: spacing(4), fontFamily: fonts.medium, fontSize: 15, color: colors.night, borderWidth: 2, borderColor: colors.border },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
