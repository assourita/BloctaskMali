import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { payDepositSmart, startMission, submitProof } from '../api/missions';
import { sendLocation } from '../api/tracking';
import { ApiError } from '../api/client';
import { colors, radius, shadow, spacing, STATUS_META } from '../constants/theme';
import { formatXOF } from '../constants/africa';
import type { Mission } from '../types';

function formatDate(d?: string) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function formatTime(d?: string) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function timeRemaining(deadline?: string): { label: string; late: boolean } | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff < 0) return { label: 'En retard', late: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return { label: `${hours}h restantes`, late: false };
  return { label: `${Math.floor(hours / 24)}j restants`, late: false };
}

function needsExpiryAttention(mission: Mission): boolean {
  if (mission.status === 'expired') return true;
  if (mission.expiry_decision_pending) return true;
  if (!mission.deadline) return false;
  const overdue = new Date(mission.deadline).getTime() < Date.now();
  if (!overdue) return false;
  if (mission.status === 'accepted' && mission.provider) return true;
  if (mission.status === 'funded' && !mission.provider) return true;
  return false;
}

function expiryStripMessage(mission: Mission): string {
  if (mission.status === 'expired') return 'Mission expirée — fonds remboursés';
  if (mission.status === 'funded' && !mission.provider) return 'Échéance dépassée — remboursement';
  return 'Échéance dépassée — action requise';
}

