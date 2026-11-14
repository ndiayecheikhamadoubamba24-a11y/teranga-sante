import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../../components/Baobi';
import { LogoInline, Village } from '../../components/Illustrations';
import { tap } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type TileProps = { label: string; color: string; edge: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress: () => void; wide?: boolean };

function Tile({ label, color, edge, icon, onPress, wide }: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        wide ? styles.tileWide : styles.tileHalf,
        { backgroundColor: color, borderBottomColor: edge },
        pressed && { transform: [{ translateY: 4 }], borderBottomWidth: 2 },
      ]}
    >
      <View style={wide ? styles.iconWide : styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={wide ? 40 : 48} color={colors.white} />
      </View>
      <Text style={[styles.tileText, wide && { textAlign: 'left', fontSize: 20 }]}>{label}</Text>
    </Pressable>
  );
}

// Écran 3 — Écran principal : 3 parcours (Je me fais dépister / Je joue et j'apprends / Je me soigne).
export default function Accueil() {
  const { t, player, ready } = useStore();
  if (ready && !player) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.top}>
        <LogoInline height={38} />
        <Pressable hitSlop={10} onPress={() => router.push('/traitement')} accessibilityLabel="Rappels">
          <Ionicons name="notifications-outline" size={26} color={colors.night} />
        </Pressable>
      </View>
      <Village height={170} />

      <View style={styles.body}>
        <View style={styles.row}>
          <Tile label={t('getTested')} color={colors.blue} edge={colors.blueDark} icon="hospital-building" onPress={() => router.push('/carte')} />
          <Tile label={t('playLearn')} color={colors.orange} edge={colors.orangeDark} icon="storefront" onPress={() => router.push('/jeu')} />
        </View>
        <Tile wide label={t('treatment')} color={colors.green} edge={colors.greenDark} icon="pill" onPress={() => router.push('/traitement')} />
      </View>

      {/* Baobi : accès direct au chatbot « Question sans honte » (M8) */}
      <Pressable style={styles.fab} onPress={() => router.push('/chatbot')} accessibilityLabel="Poser une question à Baobi">
        <View style={styles.fabBubble}>
          <Text style={styles.fabText}>Une question ?</Text>
        </View>
        <Baobi size={64} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
  body: { flex: 1, padding: spacing(4), paddingBottom: spacing(24), gap: spacing(4), backgroundColor: colors.sunLight, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing(4), flex: 1, maxHeight: 230 },
  tile: { borderRadius: radius.lg, borderBottomWidth: 6, padding: spacing(4), ...shadow },
  tileHalf: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 150 },
  tileWide: { flexDirection: 'row', alignItems: 'center', gap: spacing(4), minHeight: 104 },
  iconBox: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2) },
  iconWide: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white, textAlign: 'center', lineHeight: 22 },
  fab: { position: 'absolute', right: spacing(3), bottom: spacing(2), alignItems: 'center' },
  fabBubble: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(1), ...shadow, marginBottom: -4 },
  fabText: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
});
