import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type Mood = 'happy' | 'cheer' | 'wave' | 'thumb';

// Rapport largeur / hauteur de l'emblème du logo (baobab + soleil).
const RATIO = 1.586;

/**
 * Baobi = le baobab du logo officiel Teranga Santé.
 * `size` = largeur en px. Quand Baobi se réjouit (`cheer`), il fait un petit rebond.
 */
export function Baobi({ size = 160, mood = 'happy' }: { size?: number; mood?: Mood }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood !== 'cheer') return;
    const anim = Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 420, easing: Easing.bounce, useNativeDriver: true }),
    ]);
    Animated.loop(anim, { iterations: 3 }).start();
  }, [mood, bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.08] });
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Animated.Image
      source={require('../../assets/logo-mark.png')}
      style={{ width: size, height: size / RATIO, transform: [{ translateY }, { scale }] }}
      resizeMode="contain"
      accessibilityLabel="Baobi"
    />
  );
}
