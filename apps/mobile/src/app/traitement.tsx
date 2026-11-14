import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plant } from '../components/Illustrations';
import { Button, tap } from '../components/ui';
import { colors, fonts, radius, shadow, spacing } from '../theme';

// Suivi stocké UNIQUEMENT sur le téléphone : aucune donnée de traitement n'est envoyée au serveur.
const KEY = 'teranga.wellness';
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(12, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

// Écran 8 — Rappel de traitement discret (M10) : libellé neutre « Hydratation », plante qui grandit.
export default function Traitement() {
  const [done, setDone] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const today = iso(new Date());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => raw && setDone(JSON.parse(raw)));
  }, []);

  const toggleToday = () => {
    tap();
    const next = done.includes(today) ? done.filter((d) => d !== today) : [...done, today];
    setDone(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );
  const month = week[3].toLocaleDateString('fr-FR', { month: 'long' });

  // Régularité sur les 5 derniers jours (aujourd'hui inclus) → stade de la plante.
  const last5 = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    return done.includes(iso(d));
  });
  const stage = last5.filter(Boolean).length;
  const takenToday = done.includes(today);

  const shift = (n: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + n * 7);
    setWeekStart(d);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.monthBar}>
        <Pressable hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={colors.night} />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => shift(-1)}><Ionicons name="chevron-back" size={24} color={colors.night} /></Pressable>
        <Text style={styles.month}>{month.charAt(0).toUpperCase() + month.slice(1)}</Text>
        <Pressable hitSlop={10} onPress={() => shift(1)}><Ionicons name="chevron-forward" size={24} color={colors.night} /></Pressable>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.week}>
        {week.map((d, i) => {
          const key = iso(d);
          const isToday = key === today;
          return (
            <View key={key} style={styles.day}>
              <Text style={styles.dayName}>{DAYS[i]}</Text>
              <View style={[styles.dayNum, isToday && styles.dayToday, !isToday && done.includes(key) && styles.dayDone]}>
                <Text style={[styles.dayText, isToday && { color: colors.white }]}>{d.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing(5), gap: spacing(4) }}>
        <View style={styles.card}>
          <View style={styles.glass}>
            <Ionicons name="water" size={34} color={colors.sky} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Hydratation</Text>
            <Text style={styles.cardText}>Pense à bien boire de l’eau aujourd’hui !</Text>
          </View>
        </View>
        <Button
          label={takenToday ? 'Fait aujourd’hui ✓' : 'C’est fait !'}
          variant={takenToday ? 'light' : 'green'}
          icon={takenToday ? 'checkmark-done' : 'checkmark'}
          onPress={toggleToday}
        />

        <Text style={styles.plantTitle}>Ma plante grandit !</Text>
        <View style={styles.plantBox}>
          <Plant stage={stage} height={170} />
          <View style={styles.dots}>
            {last5.map((ok, i) =>
              i === 4 && ok ? (
                <View key={i} style={[styles.dot, styles.dotCheck]}>
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                </View>
              ) : (
                <View key={i} style={[styles.dot, { backgroundColor: ok ? colors.sun : 'rgba(255,255,255,0.4)' }]} />
              ),
            )}
          </View>
        </View>
        <Text style={styles.private}>🔒 Ce suivi reste sur ton téléphone.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
  month: { fontFamily: fonts.bold, fontSize: 20, color: colors.night, minWidth: 130, textAlign: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing(2) },
  day: { alignItems: 'center', gap: spacing(1) },
  dayName: { fontFamily: fonts.medium, fontSize: 12, color: colors.night },
  dayNum: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayToday: { backgroundColor: colors.green },
  dayDone: { backgroundColor: colors.sunLight },
  dayText: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing(4), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(5), ...shadow },
  glass: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#E3F2FC', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.night },
  cardText: { fontFamily: fonts.regular, fontSize: 14, color: colors.night },
  plantTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.night, textAlign: 'center', marginTop: spacing(2) },
  plantBox: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#FFF1CC' },
  dots: { position: 'absolute', bottom: spacing(3), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing(3) },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: colors.greenDark },
  dotCheck: { backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderColor: colors.white },
  private: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
