import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

type Variant = 'green' | 'orange' | 'blue' | 'red' | 'light' | 'whatsapp';
const VARIANTS: Record<Variant, { bg: string; edge: string; fg: string }> = {
  green: { bg: colors.green, edge: colors.greenDark, fg: colors.white },
  orange: { bg: colors.orange, edge: colors.orangeDark, fg: colors.white },
  blue: { bg: colors.blue, edge: colors.blueDark, fg: colors.white },
  red: { bg: colors.red, edge: '#B71C1C', fg: colors.white },
  light: { bg: colors.creamDark, edge: colors.border, fg: colors.night },
  whatsapp: { bg: '#3DBE5A', edge: '#2A9A43', fg: colors.white },
};

// Gros bouton arrondi avec relief (retour immédiat : enfoncement + vibration légère).
export function Button({
  label, onPress, variant = 'green', icon, style, disabled, small,
}: { label: string; onPress?: () => void; variant?: Variant; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean; small?: boolean }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderBottomColor: v.edge, opacity: disabled ? 0.5 : 1 },
        pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 18 : 22} color={v.fg} style={{ marginRight: 8 }} />}
      <Text style={[styles.btnText, small && { fontSize: 15 }, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Bubble({ children, style, tail = 'left' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tail?: 'left' | 'bottom' | 'none' }) {
  return (
    <View style={[styles.bubble, style]}>
      {typeof children === 'string' ? <Text style={styles.bubbleText}>{children}</Text> : children}
      {tail === 'left' && <View style={styles.tailLeft} />}
      {tail === 'bottom' && <View style={styles.tailBottom} />}
    </View>
  );
}

export function Header({ title, subtitle, right, onBack }: { title?: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        hitSlop={12}
        accessibilityLabel="Retour"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/accueil')))}
        style={styles.headerSide}
      >
        <Ionicons name="arrow-back" size={26} color={colors.night} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title && <Text style={styles.headerTitle}>{title}</Text>}
        {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, active && { backgroundColor: colors.green, borderColor: colors.green }]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function PointsPill({ points }: { points: number }) {
  return (
    <View style={styles.points}>
      <Ionicons name="star" size={16} color={colors.orange} />
      <Text style={styles.pointsText}>{points}</Text>
    </View>
  );
}

export function PrivacyNote({ text = 'Anonyme et confidentiel' }: { text?: string }) {
  return (
    <View style={styles.privacy}>
      <Ionicons name="lock-closed" size={16} color={colors.green} />
      <Text style={styles.privacyText}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.sun, height = 12 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export const text = StyleSheet.create({
  h1: { fontFamily: fonts.bold, fontSize: 24, color: colors.night },
  h2: { fontFamily: fonts.bold, fontSize: 18, color: colors.night },
  body: { fontFamily: fonts.medium, fontSize: 15, color: colors.night },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: 56, paddingHorizontal: spacing(5), borderRadius: radius.pill, borderBottomWidth: 5,
  },
  btnSmall: { minHeight: 44, borderBottomWidth: 4 },
  btnText: { fontFamily: fonts.bold, fontSize: 18 },
  bubble: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(3), ...shadow },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night, textAlign: 'center' },
  tailLeft: {
    position: 'absolute', left: -8, bottom: 18, width: 0, height: 0,
    borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.white,
  },
  tailBottom: {
    position: 'absolute', bottom: -9, left: 26, width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.white,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
  headerSide: { width: 72 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.night },
  headerSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), ...shadow },
  chip: {
    paddingHorizontal: spacing(4), paddingVertical: spacing(1.5), borderRadius: radius.pill,
    borderWidth: 2, borderColor: colors.green, backgroundColor: colors.white,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.green },
  points: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.sunLight,
    paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radius.pill,
  },
  pointsText: { fontFamily: fonts.bold, fontSize: 15, color: colors.night },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing(2) },
  privacyText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.green },
  track: { backgroundColor: colors.creamDark, overflow: 'hidden', width: '100%' },
});
