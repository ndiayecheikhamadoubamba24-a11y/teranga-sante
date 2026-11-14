import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../components/Baobi';
import { Bubble, Button, Header, PointsPill, ProgressBar } from '../components/ui';
import type { QuizQuestion } from '../data/content';
import { loadQuiz } from '../lib/quiz';
import { useStore } from '../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../theme';

const POINTS_PER_GOOD = 20;

// Écran 4 — Jeu Vrai ou Faux (M3) : boutons ou swipe (gauche = Faux, droite = Vrai).
export default function Jeu() {
  const { settings, player } = useStore();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [good, setGood] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    loadQuiz(settings.lang).then(setQuestions);
  }, [settings.lang]);

  const q = questions?.[i];
  const isRight = answer !== null && q ? answer === q.answer : null;

  const respond = (value: boolean) => {
    if (!q || answer !== null) return;
    const ok = value === q.answer;
    setAnswer(value);
    if (ok) setGood((g) => g + 1);
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  };
  const respondRef = useRef(respond);
  respondRef.current = respond;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 110) respondRef.current(true);
        else if (g.dx < -110) respondRef.current(false);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const next = () => {
    if (!questions) return;
    if (i + 1 >= questions.length) {
      router.replace({ pathname: '/resultat', params: { good: String(good), total: String(questions.length), points: String(good * POINTS_PER_GOOD) } });
      return;
    }
    setI(i + 1);
    setAnswer(null);
    pan.setValue({ x: 0, y: 0 });
  };

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'] });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header right={<PointsPill points={(player?.points ?? 0) + good * POINTS_PER_GOOD} />} />
      {!q ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.green} />
      ) : (
        <View style={styles.body}>
          <View style={styles.hero}>
            <Baobi size={120} mood={isRight === false ? 'happy' : 'thumb'} />
            <Bubble style={styles.bubble}>
              {answer === null ? 'Bonne question !' : isRight ? `Bien joué ! +${POINTS_PER_GOOD}` : 'Presque ! Retiens bien 👇'}
            </Bubble>
          </View>

          <Animated.View {...responder.panHandlers} style={[styles.card, { transform: [{ translateX: pan.x }, { rotate }] }]}>
            <Text style={styles.statement}>{q.statement}</Text>
            {answer !== null && (
              <View style={[styles.explain, { backgroundColor: isRight ? colors.greenLight : '#FDE7E4' }]}>
                <Ionicons name={isRight ? 'checkmark-circle' : 'information-circle'} size={22} color={isRight ? colors.green : colors.red} />
                <Text style={styles.explainText}>{q.explanation}</Text>
              </View>
            )}
          </Animated.View>

          {answer === null ? (
            <View style={styles.row}>
              <Button label="Faux" icon="close" variant="red" onPress={() => respond(false)} style={styles.choice} />
              <Button label="Vrai" icon="checkmark" variant="green" onPress={() => respond(true)} style={styles.choice} />
            </View>
          ) : (
            <Button label={i + 1 >= questions!.length ? 'Voir mon résultat' : 'Suivant'} icon="arrow-forward" variant="orange" onPress={next} />
          )}
          {answer === null && <Text style={styles.swipeHint}>← Faux · glisse la carte · Vrai →</Text>}

          <View style={styles.progress}>
            <ProgressBar value={(i + (answer !== null ? 1 : 0)) / questions!.length} height={16} />
            <Text style={styles.progressText}>{i + 1} / {questions!.length}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing(5), paddingBottom: spacing(4), gap: spacing(4) },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  bubble: { maxWidth: 170 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(6), minHeight: 170, justifyContent: 'center', ...shadow, gap: spacing(3) },
  statement: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 28, color: colors.night, textAlign: 'center' },
  explain: { flexDirection: 'row', gap: spacing(2), padding: spacing(3), borderRadius: radius.md, alignItems: 'flex-start' },
  explainText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.night },
  row: { flexDirection: 'row', gap: spacing(4) },
  choice: { flex: 1, borderRadius: radius.lg, minHeight: 72 },
  swipeHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: -spacing(2) },
  progress: { marginTop: 'auto', justifyContent: 'center' },
  progressText: { position: 'absolute', alignSelf: 'center', fontFamily: fonts.bold, fontSize: 12, color: colors.night },
});
