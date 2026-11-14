import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../../components/Baobi';
import { Bubble, Button, Chip, Header, PrivacyNote, tap } from '../../components/ui';
import { CENTRES, type Centre } from '../../data/content';
import { loadCentres } from '../../lib/geo';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type Slot = { id: string; starts_at: string; ends_at: string; service: string; remaining: number };

const SERVICES = [
  { id: 'screening', label: 'Dépistage' },
  { id: 'counselling', label: 'Conseil' },
  { id: 'prep', label: 'PrEP' },
] as const;

const dayKey = (iso: string) => iso.slice(0, 10);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// M5 — Réservation anonyme en 3 touches : service → créneau → confirmation. Un code remplace le nom.
export default function Reserver() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { syncNow, saveBooking } = useStore();
  const [centre, setCentre] = useState<Centre | undefined>(CENTRES.find((c) => c.id === id));
  const [service, setService] = useState<string>('screening');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<{ id: string; code: string; starts_at: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setSlots(null);
    const ok = await syncNow();
    if (!ok) {
      setError('Connexion impossible. Vérifie ton internet puis réessaie.');
      setSlots([]);
      return;
    }
    const { data, error: e } = await supabase.rpc('available_slots', { p_centre_id: id, p_days: 7 });
    if (e) setError(e.message);
    setSlots((data as Slot[]) ?? []);
  }, [id, syncNow]);

  useEffect(() => {
    loadCentres().then((all) => setCentre(all.find((c) => c.id === id)));
    load();
  }, [id, load]);

  const filtered = useMemo(() => (slots ?? []).filter((s) => s.service === service), [slots, service]);
  const days = useMemo(() => [...new Set(filtered.map((s) => dayKey(s.starts_at)))], [filtered]);
  const activeDay = day && days.includes(day) ? day : days[0];
  const daySlots = filtered.filter((s) => dayKey(s.starts_at) === activeDay);

  const confirm = async () => {
    if (!slot) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc('book_slot', { p_slot_id: slot.id });
    setBusy(false);
    if (e || !data) {
      setError(e?.message ?? 'Réservation impossible');
      load();
      return;
    }
    tap();
    setBooking(data);
    saveBooking({ id: data.id, code: data.code, centreName: centre?.name ?? '', startsAt: data.starts_at ?? slot.starts_at, status: 'confirmed' });
  };

  if (booking) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.done}>
          <Baobi size={130} mood="cheer" />
          <Text style={styles.doneTitle}>C’est réservé !</Text>
          <Text style={styles.doneSub}>Présente ce code à l’accueil du centre :</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{booking.code}</Text>
          </View>
          <Text style={styles.doneMeta}>
            {centre?.name}{'\n'}
            {slot && `${dayLabel(slot.starts_at)} à ${timeLabel(slot.starts_at)}`}
          </Text>
          <Text style={styles.doneHint}>Ton rappel s’affichera comme « Rendez-vous bien-être ».</Text>
        </View>
        <View style={{ padding: spacing(5), gap: spacing(3) }}>
          <Button label="Écrire à l’infirmière" icon="chatbubbles" onPress={() => router.push('/chatbot')} />
          <Button label="Terminé" variant="light" small onPress={() => router.replace('/accueil')} />
          <PrivacyNote text="Aucun nom, aucun numéro demandé" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Réserver" subtitle={centre?.name} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Baobi size={70} />
          <Bubble style={{ flex: 1 }}>Pas besoin de ton nom : tu recevras un code secret 🔒</Bubble>
        </View>

        <Text style={styles.step}>1. Service</Text>
        <View style={styles.row}>
          {SERVICES.map((s) => (
            <Chip key={s.id} label={s.label} active={service === s.id} onPress={() => { setService(s.id); setSlot(null); }} />
          ))}
        </View>

        <Text style={styles.step}>2. Créneau</Text>
        {slots === null ? (
          <ActivityIndicator color={colors.green} />
        ) : days.length === 0 ? (
          <Text style={styles.empty}>{error ? '' : 'Aucun créneau libre cette semaine pour ce service.'}</Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {days.map((d) => (
                <Chip key={d} label={dayLabel(d + 'T12:00:00')} active={d === activeDay} onPress={() => { setDay(d); setSlot(null); }} />
              ))}
            </ScrollView>
            <View style={styles.grid}>
              {daySlots.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { tap(); setSlot(s); }}
                  style={[styles.slot, slot?.id === s.id && styles.slotActive]}
                >
                  <Text style={[styles.slotText, slot?.id === s.id && { color: colors.white }]}>{timeLabel(s.starts_at)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={20} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {error && <Button label="Réessayer" variant="light" small icon="refresh" onPress={load} />}
      </ScrollView>
      <View style={{ padding: spacing(5) }}>
        <Button label={busy ? 'Réservation…' : '3. Confirmer'} icon="checkmark-circle" disabled={!slot || busy} onPress={confirm} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(5), paddingTop: spacing(2), gap: spacing(3) },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  step: { fontFamily: fonts.bold, fontSize: 16, color: colors.night, marginTop: spacing(2) },
  row: { flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(2) },
  slot: { width: '30%', paddingVertical: spacing(3), borderRadius: radius.md, backgroundColor: colors.white, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  slotActive: { backgroundColor: colors.green, borderColor: colors.green },
  slotText: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  empty: { fontFamily: fonts.medium, color: colors.muted },
  error: { flexDirection: 'row', gap: spacing(2), alignItems: 'center', backgroundColor: '#FDE7E4', padding: spacing(3), borderRadius: radius.md },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.night },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(5) },
  doneTitle: { fontFamily: fonts.black, fontSize: 28, color: colors.green, marginTop: spacing(2) },
  doneSub: { fontFamily: fonts.medium, fontSize: 15, color: colors.night, marginTop: spacing(2) },
  codeBox: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing(8), paddingVertical: spacing(4), marginTop: spacing(3), borderWidth: 3, borderColor: colors.sun, borderStyle: 'dashed', ...shadow },
  code: { fontFamily: fonts.black, fontSize: 38, color: colors.night, letterSpacing: 2 },
  doneMeta: { fontFamily: fonts.semibold, fontSize: 15, color: colors.night, textAlign: 'center', marginTop: spacing(4) },
  doneHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: spacing(2) },
});
