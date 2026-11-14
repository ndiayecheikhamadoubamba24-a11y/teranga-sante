import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { BADGES, BadgeShield } from '../../components/Badge';
import { ProgressBar } from '../../components/ui';
import { BACKGROUNDS, DEFAULT_BACKGROUND } from '../../lib/backgrounds';
import { levelOf, useStore } from '../../lib/store';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const SHOWN_BADGES = ['curieux', 'actif', 'solidaire', 'mythbuster'];

// Écran 9 — Profil et progression (M14) : niveau, badges, points, classement par quartier (sans noms).
export default function Moi() {
  const { player, bookings, settings, setShakeToHide, setBackground } = useStore();
  if (!player) return null;
  const level = levelOf(player.points);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(6) }}>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Avatar face={player.avatar.face} accessory={player.avatar.accessory} size={120} />
          </View>
          <View style={styles.levelCard}>
            <Text style={styles.pseudo}>{player.pseudo}</Text>
            <Text style={styles.levelLabel}>Niveau</Text>
            <Text style={styles.level}>{level.name}</Text>
            <View style={styles.levelRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={level.progress} />
              </View>
              <Text style={styles.pct}>{Math.round(level.progress * 100)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.badges}>
          {SHOWN_BADGES.map((b) => {
            const has = player.badges.includes(b);
            return (
              <View key={b} style={styles.badge}>
                <BadgeShield id={b} size={52} locked={!has} />
                <Text style={[styles.badgeLabel, !has && { color: colors.muted }]}>{BADGES[b].label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.pointsRow}>
          <Ionicons name="trophy" size={26} color={colors.sun} />
          <Text style={styles.points}>{player.points} points</Text>
        </View>

        <View style={styles.rank}>
          <View style={styles.rankHead}>
            <Ionicons name="stats-chart" size={18} color={colors.orange} />
            <Text style={styles.rankTitle}>Classement par quartier</Text>
            <Text style={styles.rankValue}>bientôt</Text>
          </View>
        </View>

        {bookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes rendez-vous bien-être</Text>
            {bookings.slice(0, 3).map((b) => (
              <View key={b.id} style={styles.bookingRow}>
                <Text style={styles.code}>{b.code}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingText} numberOfLines={1}>{b.centreName}</Text>
                  <Text style={styles.bookingSub}>
                    {new Date(b.startsAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fond d’écran</Text>
          <View style={styles.bgRow}>
            {BACKGROUNDS.map((b) => {
              const active = (settings.background ?? DEFAULT_BACKGROUND) === b.id;
              return (
                <Pressable key={b.id} onPress={() => setBackground(b.id)} style={styles.bgItem} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`Fond ${b.label}`}>
                  <View style={[styles.bgThumb, active && styles.bgActive]}>
                    <Image source={b.thumb} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {active && <View style={styles.bgCheck}><Ionicons name="checkmark" size={14} color={colors.white} /></View>}
                  </View>
                  <Text style={[styles.bgLabel, active && { color: colors.green }]}>{b.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Réglages</Text>
          <View style={styles.setting}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.night} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingText}>Secouer pour masquer</Text>
              <Text style={styles.bookingSub}>Affiche un faux écran météo. Appui long sur la température pour revenir.</Text>
            </View>
            <Switch value={settings.shakeToHide} onValueChange={setShakeToHide} trackColor={{ true: colors.green }} />
          </View>
          <Pressable style={styles.setting} onPress={() => router.push('/infirmieres')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.night} />
            <Text style={[styles.bookingText, { flex: 1 }]}>Parler à une infirmière</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.setting} onPress={() => router.push('/discret')}>
            <Ionicons name="eye-off-outline" size={22} color={colors.night} />
            <Text style={[styles.bookingText, { flex: 1 }]}>Activer le mode discret maintenant</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.setting} onPress={() => router.push('/profil')}>
            <Ionicons name="create-outline" size={22} color={colors.night} />
            <Text style={[styles.bookingText, { flex: 1 }]}>Modifier mon pseudo / avatar</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.setting} onPress={() => router.push('/')}>
            <Ionicons name="language-outline" size={22} color={colors.night} />
            <Text style={[styles.bookingText, { flex: 1 }]}>Langue</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing(4), padding: spacing(5) },
  avatar: { borderRadius: 60, overflow: 'hidden', borderWidth: 4, borderColor: colors.sun },
  levelCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), ...shadow },
  pseudo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  levelLabel: { fontFamily: fonts.bold, fontSize: 18, color: colors.night, lineHeight: 22 },
  level: { fontFamily: fonts.bold, fontSize: 18, color: colors.night, lineHeight: 22 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) },
  pct: { fontFamily: fonts.bold, fontSize: 13, color: colors.night },
  badges: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: spacing(5), backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: spacing(3), ...shadow },
  badge: { alignItems: 'center', gap: 2 },
  badgeLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.night },
  pointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2), marginVertical: spacing(4) },
  points: { fontFamily: fonts.bold, fontSize: 22, color: colors.night },
  rank: { marginHorizontal: spacing(5), backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), padding: spacing(3) },
  rankTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.night },
  rankValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  section: { marginHorizontal: spacing(5), marginTop: spacing(5), backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing(4), gap: spacing(3), ...shadow },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.night },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  code: { fontFamily: fonts.black, fontSize: 15, color: colors.green, backgroundColor: colors.greenLight, paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: 8, overflow: 'hidden' },
  bookingText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.night },
  bookingSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  setting: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(1) },
  bgRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bgItem: { alignItems: 'center', gap: 4, width: '23%' },
  bgThumb: { width: '100%', aspectRatio: 0.62, borderRadius: radius.md, overflow: 'hidden', borderWidth: 3, borderColor: 'transparent' },
  bgActive: { borderColor: colors.green },
  bgCheck: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  bgLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.night },
});
