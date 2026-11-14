import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

export const BADGES: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  curieux: { label: 'Curieux', icon: 'star', color: '#F2A01D' },
  actif: { label: 'Actif', icon: 'flash', color: '#2E6FD8' },
  solidaire: { label: 'Solidaire', icon: 'heart', color: '#E0852B' },
  mythbuster: { label: 'Mythbuster', icon: 'trophy', color: '#2E6FD8' },
};

export function BadgeShield({ id, size = 64, locked }: { id: string; size?: number; locked?: boolean }) {
  const b = BADGES[id] ?? BADGES.curieux;
  const fill = locked ? '#CFC6B5' : b.color;
  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 60 66" style={StyleSheet.absoluteFill}>
        <Path d="M30 2 L56 12 L56 32 C56 48 44 58 30 64 C16 58 4 48 4 32 L4 12 Z" fill={locked ? '#B5AC9B' : '#F7B500'} />
        <Path d="M30 8 L50 16 L50 32 C50 45 41 53 30 58 C19 53 10 45 10 32 L10 16 Z" fill={fill} />
      </Svg>
      <Ionicons name={locked ? 'lock-closed' : b.icon} size={size * 0.42} color={locked ? '#8E8676' : '#FFE07A'} />
    </View>
  );
}

export function BadgeRibbon({ label }: { label: string }) {
  return (
    <View style={styles.ribbon}>
      <Text style={styles.ribbonText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: { backgroundColor: colors.sun, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 8, marginTop: -12, borderWidth: 2, borderColor: '#E09A00' },
  ribbonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.greenDark },
});