export function MissionCard({
  mission,
  showActions = false,
  onChanged,
}: {
  mission: Mission;
  showActions?: boolean;
  onChanged?: () => void;
}) {
  const { activeRole } = useAuth();
  const isProvider = activeRole === 'provider';
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  const meta = STATUS_META[mission.status] || { label: mission.status, bg: '#f3f4f6', fg: '#6b7280' };
  const category = mission.category?.name || mission.category_name;
  const candidates = mission.application_count ?? mission.applications_count ?? 0;
  const remaining = timeRemaining(mission.deadline);
  const deadline = formatDate(mission.deadline);

  // Contrepartie : le client pour le prestataire, le prestataire pour le client.
  const counterparty = isProvider ? mission.client : mission.provider;
  const counterpartyRole = isProvider ? 'Client' : 'Prestataire assigné';

  const showProgress = mission.status === 'in_progress';
  const progress = Math.max(0, Math.min(100, mission.progress ?? 0));
  const providerActions = showActions && isProvider;

  const goDetail = () => router.push(`/mission/${mission.id}`);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      Alert.alert('Succès', label);
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const updatePosition = async () => {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS', 'Permission de localisation refusée');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await sendLocation(mission.id, pos.coords.latitude, pos.coords.longitude);
      Alert.alert('OK', 'Position envoyée au client');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'GPS impossible');
    } finally {
      setGpsBusy(false);
    }
  };

  const confirmComplete = () =>
    Alert.alert('Marquer comme terminée', 'Soumettre la mission au client pour validation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          setBusy(true);
          try {
            await submitProof(mission.id);
            Alert.alert('Succès', 'Mission soumise au client');
            onChanged?.();
          } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Action impossible';
            if (/preuve/i.test(msg)) {
              Alert.alert('Preuves requises', 'Ajoutez au moins une preuve avant de soumettre.', [
                { text: 'Plus tard', style: 'cancel' },
                { text: 'Ajouter des preuves', onPress: goDetail },
              ]);
            } else {
              Alert.alert('Erreur', msg);
            }
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const handleDeposit = () => {
    const required = Number(mission.required_deposit) || 0;
    Alert.alert(
      'Déposer la caution',
      required
        ? `Une caution de ${formatXOF(required)} est requise pour démarrer cette mission. ` +
            'Elle est bloquée pendant la mission puis restituée à la fin.'
        : 'Déposez la caution pour pouvoir démarrer la mission.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déposer', onPress: () => run('Caution déposée', async () => {
          try {
            await payDepositSmart(mission.id);
          } catch (e) {
            if (e instanceof ApiError && e.status === 400) {
              Alert.alert(
                'Solde insuffisant',
                'Alimentez d\'abord votre caution via Mobile Money (écran Caution).',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Alimenter', onPress: () => router.push('/deposit') },
                ],
              );
              throw e;
            }
            throw e;
          }
        }) },
      ],
    );
  };

  const depositDeadline = formatTime(mission.deposit_deadline);

  return (
    <View style={[styles.card, shadow]}>
      <Pressable onPress={goDetail}>
        <View style={styles.topRow}>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.topRight}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
            </View>
            {remaining ? (
              <Text style={[styles.deadline, remaining.late && styles.deadlineLate]}>
                {remaining.late ? '⚠ ' : '⏰ '}{remaining.label}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{mission.title}</Text>
        <Text style={styles.budget}>{formatXOF(mission.budget)}</Text>

        {/* Contrepartie */}
        {mission.deposit_required && mission.required_deposit ? (
          <Text style={styles.depositHint}>
            Caution {formatXOF(mission.required_deposit)}
            {mission.deposit_paid ? ' · payée' : ' · requise'}
          </Text>
        ) : null}
        {(mission.requirement_labels || []).length > 0 ? (
          <View style={styles.reqRow}>
            {(mission.requirement_labels || []).slice(0, 3).map((label) => (
              <Text key={label} style={styles.reqChip}>{label}</Text>
            ))}
          </View>
        ) : null}

        {counterparty ? (
          <View style={styles.party}>
            <View style={styles.partyAvatar}>
              <Text style={styles.partyInitials}>
                {(counterparty.first_name?.[0] || '') + (counterparty.last_name?.[0] || '')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{counterparty.first_name} {counterparty.last_name}</Text>
              <Text style={styles.partyRole}>{counterpartyRole}</Text>
            </View>
            <Pressable style={styles.chatBtn} hitSlop={8} onPress={goDetail}>
              <Text style={styles.chatIcon}>💬</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Itinéraire */}
        {(mission.pickup_address || mission.delivery_address) && (
          <View style={styles.route}>
            {mission.pickup_address ? (
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={styles.routeText} numberOfLines={1}>{mission.pickup_address}</Text>
              </View>
            ) : null}
            {mission.pickup_address && mission.delivery_address ? <View style={styles.routeLine} /> : null}
            {mission.delivery_address ? (
              <View style={styles.routeRow}>
                <View style={[styles.dotFlag]}>
                  <Text style={styles.flag}>⚑</Text>
                </View>
                <Text style={styles.routeText} numberOfLines={1}>{mission.delivery_address}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Progression */}
        {showProgress ? (
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>Progression : {progress}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        ) : null}

        {/* Méta secondaire */}
        {!counterparty && (deadline || candidates > 0) ? (
          <View style={styles.metaRow}>
            {deadline ? <Text style={styles.metaText}>{deadline}</Text> : <View />}
            {candidates > 0 ? (
              <Text style={styles.metaText}>{candidates} candidat{candidates > 1 ? 's' : ''}</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {/* Client : échéance dépassée, décision requise */}
      {!isProvider && needsExpiryAttention(mission) ? (
        <Pressable style={styles.expiryStrip} onPress={goDetail}>
          <Text style={styles.expiryStripIcon}>⚠️</Text>
          <Text style={styles.expiryStripText}>{expiryStripMessage(mission)}</Text>
          <Text style={styles.expiryStripLink}>Voir →</Text>
        </Pressable>
      ) : null}

      {/* Caution requise après acceptation de la candidature */}
      {providerActions && mission.status === 'accepted' && !mission.deposit_paid ? (
        <View style={styles.depositAlert}>
          <Text style={styles.depositAlertIcon}>🕒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.depositAlertTitle}>Caution requise</Text>
            <Text style={styles.depositAlertText}>
              Déposez {mission.required_deposit ? formatXOF(mission.required_deposit) : 'la caution'}
              {depositDeadline ? ` avant ${depositDeadline}` : ''} pour démarrer.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.detailBtn} onPress={goDetail}>
          <Text style={styles.detailBtnText}>Détails</Text>
        </Pressable>

        {providerActions && mission.status === 'accepted' && !mission.deposit_paid ? (
          <Pressable style={[styles.actBtn, styles.warnBtn]} disabled={busy} onPress={handleDeposit}>
            <Text style={styles.actBtnText}>{busy ? '...' : 'Déposer la caution'}</Text>
          </Pressable>
        ) : null}

        {providerActions && mission.status === 'accepted' && mission.deposit_paid ? (
          <Pressable style={[styles.actBtn, styles.primaryBtn]} disabled={busy} onPress={() => run('Mission démarrée', () => startMission(mission.id))}>
            <Text style={styles.actBtnText}>Démarrer</Text>
          </Pressable>
        ) : null}

        {providerActions && mission.status === 'in_progress' ? (
          <Pressable style={[styles.actBtn, styles.ghostBtn]} disabled={gpsBusy} onPress={updatePosition}>
            <Text style={styles.ghostBtnText}>{gpsBusy ? '...' : 'Ma position'}</Text>
          </Pressable>
        ) : null}

        {providerActions && mission.status === 'in_progress' ? (
          <Pressable style={[styles.actBtn, styles.ghostBtn]} onPress={goDetail}>
            <Text style={styles.ghostBtnText}>Preuves</Text>
          </Pressable>
        ) : null}

        {providerActions && mission.status === 'in_progress' ? (
          <Pressable style={[styles.actBtn, styles.primaryBtn]} disabled={busy} onPress={confirmComplete}>
            <Text style={styles.actBtnText}>Terminer</Text>
          </Pressable>
        ) : null}

        {providerActions && mission.status === 'submitted' ? (
          <Pressable style={[styles.actBtn, styles.ghostBtn]} onPress={goDetail}>
            <Text style={styles.ghostBtnText}>Voir les preuves</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  topRight: { alignItems: 'flex-end', gap: 4 },
  categoryPill: { backgroundColor: colors.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  categoryText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  deadline: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  deadlineLate: { color: colors.danger },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  budget: { fontSize: 18, fontWeight: '800', color: colors.accent, marginBottom: spacing.sm },
  party: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  partyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  partyInitials: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  partyName: { fontSize: 14, fontWeight: '700', color: colors.text },
  partyRole: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  chatBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chatIcon: { fontSize: 16 },
  route: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotFlag: { width: 14, alignItems: 'center' },
  flag: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  routeText: { flex: 1, fontSize: 13, color: colors.text },
  routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 5, marginVertical: 2 },
  progressWrap: { marginBottom: spacing.sm },
  progressLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  detailBtn: { flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center', minWidth: 90 },
  detailBtnText: { fontWeight: '700', color: colors.text, fontSize: 13.5 },
  actBtn: { flexGrow: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', minWidth: 90 },
  primaryBtn: { backgroundColor: colors.primary },
  warnBtn: { backgroundColor: colors.warning },
  ghostBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  actBtnText: { fontWeight: '700', color: '#fff', fontSize: 13.5 },
  ghostBtnText: { fontWeight: '700', color: colors.primary, fontSize: 13.5 },
  depositAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  depositAlertIcon: { fontSize: 15 },
  depositAlertTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  depositAlertText: { fontSize: 12, color: '#92400e', marginTop: 2 },
  depositHint: { fontSize: 12, color: colors.warning, fontWeight: '600', marginBottom: spacing.xs },
  reqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  reqChip: { fontSize: 10, fontWeight: '700', color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  expiryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  expiryStripIcon: { fontSize: 14 },
  expiryStripText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400e' },
  expiryStripLink: { fontSize: 12, fontWeight: '800', color: colors.primary },
});
