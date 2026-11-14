import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flag, Logo, WaxBand } from '../components/Illustrations';
import { Bubble, tap } from '../components/ui';
import type { Lang } from '../lib/i18n';
import { useStore } from '../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../theme';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'wo', label: 'Wolof' },
  { code: 'ff', label: 'Pulaar' },
];

// Écran 1 — Accueil / Splash + choix de la langue (M1).
export default function Splash() {
  const { ready, player, settings, setLang, t } = useStore();
  if (!ready) return null;

  const choose = (l: Lang) => {
    tap();
    setLang(l);
    router.replace(player ? '/accueil' : '/profil');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.top}>
        <Logo width={220} />
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.hero}>
        <Bubble style={styles.bubble} tail="none">{t('baobiHello')}</Bubble>
      </View>

      <View style={styles.langCard}>
        <Text style={styles.langTitle}>{t('chooseLang')}</Text>
        <View style={styles.langRow}>
          {LANGS.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => choose(l.code)}
              style={({ pressed }) => [styles.lang, settings.lang === l.code && player && styles.langActive, pressed && { transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel={l.label}
            >
              <Flag kind={l.code} size={40} />
              <Text style={styles.langLabel}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <WaxBand height={30} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { alignItems: 'center', paddingTop: spacing(4) },
  tagline: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night, textAlign: 'center', marginTop: spacing(2) },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(6) },
  bubble: { maxWidth: 280, paddingHorizontal: spacing(5), paddingVertical: spacing(4) },
  langCard: {
    backgroundColor: colors.white, marginHorizontal: spacing(4), marginBottom: spacing(4),
    borderRadius: radius.lg, padding: spacing(4), ...shadow,
  },
  langTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.night, textAlign: 'center', marginBottom: spacing(3) },
  langRow: { flexDirection: 'row', justifyContent: 'space-around' },
  lang: { alignItems: 'center', padding: spacing(2), borderRadius: radius.md, minWidth: 80 },
  langActive: { backgroundColor: colors.greenLight },
  langLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night, marginTop: spacing(1) },
});
