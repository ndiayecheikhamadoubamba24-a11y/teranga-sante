import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafletMap } from '../../components/map/LeafletMap';
import { Button, Chip, tap } from '../../components/ui';
import { todayHours, type Centre } from '../../data/content';
import { distanceKm, formatKm, loadCentres } from '../../lib/geo';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type Filter = 'free' | 'confidential' | 'open';

// Écran 6 — Carte des centres (M4) : filtres, fiche, réservation anonyme, itinéraire.
export default function Carte() {
  const [centres, setCentres] = useState<Centre[] | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [search, setSearch] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadCentres().then((c) => {
      setCentres(c);
      setSelectedId((s) => s ?? c[0]?.id ?? null);
    });
    // Position utilisée uniquement sur le téléphone pour calculer la distance — jamais envoyée.
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => (status === 'granted' ? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }) : null))
      .then((pos) => pos && setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
      .catch(() => {});
  }, []);

  const visible = useMemo(
    () =>
      (centres ?? []).filter((c) => {
        if (filters.includes('free') && !c.is_free) return false;
        if (filters.includes('confidential') && !c.is_confidential) return false;
        if (filters.includes('open') && !todayHours(c).open) return false;
        if (search && !`${c.name} ${c.district ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [centres, filters, search],
  );

  const selected = visible.find((c) => c.id === selectedId) ?? visible[0];
  const pins = useMemo(() => visible.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, selected: c.id === selected?.id })), [visible, selected?.id]);
  const toggle = (f: Filter) => setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const itinerary = (c: Centre) => {
    const url =
      Platform.OS === 'android'
        ? `geo:${c.lat},${c.lng}?q=${c.lat},${c.lng}(${encodeURIComponent(c.name)})`
        : `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const hours = selected ? todayHours(selected) : null;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => setSearch(search === null ? '' : null)} hitSlop={8} accessibilityLabel="Rechercher">
          <Ionicons name={search === null ? 'search' : 'close'} size={24} color={colors.night} />
        </Pressable>
        {search !== null ? (
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Quartier, centre…" placeholderTextColor={colors.muted} style={styles.search} />
        ) : (
          <View style={styles.chips}>
            <Chip label="Gratuit" active={filters.includes('free')} onPress={() => toggle('free')} />
            <Chip label="Confidentiel" active={filters.includes('confidential')} onPress={() => toggle('confidential')} />
            <Chip label="Ouvert" active={filters.includes('open')} onPress={() => toggle('open')} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <LeafletMap
          pins={pins}
          user={me}
          onSelect={(id) => {
            tap();
            setSelectedId(id);
          }}
        />
      </View>

      {selected && hours ? (
        <View style={styles.sheet}>
          <View style={styles.info}>
            <View style={styles.thumb}>
              <MaterialCommunityIcons name="hospital-building" size={40} color={colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={2}>{selected.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color={colors.night} />
                <Text style={styles.meta}>{hours.label}</Text>
                <Ionicons name="location-outline" size={15} color={colors.night} style={{ marginLeft: spacing(2) }} />
                <Text style={styles.meta}>{me ? formatKm(distanceKm(me, selected)) : selected.district}</Text>
              </View>
              <View style={styles.tags}>
                {selected.is_free && <Text style={styles.tag}>Gratuit</Text>}
                {selected.is_confidential && <Text style={styles.tag}>Confidentiel</Text>}
                <Text style={[styles.tag, !hours.open && { color: colors.muted, backgroundColor: colors.creamDark }]}>{hours.open ? 'Ouvert' : 'Fermé'}</Text>
              </View>
            </View>
          </View>
          <Button label="Réserver anonymement" onPress={() => router.push({ pathname: '/reserver/[id]', params: { id: selected.id } })} />
          <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
            <Button label="Infirmières" icon="people-outline" variant="light" small onPress={() => router.push({ pathname: '/infirmieres', params: { centre: selected.id } })} style={{ flex: 1 }} />
            <Button label="Itinéraire" icon="navigate-outline" variant="light" small onPress={() => itinerary(selected)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={styles.sheet}>
          <Text style={styles.meta}>{centres === null ? 'Chargement des centres…' : 'Aucun centre ne correspond à ces filtres.'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(2), backgroundColor: colors.cream },
  chips: { flexDirection: 'row', gap: spacing(2), flex: 1 },
  search: { flex: 1, fontFamily: fonts.medium, fontSize: 15, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: spacing(4), height: 40, color: colors.night },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing(4), marginTop: -spacing(5), ...shadow },
  info: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(3) },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.sunLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.night },
  tags: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(1) },
  tag: { fontFamily: fonts.semibold, fontSize: 11, color: colors.green, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
});
