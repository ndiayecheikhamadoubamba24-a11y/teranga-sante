import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radius, spacing } from '../theme';

function Skyline() {
  return (
    <Svg width="100%" height={170} viewBox="0 0 360 170" preserveAspectRatio="xMidYMax slice">
      <Path d="M0 130 Q180 112 360 128 L360 170 L0 170 Z" fill="#7FB86A" />
      {/* Monument */}
      <G fill="#7A5A3A">
        <Path d="M172 128 L178 40 L184 40 L190 128 Z" />
        <Circle cx={181} cy={34} r={8} />
        <Rect x={160} y={124} width={42} height={8} />
      </G>
      <G fill="#3E8E3A">
        <Circle cx={40} cy={110} r={22} />
        <Circle cx={70} cy={116} r={16} />
        <Circle cx={300} cy={108} r={24} />
        <Circle cx={330} cy={116} r={16} />
      </G>
      <G fill="#E6C08A">
        <Rect x={100} y={104} width={40} height={26} />
        <Rect x={222} y={100} width={50} height={30} />
      </G>
    </Svg>
  );
}

// Écran 10 — Mode discret (M13) : faux écran météo. Doigt posé 3 secondes sur la température pour revenir.
const EXIT_HOLD_MS = 3000;
export default function Discret() {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/accueil'));
  return (
    <View style={{ flex: 1 }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2F7FD8" />
            <Stop offset="0.6" stopColor="#7DC0F0" />
            <Stop offset="1" stopColor="#CDE9FA" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
      </Svg>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.weather}>
          <View style={styles.sun}>
            <Ionicons name="partly-sunny" size={110} color={colors.sun} />
          </View>
          <Pressable onLongPress={leave} delayLongPress={EXIT_HOLD_MS} accessibilityLabel="Température">
            <Text style={styles.temp}>{unit === 'C' ? '28°C' : '82°F'}</Text>
            <Text style={styles.cond}>Ciel dégagé</Text>
            <Text style={styles.city}>Dakar</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Skyline />
        </View>
        <View style={styles.cards}>
          <View style={styles.card}>
            <Ionicons name="lock-closed" size={18} color={colors.night} />
            <Text style={styles.cardText}>Écran{'\n'}protégé</Text>
          </View>
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={26} color={colors.green} />
            <Text style={styles.cardText}>Utilisation :{'\n'}Mode discret activé</Text>
          </View>
          <Pressable style={styles.settings} onPress={() => setUnit(unit === 'C' ? 'F' : 'C')}>
            <Ionicons name="settings-sharp" size={18} color={colors.night} />
            <Text style={styles.settingsText}>Paramètres</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  weather: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(4), paddingTop: spacing(10) },
  sun: { marginLeft: -spacing(4) },
  temp: { fontFamily: fonts.bold, fontSize: 52, color: colors.white },
  cond: { fontFamily: fonts.medium, fontSize: 18, color: colors.white },
  city: { fontFamily: fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  cards: { backgroundColor: '#E9F3E4', padding: spacing(5), gap: spacing(3) },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(3), backgroundColor: colors.cream, borderRadius: radius.lg, padding: spacing(4) },
  cardText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night, textAlign: 'center' },
  settings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2), backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: spacing(3) },
  settingsText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night },
});
