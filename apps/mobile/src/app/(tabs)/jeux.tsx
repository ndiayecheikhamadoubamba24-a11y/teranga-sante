import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../../components/Baobi';
import { Bubble, PointsPill, tap, text } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const GAMES = [
  { id: 'vrai-faux', title: 'Vrai ou Faux', desc: 'Démonte les rumeurs en 1 minute', icon: 'swap-horizontal', color: colors.orange, ready: true },
  { id: 'bouclier', title: 'Défi du bouclier', desc: 'Bientôt', icon: 'shield-checkmark', color: colors.blue, ready: false },
  { id: 'memory', title: 'Memory santé', desc: 'Bientôt', icon: 'grid', color: colors.green, ready: false },
  { id: 'duel', title: 'Quiz duel', desc: 'Bientôt', icon: 'people', color: colors.night, ready: false },
] as const;

export default function Jeux() {
  const { player } = useStore();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing(5), gap: spacing(4) }}>
        <View style={styles.head}>
          <Text style={text.h1}>Jeux</Text>
          <PointsPill points={player?.points ?? 0} />
        </View>
        <View style={styles.hero}>
          <Baobi size={90} mood="wave" />
          <Bubble style={{ flex: 1 }}>
            {player?.streak ? `Série du jour : ${player.streak} 🔥 Continue !` : 'Une partie par jour pour garder ta série 🔥'}
          </Bubble>
        </View>
        {GAMES.map((g) => (
          <Pressable
            key={g.id}
            disabled={!g.ready}
            onPress={() => {
              tap();
              router.push('/jeu');
            }}
            style={({ pressed }) => [styles.game, !g.ready && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <View style={[styles.icon, { backgroundColor: g.color }]}>
              <Ionicons name={g.icon} size={28} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={text.h2}>{g.title}</Text>
              <Text style={text.small}>{g.desc}</Text>
            </View>
            <Ionicons name={g.ready ? 'play-circle' : 'lock-closed'} size={30} color={g.ready ? colors.green : colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  game: { flexDirection: 'row', alignItems: 'center', gap: spacing(4), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), ...shadow },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold },
});
