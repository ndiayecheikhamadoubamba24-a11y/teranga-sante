import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANG_NAME, NURSE_STATUS, NurseAvatar } from '../../components/NurseAvatar';
import { Button, Header, PrivacyNote, tap } from '../../components/ui';
import { todayHours, type Centre } from '../../data/content';
import { loadNurses, loadOpenConversation, myUserId, type Nurse } from '../../lib/chat';
import { loadCentres } from '../../lib/geo';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type FreeSlot = { id: string; starts_at: string; nurse_id: string | null; service: string };
const SERVICE: Record<string, string> = { screening: 'Dépistage', counselling: 'Conseil', consultation: 'Consultation', prep: 'PrEP', selftest_pickup: 'Autotest' };
const slotLabel = (iso: string) =>
  `${new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

// M6 — Profil d'une infirmière : Poser une question, Réserver, Appeler (le centre).
export default function InfirmiereProfil() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { syncNow } = useStore();
  const [nurse, setNurse] = useState<Nurse | null | undefined>(undefined);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await syncNow();
        const n = (await loadNurses()).find((x) => x.id === id) ?? null;
        setNurse(n);
        if (!n?.centre_id) return setSlots([]);
        const [centres, free] = await Promise.all([
          loadCentres(),
          supabase.rpc('available_slots', { p_centre_id: n.centre_id, p_days: 14 }),
        ]);
        setCentre(centres.find((c) => c.id === n.centre_id) ?? null);
        setSlots(((free.data as FreeSlot[]) ?? []).filter((s) => s.nurse_id === n.id).slice(0, 4));
      } catch {
        setNurse(null);
      }
    })();
  }, [id, syncNow]);

  async function ask() {
    if (!nurse) return;
    tap();
    // Une seule discussion à la fois : si elle existe déjà avec une autre infirmière, on la propose.
    const me = await myUserId();
    const open = me ? await loadOpenConversation(me).catch(() => null) : null;
    if (open && open.nurse_id && open.nurse_id !== nurse.id) {
      Alert.alert('Discussion en cours', 'Tu as déjà une discussion ouverte avec une autre infirmière. Termine-la ou continue-la.', [
        { text: 'Continuer ma discussion', onPress: () => router.push('/discussion') },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }
    router.push({ pathname: '/discussion', params: { nurse: nurse.id } });
  }

  function reserve() {
    if (!nurse?.centre_id) return;
    tap();
    router.push({ pathname: '/reserver/[id]', params: { id: nurse.centre_id, nurse: nurse.id, nurseName: nurse.display_name } });
  }

  function call() {
    if (!nurse?.centre_phone) return;
    Alert.alert('Appeler le centre', `Tu vas appeler ${nurse.centre_name} au ${nurse.centre_phone}. Demande ${nurse.display_name} à l’accueil — inutile de donner ton nom.`, [
      { text: 'Appeler', onPress: () => Linking.openURL(`tel:${nurse.centre_phone!.replace(/\s/g, '')}`) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  if (nurse === undefined) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.green} /></SafeAreaView>;
  if (nurse === null) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Header title="Infirmière" />
        <View style={styles.center}>
          <Text style={styles.muted}>Ce profil n’est plus disponible.</Text>
          <Button label="Voir les infirmières" small onPress={() => router.replace('/infirmieres')} />
        </View>
      </SafeAreaView>
    );
  }

  const st = NURSE_STATUS[nurse.status];
  const availability = nurse.status === 'online'
    ? 'Répond en général en moins de 30 min'
    : nurse.status === 'busy' ? 'Occupée en ce moment, elle te répondra rapidement' : 'Absente : elle te répondra dès son retour';
  const hours = centre ? todayHours(centre) : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Profil" />
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <View style={styles.top}>
          <NurseAvatar nurse={nurse} size={104} />
          <Text style={styles.name}>{nurse.display_name}</Text>
          {nurse.specialty && <Text style={styles.specialty}>{nurse.specialty}</Text>}
          <View style={[styles.statusPill, { borderColor: st.color }]}>
            <View style={[styles.dot, { backgroundColor: st.color }]} />
            <Text style={styles.statusText}>{st.label}</Text>
          </View>
          <Text style={styles.muted}>{availability}</Text>
          <View style={styles.langs}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.night} />
            {nurse.languages.map((l) => <Text key={l} style={styles.lang}>{LANG_NAME[l] ?? l}</Text>)}
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Poser une question" icon="chatbubbles" onPress={ask} />
          <View style={{ flexDirection: 'row', gap: spacing(3) }}>
            <Button label="Réserver" icon="calendar" variant="orange" onPress={reserve} disabled={!nurse.centre_id} style={{ flex: 1 }} />
            <Button label="Appeler" icon="call" variant="light" onPress={call} disabled={!nurse.centre_phone} style={{ flex: 1 }} />
          </View>
          {!nurse.centre_phone && <Text style={[styles.muted, { textAlign: 'center' }]}>Le numéro du centre n’est pas encore renseigné.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>À propos</Text>
          <Text style={styles.body}>{nurse.bio?.trim() || `Infirmière ${nurse.centre_name ? `au ${nurse.centre_name}` : ''}, à ton écoute sans jugement. Pose-moi tes questions sur le dépistage, la PrEP ou ta santé.`}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prochains créneaux avec elle</Text>
          {slots === null ? <ActivityIndicator color={colors.green} /> : slots.length === 0 ? (
            <Text style={styles.muted}>Pas de créneau réservé à son nom cette quinzaine. Tu peux réserver avec une autre infirmière du centre.</Text>
          ) : (
            <View style={styles.slots}>
              {slots.map((s) => (
                <Pressable key={s.id} style={styles.slot} onPress={reserve}>
                  <Text style={styles.slotTime}>{slotLabel(s.starts_at)}</Text>
                  <Text style={styles.slotService}>{SERVICE[s.service] ?? s.service}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {nurse.centre_name && (
          <Pressable style={styles.card} onPress={() => router.push('/carte')}>
            <Text style={styles.cardTitle}>Son centre</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <View style={styles.centreIcon}><Ionicons name="business" size={24} color={colors.orange} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.centreName}>{nurse.centre_name}</Text>
                {nurse.centre_district && <Text style={styles.muted}>{nurse.centre_district}</Text>}
                {hours && <Text style={[styles.muted, { color: hours.open ? colors.green : colors.muted }]}>{hours.open ? 'Ouvert' : 'Fermé'} · {hours.label}</Text>}
              </View>
              <Ionicons name="map-outline" size={22} color={colors.green} />
            </View>
          </Pressable>
        )}

        <PrivacyNote text="Ton nom n’est jamais transmis. Tu restes anonyme." />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(3), padding: spacing(6) },
  top: { alignItems: 'center', gap: spacing(1) },
  name: { fontFamily: fonts.black, fontSize: 24, color: colors.night, marginTop: spacing(2) },
  specialty: { fontFamily: fonts.semibold, fontSize: 15, color: colors.green },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: 4, marginTop: spacing(1), backgroundColor: colors.white },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontFamily: fonts.bold, fontSize: 13, color: colors.night },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  langs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing(2) },
  lang: { fontFamily: fonts.semibold, fontSize: 12, color: colors.night, backgroundColor: colors.sunLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  actions: { gap: spacing(3) },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), gap: spacing(2), ...shadow },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.night },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  slot: { borderWidth: 2, borderColor: colors.green, borderRadius: radius.md, paddingHorizontal: spacing(3), paddingVertical: spacing(2), backgroundColor: colors.greenLight },
  slotTime: { fontFamily: fonts.bold, fontSize: 13, color: colors.night },
  slotService: { fontFamily: fonts.regular, fontSize: 11, color: colors.green },
  centreIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.sunLight, alignItems: 'center', justifyContent: 'center' },
  centreName: { fontFamily: fonts.bold, fontSize: 15, color: colors.night },
});
