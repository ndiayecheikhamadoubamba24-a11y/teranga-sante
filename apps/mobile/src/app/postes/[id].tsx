import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANG_NAME, NURSE_STATUS, NurseAvatar } from '../../components/NurseAvatar';
import { Button, Header, PrivacyNote, tap } from '../../components/ui';
import { hoursText, todayHours, type Centre } from '../../data/content';
import { callWithWarning } from '../../lib/call';
import { loadNurses, type Nurse } from '../../lib/chat';
import { distanceKm, formatKm, loadCentres, useMyLocation } from '../../lib/geo';
import { getSyncError, useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

// Poste de santé : infos pratiques + infirmières disponibles avec leur numéro professionnel.
export default function Poste() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { syncNow } = useStore();
  const me = useMyLocation();
  const [centre, setCentre] = useState<Centre | null | undefined>(undefined);
  const [nurses, setNurses] = useState<Nurse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCentres().then((all) => setCentre(all.find((c) => c.id === id) ?? null));
    (async () => {
      try {
        if (!(await syncNow())) throw new Error('offline');
        setNurses((await loadNurses()).filter((n) => n.centre_id === id));
      } catch {
        setError(getSyncError());
        setNurses([]);
      }
    })();
  }, [id, syncNow]);

  const [available, others] = useMemo(() => {
    const list = nurses ?? [];
    return [list.filter((n) => n.status !== 'away'), list.filter((n) => n.status === 'away')];
  }, [nurses]);
  const centrePhone = nurses?.find((n) => n.centre_phone)?.centre_phone ?? null;

  if (centre === undefined) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.green} /></SafeAreaView>;
  if (centre === null) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Header title="Poste de santé" />
        <View style={styles.center}><Text style={styles.muted}>Ce poste n’existe plus.</Text></View>
      </SafeAreaView>
    );
  }

  const h = todayHours(centre);
  const itinerary = () => {
    const url = Platform.OS === 'android'
      ? `geo:${centre.lat},${centre.lng}?q=${centre.lat},${centre.lng}(${encodeURIComponent(centre.name)})`
      : `https://www.google.com/maps/dir/?api=1&destination=${centre.lat},${centre.lng}`;
    Linking.openURL(url).catch(() => {});
  };
  const write = (n: Nurse) => router.push({ pathname: '/discussion', params: { nurse: n.id } });

  const NurseCard = ({ n }: { n: Nurse }) => {
    const st = NURSE_STATUS[n.status];
    const away = n.status === 'away';
    return (
      <View style={[styles.nurse, away && { opacity: 0.7 }]}>
        <Pressable style={styles.nurseTop} onPress={() => router.push({ pathname: '/infirmieres/[id]', params: { id: n.id } })} accessibilityLabel={`Profil de ${n.display_name}`}>
          <NurseAvatar nurse={n} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nurseName}>{n.display_name}</Text>
            {n.specialty && <Text style={styles.specialty} numberOfLines={1}>{n.specialty}</Text>}
            <Text style={styles.muted}>
              <Text style={{ color: st.color, fontFamily: fonts.bold }}>● {st.label}</Text>  ·  {n.languages.map((l) => LANG_NAME[l] ?? l).join(', ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
        {!away && n.phone && (
          <Pressable style={styles.phoneRow} onPress={() => { tap(); callWithWarning(n.display_name, n.phone!, () => write(n)); }} accessibilityLabel={`Appeler ${n.display_name} au ${n.phone}`}>
            <Ionicons name="call" size={18} color={colors.green} />
            <Text style={styles.phone}>{n.phone}</Text>
          </Pressable>
        )}
        <View style={styles.nurseActions}>
          {!away && n.phone && (
            <Button label="Appeler" icon="call" small style={{ flex: 1 }} onPress={() => callWithWarning(n.display_name, n.phone!, () => write(n))} />
          )}
          <Button label="Écrire" icon="chatbubbles" variant={!away && n.phone ? 'light' : 'green'} small style={{ flex: 1 }} onPress={() => write(n)} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Poste de santé" />
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <View style={styles.card}>
          <Text style={styles.title}>{centre.name}</Text>
          {(centre.address || centre.district) && <Text style={styles.muted}>{[centre.address, centre.district].filter(Boolean).join(' · ')}</Text>}
          <View style={styles.row}>
            <Text style={[styles.tag, h.open ? styles.tagOpen : styles.tagClosed]}>{hoursText(h)}</Text>
            {me && <Text style={styles.tag}>{formatKm(distanceKm(me, centre))}</Text>}
            {centre.is_free && <Text style={styles.tag}>Gratuit</Text>}
            {centre.is_confidential && <Text style={styles.tag}>Confidentiel</Text>}
          </View>
          <View style={styles.actions}>
            <Button label="Réserver ici" icon="calendar" variant="orange" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/reserver/[id]', params: { id: centre.id } })} />
            <Button label="Itinéraire" icon="navigate" variant="light" small style={{ flex: 1 }} onPress={itinerary} />
          </View>
          {centrePhone && (
            <Pressable style={styles.phoneRow} onPress={() => callWithWarning(centre.name, centrePhone)}>
              <Ionicons name="call-outline" size={18} color={colors.night} />
              <Text style={styles.centrePhone}>Accueil du poste : {centrePhone}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>Infirmières disponibles {nurses ? `(${available.length})` : ''}</Text>
        {nurses === null ? <ActivityIndicator color={colors.green} /> : (
          <>
            {error && <Text style={styles.warn}>{error}</Text>}
            {available.length === 0 && !error && (
              <View style={styles.card}>
                <Text style={styles.muted}>Aucune infirmière n’est disponible maintenant dans ce poste. Tu peux réserver un créneau ou écrire : elle te répondra dès son retour.</Text>
              </View>
            )}
            {available.map((n) => <NurseCard key={n.id} n={n} />)}
            {others.length > 0 && (
              <>
                <Text style={styles.subsection}>Absentes pour le moment</Text>
                {others.map((n) => <NurseCard key={n.id} n={n} />)}
              </>
            )}
          </>
        )}
        <PrivacyNote text="Écrire dans l’app reste anonyme · un appel montre ton numéro" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(6) },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), gap: spacing(2), ...shadow },
  title: { fontFamily: fonts.black, fontSize: 20, color: colors.night },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontFamily: fonts.semibold, fontSize: 11, color: colors.green, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  tagOpen: { color: colors.greenDark, backgroundColor: colors.greenLight },
  tagClosed: { color: colors.muted, backgroundColor: colors.creamDark },
  actions: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(1) },
  centrePhone: { fontFamily: fonts.semibold, fontSize: 13, color: colors.night },
  section: { fontFamily: fonts.bold, fontSize: 17, color: colors.night, backgroundColor: 'rgba(255,248,236,0.9)', alignSelf: 'flex-start', paddingHorizontal: spacing(2), borderRadius: 8, overflow: 'hidden' },
  subsection: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night, marginTop: spacing(2), backgroundColor: 'rgba(255,248,236,0.9)', alignSelf: 'flex-start', paddingHorizontal: spacing(2), borderRadius: 8, overflow: 'hidden' },
  warn: { fontFamily: fonts.regular, fontSize: 12, color: colors.night, backgroundColor: 'rgba(255,255,255,0.92)', padding: spacing(3), borderRadius: radius.md, overflow: 'hidden' },
  nurse: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(3), gap: spacing(2), ...shadow },
  nurseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  nurseName: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  specialty: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), backgroundColor: colors.greenLight, borderRadius: radius.md, paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
  phone: { fontFamily: fonts.bold, fontSize: 17, color: colors.greenDark, letterSpacing: 0.5 },
  nurseActions: { flexDirection: 'row', gap: spacing(2) },
});
