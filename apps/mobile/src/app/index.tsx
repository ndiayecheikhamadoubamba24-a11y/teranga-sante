import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../theme';

// Écran temporaire : vérifie la connexion à Supabase. Remplacé par M1 (Accueil) dès réception des maquettes.
export default function Index() {
  const [status, setStatus] = useState('Connexion à Supabase…');

  useEffect(() => {
    supabase
      .from('centres')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) =>
        setStatus(error ? `Erreur : ${error.message}` : `Supabase OK — ${count ?? 0} centre(s)`),
      );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Teranga Santé</Text>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>Salut ! Moi c'est Baobi 🌳</Text>
      </View>
      <Text style={styles.status}>{status}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: spacing(6) },
  title: { fontFamily: fonts.black, fontSize: 32, color: colors.green },
  bubble: { marginTop: spacing(6), backgroundColor: colors.sun, borderRadius: radius.lg, paddingVertical: spacing(3), paddingHorizontal: spacing(5) },
  bubbleText: { fontFamily: fonts.bold, fontSize: 18, color: colors.night },
  status: { marginTop: spacing(6), fontFamily: fonts.regular, color: colors.muted },
});
