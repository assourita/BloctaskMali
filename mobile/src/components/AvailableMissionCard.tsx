import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatXOF } from '../constants/africa';
import { colors, radius, shadow, spacing } from '../constants/theme';
import type { Mission } from '../types';

function formatDateTime(d?: string) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/** Carte mission disponible — postuler depuis la page détail uniquement. */
export function AvailableMissionCard({ mission }: { mission: Mission }) {
  const category = mission.category?.name || mission.category_name;
  const deposit = mission.required_deposit ?? mission.deposit_amount ?? 0;
  const client = mission.client;
  const goDetail = () => router.push(`/mission/${mission.id}`);

  return (
    <Pressable style={[styles.card, shadow]} onPress={goDetail}>
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ) : null}
          {mission.is_applied ? (
            <View style={styles.appliedPill}>
              <Text style={styles.appliedText}>Candidature envoyée</Text>
            </View>
          ) : null}
          {mission.distance_km != null ? (
            <Text style={styles.distance}>{mission.distance_km.toFixed(1)} km</Text>
          ) : null}
        </View>
        <View style={styles.rightMeta}>
          <Text style={styles.budget}>{formatXOF(mission.budget)}</Text>
          {deposit > 0 ? (
            <View style={styles.depositBadge}>
              <Text style={styles.depositText}>Caution {formatXOF(deposit)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{mission.title}</Text>

      {(mission.pickup_address || mission.delivery_address) && (
        <View style={styles.route}>
          {mission.pickup_address ? (
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View>
                <Text style={styles.routeLabel}>DÉPART</Text>
                <Text style={styles.routeAddr} numberOfLines={2}>{mission.pickup_address}</Text>
              </View>
            </View>
          ) : null}
          {mission.delivery_address ? (
            <View style={[styles.routeRow, { marginTop: 8 }]}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View>
                <Text style={styles.routeLabel}>ARRIVÉE</Text>
                <Text style={styles.routeAddr} numberOfLines={2}>{mission.delivery_address}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {mission.deadline ? (
        <Text style={styles.timeMeta}>{formatDateTime(mission.deadline)}</Text>
      ) : null}

      {client ? (
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientInitials}>
              {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>Appuyez pour voir les détails et postuler</Text>
        <Text style={styles.footerChevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  leftMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  rightMeta: { alignItems: 'flex-end' },
  categoryPill: { backgroundColor: colors.infoLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  categoryText: { color: '#1e40af', fontSize: 11, fontWeight: '700' },
  appliedPill: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  appliedText: { color: '#047857', fontSize: 11, fontWeight: '700' },
  distance: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  budget: { fontSize: 20, fontWeight: '800', color: colors.primary },
  depositBadge: { backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  depositText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  route: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  routeRow: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  routeAddr: { fontSize: 13, color: colors.text, marginTop: 2 },
  timeMeta: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  clientAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  clientInitials: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  clientName: { fontSize: 13, fontWeight: '600', color: colors.text },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flex: 1 },
  footerChevron: { fontSize: 22, color: colors.primary, fontWeight: '700' },
});
