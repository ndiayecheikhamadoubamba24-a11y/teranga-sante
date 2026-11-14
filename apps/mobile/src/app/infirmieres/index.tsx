import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../../components/Baobi';
import { Bubble, Button, Chip, Header, PrivacyNote, tap } from '../../components/ui';
import { hoursText, todayHours, type Centre } from '../../data/content';
import { loadNurses, type Nurse } from '../../lib/chat';
import { byDistance, formatKm, loadCentres, useMyLocation } from '../../lib/geo';
import { getSyncError, useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type Poste = Centre & { km: number | null; nurses: Nurse[]; available: number };

// Infirmières (M6) — étape 1 : les postes de santé les plus proches, avec le nombre d'infirmières disponibles.
export default function PostesProches() {
  const { syncNow } = useStore();
  const me = useMyLocation();
  const [centres, setCentres] = useState<Centre[] | null>(null);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setCentres(null);
    const c = await loadCentres();
    setCentres(c);
    try {
      if (!(await syncNow())) throw new Error('offline');
      setNurses(await loadNurses());
    } catch {
      setError(getSyncError());
    }
  }, [syncNow]);
  useEffect(() => {
    load();
  }, [load]);

  const postes = useMemo<Poste[]>(() => {
    const s = q.trim().toLowerCase();
    return byDistance(centres ?? [], me)
      .map((c) => {
        const list = nurses.filter((n) => n.centre_id === c.id);
        return { ...c, nurses: list, available: list.filter((n) => n.status !== 'away').length };
      })
      .filter((c) => !s || `${c.name} ${c.district ?? ''} ${c.address ?? ''}`.toLowerCase().includes(s))
      .filter((c) => !onlyOpen || todayHours(c).open)
      .filter((c) => !onlyAvailable || c.available > 0);
  }, [centres, nurses, me, q, onlyOpen, onlyAvailable]);

  const header = (
    <View style={{ gap: spacing(3), marginBottom: spacing(2) }}>
      <View style={styles.hero}>
        <Baobi size={84} />
        <Bubble style={{ flex: 1 }}>
          {me ? 'Voici les postes de santé les plus proches de toi. Choisis-en un pour voir les infirmières disponibles.' : 'Choisis un poste de santé pour voir les infirmières disponibles. Active ta localisation pour voir les plus proches.'}
        </Bubble>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Quartier, nom du poste…" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>
      <View style={styles.chips}>
        <Chip label="Ouvert maintenant" active={onlyOpen} onPress={() => setOnlyOpen(!onlyOpen)} />
        <Chip label="Infirmière disponible" active={onlyAvailable} onPress={() => setOnlyAvailable(!onlyAvailable)} />
      </View>
      {error && (
        <View style={styles.warn}>
          <Ionicons name="information-circle" size={18} color={colors.orange} />
          <Text style={styles.warnText}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Postes de santé" subtitle={me ? 'Les plus proches de toi' : 'Infirmières par poste'} />
      {centres === null ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.green} />
      ) : (
        <FlatList
          data={postes}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing(4), paddingTop: spacing(1), gap: spacing(3) }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun poste ne correspond à ta recherche.</Text>
              {error && <Button label="Réessayer" icon="refresh" small onPress={load} />}
            </View>
          }
          ListFooterComponent={<PrivacyNote text="Ta position reste sur ton téléphone" />}
          renderItem={({ item: p, index }) => {
            const h = todayHours(p);
            return (
              <Pressable
                onPress={() => {
                  tap();
                  router.push({ pathname: '/postes/[id]', params: { id: p.id } });
                }}
                style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}${p.km != null ? `, à ${formatKm(p.km)}` : ''}, ${p.available} infirmière(s) disponible(s)`}
              >
                <View style={styles.icon}>
                  <Ionicons name="medkit" size={26} color={colors.white} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {p.km != null ? `${formatKm(p.km)} · ` : ''}{p.district ?? ''}
                  </Text>
                  <View style={styles.row}>
                    <Text style={[styles.tag, h.open ? styles.tagOpen : styles.tagClosed]}>{hoursText(h)}</Text>
                    {me && index === 0 && <Text style={[styles.tag, styles.nearest]}>Le plus proche</Text>}
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: p.available > 0 ? '#2EA043' : '#9B927F' }]} />
                    <Text style={styles.avail}>
                      {p.nurses.length === 0 ? 'Aucune infirmière inscrite' : p.available > 0 ? `${p.available} infirmière${p.available > 1 ? 's' : ''} disponible${p.available > 1 ? 's' : ''}` : 'Pas d’infirmière disponible maintenant'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.muted} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing(4), height: 48 },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.night, height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  warn: { flexDirection: 'row', gap: spacing(2), alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.md, padding: spacing(3) },
  warnText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.night },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(3), ...shadow },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  nearest: { backgroundColor: colors.sunLight, color: colors.night },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.night },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tag: { fontFamily: fonts.semibold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  tagOpen: { color: colors.greenDark, backgroundColor: colors.greenLight },
  tagClosed: { color: colors.muted, backgroundColor: colors.creamDark },
  dot: { width: 9, height: 9, borderRadius: 5 },
  avail: { fontFamily: fonts.semibold, fontSize: 12, color: colors.night },
  empty: { alignItems: 'center', gap: spacing(3), padding: spacing(6) },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
