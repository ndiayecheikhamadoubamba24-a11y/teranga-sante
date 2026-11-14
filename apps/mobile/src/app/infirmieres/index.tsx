import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baobi } from '../../components/Baobi';
import { LANG_NAME, NURSE_STATUS, NurseAvatar } from '../../components/NurseAvatar';
import { Bubble, Button, Chip, Header, PrivacyNote, tap } from '../../components/ui';
import { loadNurses, type Nurse } from '../../lib/chat';
import { getSyncError, useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type Filter = 'online' | 'fr' | 'wo' | 'ff';

// M6 — Liste des infirmières : spécialité, langues, centre, statut en ligne.
export default function Infirmieres() {
  const { centre } = useLocalSearchParams<{ centre?: string }>();
  const { syncNow, settings } = useStore();
  const [nurses, setNurses] = useState<Nurse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [centreId, setCentreId] = useState<string | undefined>(centre);

  const load = useCallback(async () => {
    setError(null);
    setNurses(null);
    try {
      if (!(await syncNow())) throw new Error('offline');
      setNurses(await loadNurses());
    } catch {
      setError(getSyncError());
      setNurses([]);
    }
  }, [syncNow]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (f: Filter) => setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (nurses ?? []).filter((n) => {
      if (centreId && n.centre_id !== centreId) return false;
      if (filters.includes('online') && n.status !== 'online') return false;
      const langs = filters.filter((f) => f !== 'online');
      if (langs.length && !langs.some((l) => n.languages.includes(l))) return false;
      return !s || `${n.display_name} ${n.specialty ?? ''} ${n.centre_name ?? ''} ${n.centre_district ?? ''}`.toLowerCase().includes(s);
    });
  }, [nurses, q, filters, centreId]);

  const centreName = centreId ? nurses?.find((n) => n.centre_id === centreId)?.centre_name : null;
  const online = (nurses ?? []).filter((n) => n.status === 'online').length;

  const header = (
    <View style={{ gap: spacing(3), marginBottom: spacing(2) }}>
      <View style={styles.hero}>
        <Baobi size={88} />
        <Bubble style={{ flex: 1 }}>
          {online > 0 ? `${online} infirmière${online > 1 ? 's' : ''} en ligne maintenant. Choisis avec qui parler, tu restes anonyme 🔒` : 'Choisis une infirmière : elle te répondra dès que possible. Tu restes anonyme 🔒'}
        </Bubble>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nom, spécialité, quartier…" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>
      <View style={styles.chips}>
        <Chip label="En ligne" active={filters.includes('online')} onPress={() => toggle('online')} />
        {(['fr', 'wo', 'ff'] as const).map((l) => (
          <Chip key={l} label={LANG_NAME[l]} active={filters.includes(l)} onPress={() => toggle(l)} />
        ))}
        {centreId && <Chip label={`${centreName ?? 'Ce centre'} ✕`} active onPress={() => setCentreId(undefined)} />}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header title="Infirmières" subtitle="Des professionnelles à ton écoute" />
      {nurses === null ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.green} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing(4), paddingTop: spacing(1), gap: spacing(3) }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{error ?? 'Aucune infirmière ne correspond à ta recherche.'}</Text>
              {error && <Button label="Réessayer" icon="refresh" small onPress={load} />}
            </View>
          }
          ListFooterComponent={<PrivacyNote text="Ton nom n’est jamais transmis aux infirmières" />}
          renderItem={({ item: n }) => (
            <Pressable
              onPress={() => {
                tap();
                router.push({ pathname: '/infirmieres/[id]', params: { id: n.id } });
              }}
              style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
              accessibilityRole="button"
              accessibilityLabel={`${n.display_name}, ${n.specialty ?? 'infirmière'}, ${NURSE_STATUS[n.status].label}`}
            >
              <NurseAvatar nurse={n} size={58} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{n.display_name}</Text>
                  <Text style={[styles.status, { color: NURSE_STATUS[n.status].color }]}>● {NURSE_STATUS[n.status].label}</Text>
                </View>
                {n.specialty && <Text style={styles.specialty} numberOfLines={1}>{n.specialty}</Text>}
                <Text style={styles.meta} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color={colors.muted} /> {[n.centre_name, n.centre_district].filter(Boolean).join(' · ')}
                </Text>
                <View style={styles.langs}>
                  {n.languages.map((l) => (
                    <Text key={l} style={[styles.lang, l === settings.lang && styles.langMine]}>{LANG_NAME[l] ?? l}</Text>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>
          )}
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
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(3), ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  status: { fontFamily: fonts.semibold, fontSize: 12 },
  specialty: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  langs: { flexDirection: 'row', gap: 6, marginTop: 4 },
  lang: { fontFamily: fonts.semibold, fontSize: 11, color: colors.night, backgroundColor: colors.creamDark, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  langMine: { backgroundColor: colors.sunLight },
  empty: { alignItems: 'center', gap: spacing(3), padding: spacing(6) },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
