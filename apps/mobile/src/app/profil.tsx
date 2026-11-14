import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACCESSORIES, AccessoryIcon, Avatar } from '../components/Avatar';
import { Button, Header, tap } from '../components/ui';
import { useStore } from '../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../theme';

// Écran 2 — Profil sans compte (M1) : pseudo + avatar, aucun nom ni numéro.
export default function Profil() {
  const { t, createPlayer, player } = useStore();
  const [pseudo, setPseudo] = useState(player?.pseudo ?? '');
  const [face, setFace] = useState(player?.avatar.face ?? 0);
  const [accessory, setAccessory] = useState<string | null>(player?.avatar.accessory ?? null);
  const valid = pseudo.trim().length >= 2;

  const submit = async () => {
    await createPlayer(pseudo.trim(), { face, accessory });
    router.replace('/accueil');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={t('createProfile')} subtitle={t('createProfileSub')} onBack={() => router.replace('/')} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.input}>
            <Ionicons name="person-outline" size={22} color={colors.night} />
            <TextInput
              value={pseudo}
              onChangeText={setPseudo}
              placeholder={t('pseudo')}
              placeholderTextColor={colors.muted}
              maxLength={24}
              autoCorrect={false}
              style={styles.inputText}
            />
          </View>
          <Text style={styles.hint}>Pas ton vrai nom 😉 Juste un surnom.</Text>

          <View style={styles.grid}>
            {[0, 1, 2, 3].map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  tap();
                  setFace(f);
                }}
                style={[styles.avatarCell, face === f && styles.avatarActive]}
                accessibilityLabel={`Avatar ${f + 1}`}
              >
                <Avatar face={f} accessory={face === f ? accessory : null} size={118} />
                {face === f && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>{t('accessories')}</Text>
          <View style={styles.accRow}>
            {ACCESSORIES.map((a) => (
              <Pressable
                key={a}
                onPress={() => {
                  tap();
                  setAccessory(accessory === a ? null : a);
                }}
                style={[styles.acc, accessory === a && styles.accActive]}
                accessibilityLabel={a}
              >
                <AccessoryIcon kind={a} size={32} />
              </Pressable>
            ))}
          </View>

          <Button label={t('letsGo')} onPress={submit} disabled={!valid} style={{ marginTop: spacing(6) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(5), paddingTop: spacing(2) },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.white,
    borderRadius: radius.pill, paddingHorizontal: spacing(5), height: 56, borderWidth: 2, borderColor: colors.border,
  },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.night, height: '100%' },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: spacing(1), marginLeft: spacing(5) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing(4), marginTop: spacing(5) },
  avatarCell: { borderRadius: 22, borderWidth: 3, borderColor: 'transparent', ...shadow },
  avatarActive: { borderColor: colors.green },
  check: {
    position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
  },
  section: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night, textAlign: 'center', marginTop: spacing(5), marginBottom: spacing(2) },
  accRow: { flexDirection: 'row', justifyContent: 'space-around' },
  acc: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
  },
  accActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
});
