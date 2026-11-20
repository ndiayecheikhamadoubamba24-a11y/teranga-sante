import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Header } from '../components/ui';
import { LEGAL_PAGES, openLegal, PRIVACY_EMAIL, SITE_URL } from '../lib/legal';
import { useStore } from '../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

// L'essentiel sur tes données (information en langage simple) + effacement complet.
// Le texte complet est sur le site : /confidentialite, /cgu, /mentions-legales.
const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'person-outline', title: 'Pas de nom, pas de numéro', text: 'Un pseudo et un avatar suffisent. On ne te demande ni nom, ni téléphone, ni email, ni date de naissance.' },
  { icon: 'location-outline', title: 'Ta position reste sur ton téléphone', text: 'Elle sert seulement à trier les centres du plus proche au plus loin. Elle n’est jamais envoyée à nos serveurs.' },
  { icon: 'medkit-outline', title: 'Rendez-vous et messages : des données de santé', text: 'Ils sont enregistrés pour que le centre puisse t’accueillir et que l’infirmière te réponde. Seuls les soignants concernés y ont accès, sous ton code (BAO-…).' },
  { icon: 'sparkles-outline', title: 'Baobi utilise une intelligence artificielle', text: 'Tes questions sont envoyées à Groq (États-Unis) pour obtenir une réponse. Les numéros et emails sont masqués avant l’envoi, et la discussion n’est pas enregistrée chez nous.' },
  { icon: 'time-outline', title: 'Rien n’est gardé pour toujours', text: 'Conversations supprimées 12 mois après le dernier message, rendez-vous 24 mois après leur date, profil après 24 mois sans utilisation.' },
  { icon: 'leaf-outline', title: 'Ton suivi de traitement ne quitte pas ton téléphone', text: 'Le rappel et la plante sont enregistrés uniquement sur ton téléphone.' },
];

export default function Confidentialite() {
  const { eraseAll } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const erase = async () => {
    setBusy(true);
    setError(null);
    const err = await eraseAll();
    setBusy(false);
    if (err) return setError(err);
    router.replace('/');
  };

  const confirm = () => {
    const msg = 'Ton profil, tes points, tes codes de rendez-vous, tes conversations avec les infirmières et ton suivi de traitement seront effacés définitivement. Tes rendez-vous à venir seront annulés.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Tout effacer ?\n\n${msg}`)) erase();
      return;
    }
    Alert.alert('Tout effacer ?', msg, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Tout effacer', style: 'destructive', onPress: erase },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Tes données" subtitle="L’essentiel, en clair" />
      <ScrollView contentContainerStyle={styles.content}>
        {POINTS.map((p) => (
          <View key={p.title} style={styles.card}>
            <Ionicons name={p.icon} size={24} color={colors.green} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title} accessibilityRole="header">{p.title}</Text>
              <Text style={styles.text}>{p.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.green} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title} accessibilityRole="header">Tes droits</Text>
            <Text style={styles.text}>
              Tu peux accéder à tes données, les corriger, les faire supprimer ou t’opposer à leur utilisation. Le plus simple : le bouton
              ci-dessous efface tout immédiatement.
              {PRIVACY_EMAIL ? ` Tu peux aussi écrire à ${PRIVACY_EMAIL} en donnant ton code de rendez-vous.` : ''} En cas de problème, tu peux
              saisir la Commission de protection des données personnelles (CDP).
            </Text>
            {PRIVACY_EMAIL ? (
              <Pressable onPress={() => Linking.openURL(`mailto:${PRIVACY_EMAIL}`)} accessibilityRole="link">
                <Text style={styles.link}>Écrire à {PRIVACY_EMAIL}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {SITE_URL ? (
          <View style={[styles.card, { flexDirection: 'column', gap: spacing(1) }]}>
            <Text style={styles.title}>Les textes complets</Text>
            {(Object.keys(LEGAL_PAGES) as (keyof typeof LEGAL_PAGES)[]).map((k) => (
              <Pressable key={k} onPress={() => openLegal(k)} accessibilityRole="link" style={styles.linkRow}>
                <Text style={styles.link}>{LEGAL_PAGES[k]}</Text>
                <Ionicons name="open-outline" size={16} color={colors.greenDark} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.danger}>
          <Text style={styles.title}>Effacer toutes mes données</Text>
          <Text style={styles.text}>Tout est supprimé tout de suite, sur nos serveurs et sur ton téléphone. C’est définitif.</Text>
          {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
          <Button label={busy ? 'Effacement…' : 'Tout effacer'} icon="trash" variant="red" onPress={confirm} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(4), gap: spacing(3), paddingBottom: spacing(8) },
  card: { flexDirection: 'row', gap: spacing(3), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), ...shadow },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.night },
  text: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.night },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.greenDark, textDecorationLine: 'underline' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), minHeight: 40 },
  danger: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), gap: spacing(2), borderWidth: 2, borderColor: colors.red, ...shadow },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: colors.red },
});
