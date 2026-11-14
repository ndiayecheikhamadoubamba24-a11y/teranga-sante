import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../components/Baobi';
import { Bubble, Header, PrivacyNote, tap } from '../components/ui';
import { CHATBOT, matchNode, type ChatNode, type ChatOption } from '../data/content';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../theme';

type Line = { from: 'bot' | 'me'; text: string };
type Row = { id: string; message: Record<string, string>; options: { label: Record<string, string>; next?: string; route?: string }[] };

// Écran 7 — Chatbot « Question sans honte » (M8) : réponses guidées par boutons, orientation vers les modules.
export default function Chatbot() {
  const { settings } = useStore();
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

  const goTo = (id: string, userText: string) => {
    const node = nodes[id] ?? nodes.fallback;
    setLines((l) => [...l, { from: 'me', text: userText }, { from: 'bot', text: node.message }]);
    setCurrent(node);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const choose = (o: ChatOption) => {
    tap();
    if (o.route) {
      router.push(o.route as never);
      return;
    }
    if (o.next) goTo(o.next, o.label);
  };

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    goTo(matchNode(q), q);
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
                </View>
              </View>
            ),
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
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(1) },
  heroBubble: { flex: 1, marginBottom: spacing(16) },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), maxWidth: '80%' },
  meText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), maxWidth: '88%' },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bot: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: spacing(3), ...shadow },
  botText: { fontFamily: fonts.medium, fontSize: 15, color: colors.night, lineHeight: 21 },
  options: { gap: spacing(3), marginTop: spacing(2) },
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
