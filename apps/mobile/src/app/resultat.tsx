import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Linking, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Baobi } from '../components/Baobi';
import { BADGES, BadgeRibbon, BadgeShield } from '../components/Badge';
import { Button } from '../components/ui';
import { useStore } from '../lib/store';
import { colors, fonts, spacing } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const CONFETTI_COLORS = [colors.sun, colors.orange, colors.green, colors.blue, colors.red];

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: Math.random() * W, delay: Math.random() * 600, color: CONFETTI_COLORS[i % 5], rot: Math.random() * 360, size: 6 + Math.random() * 6 })),
    [],
  );
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [anim]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: p.x, top: -20, width: p.size, height: p.size * 1.8, backgroundColor: p.color, borderRadius: 2,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-p.delay / 4, H * 0.55 + p.delay / 3] }) },
              { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: [`${p.rot}deg`, `${p.rot + 540}deg`] }) },
            ],
            opacity: anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
          }}
        />
      ))}
    </View>
  );
}

// Écran 5 — Résultat du jeu : points, badge, série du jour, défier un ami, partager un sticker.
export default function Resultat() {
  const params = useLocalSearchParams<{ good: string; total: string; points: string }>();
  const good = Number(params.good ?? 0);
  const total = Number(params.total ?? 5);
  const points = Number(params.points ?? 0);
  const { recordGame } = useStore();
  const [streak, setStreak] = useState<number | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    recordGame(points, good, total).then(({ streak: s, newBadges }) => {
      setStreak(s);
      setBadge(newBadges.includes('mythbuster') ? 'mythbuster' : newBadges[0] ?? (good >= total - 1 ? 'mythbuster' : null));
    });
  }, [recordGame, points, good, total]);

  const message = `J'ai eu ${good}/${total} au jeu Vrai ou Faux sur Teranga Santé 🌳 Tu fais mieux ?`;
  const great = good >= Math.ceil(total * 0.6);

  return (
    <SafeAreaView style={styles.root}>
      {great && <Confetti />}
      <View style={styles.center}>
        <Baobi size={150} mood={great ? 'cheer' : 'thumb'} />
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{great ? 'Bravo !' : 'Bien essayé !'}</Text>
        </View>
        <View style={styles.pointsRow}>
          <Ionicons name="star" size={28} color={colors.sun} />
          <Text style={styles.points}>{points} points</Text>
        </View>
        <Text style={styles.score}>{good} bonnes réponses sur {total}</Text>

        {badge && (
          <View style={{ alignItems: 'center', marginTop: spacing(3) }}>
            <BadgeShield id={badge} size={76} />
            <BadgeRibbon label={BADGES[badge].label} />
          </View>
        )}
        {streak !== null && <Text style={styles.streak}>Série du jour : {streak} 🔥</Text>}
      </View>

      <View style={styles.actions}>
        <Button label="Défier un ami" icon="people" onPress={() => Share.share({ message }).catch(() => {})} />
        <Button
          label="Partager un sticker"
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() =>
            Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => Share.share({ message }).catch(() => {}))
          }
        />
        <Button label="Rejouer" variant="light" icon="refresh" small onPress={() => router.replace('/jeu')} />
        <Button label="Retour à l’accueil" variant="light" icon="home" small onPress={() => router.replace('/accueil')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing(4) },
  banner: {
    backgroundColor: colors.orange, paddingHorizontal: spacing(10), paddingVertical: spacing(2), borderRadius: 14, marginTop: -spacing(6),
    borderBottomWidth: 5, borderBottomColor: colors.orangeDark, transform: [{ rotate: '-2deg' }],
  },
  bannerText: { fontFamily: fonts.black, fontSize: 34, color: colors.white },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(3) },
  points: { fontFamily: fonts.bold, fontSize: 26, color: colors.night },
  score: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  streak: { fontFamily: fonts.semibold, fontSize: 16, color: colors.night, marginTop: spacing(3) },
  actions: { padding: spacing(5), gap: spacing(3) },
});
