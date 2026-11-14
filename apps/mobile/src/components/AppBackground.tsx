import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, useWindowDimensions, View } from 'react-native';
import { backgroundOf } from '../lib/backgrounds';
import { useStore } from '../lib/store';
import { colors } from '../theme';

/**
 * Arrière-plan commun à toutes les pages (les écrans sont transparents par-dessus).
 * Il est calé sur la taille exacte de l'écran : le paysage du bas de l'image reste visible
 * quelle que soit la longueur du contenu.
 */
export function AppBackground({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const { width, height } = useWindowDimensions();
  const bg = backgroundOf(settings.background);
  return (
    <View style={styles.root}>
      <ImageBackground source={bg.source} resizeMode="cover" style={[styles.bg, { width, height }]} pointerEvents="none">
        {bg.veil > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cream, opacity: bg.veil }]} />}
      </ImageBackground>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  bg: { position: 'absolute', top: 0, left: 0 },
});
