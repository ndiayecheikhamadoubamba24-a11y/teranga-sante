import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Nurse } from '../lib/chat';
import { colors, fonts } from '../theme';

export const NURSE_STATUS = {
  online: { label: 'En ligne', color: '#2EA043' },
  busy: { label: 'Occupée', color: colors.sun },
  away: { label: 'Absente', color: '#9B927F' },
} as const;

export const LANG_NAME: Record<string, string> = { fr: 'Français', wo: 'Wolof', ff: 'Pulaar' };

const BG = ['#FFE7A3', '#DDE9FA', '#E3F2E1', '#FDE3D2'];
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/** Avatar d'infirmière : initiales sur fond coloré + pastille de statut (pas de photo). */
export function NurseAvatar({ nurse, size = 44 }: { nurse: Pick<Nurse, 'id' | 'display_name' | 'status'> | null; size?: number }) {
  const bg = nurse ? BG[[...nurse.id].reduce((a, c) => a + c.charCodeAt(0), 0) % BG.length] : colors.sunLight;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        {nurse ? <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials(nurse.display_name)}</Text> : <Ionicons name="medkit" size={size * 0.45} color={colors.green} />}
      </View>
      {nurse && (
        <View style={[styles.dot, { backgroundColor: NURSE_STATUS[nurse.status].color, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bold, color: colors.greenDark },
  dot: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderColor: colors.cream },
});
