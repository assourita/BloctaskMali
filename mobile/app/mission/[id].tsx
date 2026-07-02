import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import {
  applyToMission,
  cancelMission,
  expireMissionDecision,
  getMission,
  startMission,
  submitProof,
  validateMission,
} from '../../src/api/missions';
import { createAssignment } from '../../src/api/enterprise';
import { AssignEmployeeModal } from '../../src/components/AssignEmployeeModal';
import { confirmPayment } from '../../src/api/payments';
import { sendLocation } from '../../src/api/tracking';
import { ProofSection } from '../../src/components/ProofSection';
import { MissionChat } from '../../src/components/MissionChat';
import { PrimaryButton, SecondaryButton, Input } from '../../src/components/buttons';
import { DateField, TimeField } from '../../src/components/datetime';
import { Card } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { ProgressStepper } from '../../src/components/widgets';
import { formatXOF } from '../../src/constants/africa';
import { colors, radius, spacing, STATUS_META } from '../../src/constants/theme';
import type { Mission } from '../../src/types';
import { applyBlockMessage, missionApplicationsOpen } from '../../src/utils/missionApply';
import { ApiError } from '../../src/api/client';

// Étapes côté prestataire (alignées sur le web) : pas d'étape "Paiement".
const PROVIDER_STEPS = ['Publiée', 'Acceptée', 'En cours', 'Preuves', 'Terminée'];
const CLIENT_STEPS = ['Paiement', 'Publiée', 'Acceptée', 'En cours', 'Validation', 'Terminée'];

function providerStep(status: string): number {
  switch (status) {
    case 'funded':
    case 'published':
      return 0;
    case 'accepted':
      return 1;
    case 'in_progress':
      return 2;
    case 'submitted':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
}

function clientStep(status: string): number {
  switch (status) {
    case 'draft':
    case 'pending':
      return 0;
    case 'funded':
    case 'published':
      return 1;
    case 'accepted':
      return 2;
    case 'in_progress':
      return 3;
    case 'submitted':
      return 4;
    case 'completed':
      return 5;
    default:
      return 1;
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function defaultExtendDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toIsoDeadline(date: string, time: string): string {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return '';
  const dt = new Date(
    Number(dm[1]),
    Number(dm[2]) - 1,
    Number(dm[3]),
    Number(tm[1]),
    Number(tm[2]),
    0,
  );
  return dt.toISOString();
}

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, activeRole } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [gpsSending, setGpsSending] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [otp, setOtp] = useState('1234');
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extendDate, setExtendDate] = useState(defaultExtendDate);
  const [extendTime, setExtendTime] = useState('18:00');

  const load = useCallback(async (fresh = false) => {
    if (!id) return;
    try {
      setMission(await getMission(id, fresh));
    } catch {
      Alert.alert('Erreur', 'Mission introuvable');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void load(true);
    }, [id, load]),
  );

  // Partage GPS automatique si consentement donné à la caution
  useEffect(() => {
    if (!mission || activeRole !== 'provider' || mission.status !== 'in_progress') return;
    if (!mission.provider_gps_consent_at) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled || !id) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await sendLocation(id, pos.coords.latitude, pos.coords.longitude);
      } catch {
        /* silencieux */
      }
    };

    tick();
    const interval = setInterval(tick, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mission?.id, mission?.status, mission?.provider_gps_consent_at, activeRole, id]);

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setActing(true);
    try {
      await fn();
      Alert.alert('Succès', label);
      await load(true);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setActing(false);
    }
  };

  const goToDeposit = () => {
    if (!mission) return;
    router.push(`/mission/deposit/${mission.id}`);
  };

  const continueAfterExpiry = async () => {
    if (!mission) return;
    const iso = toIsoDeadline(extendDate, extendTime);
    if (!iso) {
      Alert.alert('Date invalide', 'Choisissez une date et une heure valides.');
      return;
    }
    setActing(true);
    try {
      const updated = await expireMissionDecision(mission.id, 'continue', { new_deadline: iso });
      setMission(updated);
      setShowExtendForm(false);
      Alert.alert('Succès', 'Mission prolongée');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Prolongation impossible');
    } finally {
      setActing(false);
    }
  };

  const cancelAfterExpiry = () => {
    if (!mission) return;
    Alert.alert(
      'Annuler la mission',
      'Vos fonds seront remboursés et la caution du prestataire restituée.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la mission',
          style: 'destructive',
          onPress: () =>
            runAction('Mission annulée — remboursement effectué', () =>
              expireMissionDecision(mission.id, 'cancel'),
            ),
        },
      ],
    );
  };

  const confirmMissionPayment = async () => {
    if (!mission?.payment_id) return;
    if (!otp.trim()) {
      Alert.alert('Code requis', 'Saisissez le code de confirmation (test : 1234).');
      return;
    }
    setActing(true);
    try {
      await confirmPayment(mission.payment_id, otp.trim());
      Alert.alert('Mission financée', 'Les fonds sont bloqués en escrow. La mission est publiée et visible par les prestataires.');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Paiement impossible');
    } finally {
      setActing(false);
    }
  };

  const shareGps = async () => {
    if (!mission) return;
    setGpsSending(true);
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
      setGpsSending(false);
    }
  };

  const openRating = () => {
    if (!mission) return;
    const isClient = activeRole === 'client';
    const ratedUser = isClient ? mission.provider : mission.client;
    router.push({
      pathname: '/rate',
      params: {
        missionId: mission.id,
        ratedUserId: ratedUser?.id,
        ratedUserName: ratedUser ? `${ratedUser.first_name} ${ratedUser.last_name}` : '',
        ratedUserType: isClient ? 'provider' : 'client',
        missionTitle: mission.title,
      },
    });
  };

  if (loading || !mission) {
    return (
      <AppLayout title="Mission" showBack>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </AppLayout>
    );
  }

  const isProvider = activeRole === 'provider';
  const isEnterprise = activeRole === 'enterprise';
  const isEnterpriseOrdered = isEnterprise && mission.client?.id === user?.id;
  const isEnterpriseReceived = isEnterprise && !!mission.assigned_enterprise_id && mission.client?.id !== user?.id;
  const isClient = activeRole === 'client' || isEnterpriseOrdered;
  const showProofs =
    ['in_progress', 'submitted', 'completed', 'provider_done'].includes(mission.status) ||
    (isClient && !!mission.provider);
  const showChat =
    !!mission.provider &&
    ['in_progress', 'submitted', 'disputed', 'completed'].includes(mission.status);
  const canTrack = ['accepted', 'in_progress', 'submitted'].includes(mission.status) && !!mission.provider;
  const canDispute = ['in_progress', 'submitted', 'completed'].includes(mission.status);
  const canRate = mission.status === 'completed';
  const deadlinePassed =
    !!mission.deadline &&
    new Date(mission.deadline).getTime() < Date.now() &&
    !['completed', 'cancelled', 'expired'].includes(mission.status);
  const showExpiryDecision =
    isClient &&
    mission.status === 'accepted' &&
    !!mission.provider &&
    (!!mission.expiry_decision_pending || deadlinePassed);
  const fundedOverdueNoProvider =
    isClient && mission.status === 'funded' && !mission.provider && deadlinePassed;
  const isExpired = mission.status === 'expired';

  const isOpenForApplications = missionApplicationsOpen(mission);
  const isEnterpriseApplicant = isEnterprise && !isEnterpriseOrdered;
  const showProviderApply = isProvider && isOpenForApplications && !mission.is_applied;
  const showEnterpriseApply = isEnterpriseApplicant && isOpenForApplications && !mission.is_applied;
  const showApplicationPending =
    (isProvider || isEnterpriseApplicant) && isOpenForApplications && !!mission.is_applied;

  const category = mission.category?.name || mission.category_name;
  const statusMeta = STATUS_META[mission.status] || { label: mission.status, bg: '#f3f4f6', fg: '#6b7280' };
  const deposit = mission.required_deposit ?? mission.deposit_amount;
  const duration = mission.expected_duration ?? mission.estimated_duration;
  const escrowFunded = ['funded', 'accepted', 'in_progress', 'submitted', 'completed'].includes(mission.status);
  const escrowLabel =
    mission.status === 'completed'
      ? 'Libéré'
      : escrowFunded
        ? 'Fonds bloqués'
        : 'En attente de financement';

  const pendingApplications =
    mission.pending_applications_count ??
    mission.applications_count ??
    mission.application_count ??
    0;

  return (
    <AppLayout title="Mission" showBack>
        {/* En-tête mission */}
        <View style={styles.hero}>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{mission.title}</Text>
          {mission.description ? <Text style={styles.desc}>{mission.description}</Text> : null}
        </View>

        {mission.requirement_labels && mission.requirement_labels.length > 0 ? (
          <View style={styles.reqRow}>
            {mission.requirement_labels.map((label) => (
              <Text key={label} style={styles.reqChip}>{label}</Text>
            ))}
          </View>
        ) : null}

        {/* Métriques */}
        <View style={styles.metrics}>
          <View style={[styles.metricBox, styles.metricHighlight]}>
            <Text style={styles.metricLabel}>Rémunération</Text>
            <Text style={styles.metricValue}>{formatXOF(mission.budget)}</Text>
          </View>
          {mission.deadline ? (
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Échéance</Text>
              <Text style={[styles.metricValue, { fontSize: 14 }]}>
                {new Date(mission.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              {deadlinePassed ? <Text style={styles.metricSub}>Échéance dépassée</Text> : null}
            </View>
          ) : null}
          {duration ? (
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Durée estimée</Text>
              <Text style={[styles.metricValue, { fontSize: 14 }]}>{duration} min</Text>
            </View>
          ) : null}
          {deposit && (isProvider || isEnterpriseReceived) ? (
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>
                {isEnterpriseReceived ? 'Caution entreprise' : 'Caution prestataire'}
              </Text>
              <Text style={styles.metricValue}>{formatXOF(deposit)}</Text>
            </View>
          ) : null}
        </View>

        {/* Statut + stepper */}
        <Card>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ProgressStepper
              steps={isProvider || isEnterpriseReceived ? PROVIDER_STEPS : CLIENT_STEPS}
              current={isProvider || isEnterpriseReceived ? providerStep(mission.status) : clientStep(mission.status)}
            />
          </View>
        </Card>

        {/* Client — visible pour postuler (prestataire / entreprise) */}
        {mission.client && (isProvider || isEnterpriseApplicant) && !mission.can_view_counterparty ? (
          <Card style={styles.clientCard}>
            <Text style={styles.section}>Client donneur d'ordre</Text>
            <View style={styles.clientRow}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientInitials}>
                  {(mission.client.first_name?.[0] || '') + (mission.client.last_name?.[0] || '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>
                  {mission.client.first_name} {mission.client.last_name}
                </Text>
                {mission.client.city ? (
                  <Text style={styles.clientPhone}>{mission.client.city}</Text>
                ) : null}
                <Text style={styles.clientLock}>
                  Coordonnées complètes visibles au démarrage de la mission.
                </Text>
              </View>
            </View>
            {mission.client.id ? (
              <SecondaryButton
                label="Voir le profil client"
                onPress={() => router.push(`/client/${mission.client!.id}`)}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Candidature — visible en haut pour le prestataire / entreprise */}
        {showApplicationPending ? (
          <View style={styles.appliedBox}>
            <Text style={styles.appliedTitle}>Candidature envoyée</Text>
            <Text style={styles.appliedText}>
              Votre candidature est en attente de réponse du client.
            </Text>
          </View>
        ) : null}

        {(showProviderApply || showEnterpriseApply) ? (
          <Card style={styles.applyCard}>
            <Text style={styles.applyTitle}>Postuler à cette mission</Text>
            <Text style={styles.applyHint}>
              {showEnterpriseApply
                ? 'Proposez votre entreprise pour réaliser cette mission.'
                : 'Envoyez votre candidature. Plusieurs prestataires peuvent postuler tant que la mission n\'est pas assignée.'}
            </Text>
            {isOpenForApplications && pendingApplications > 0 && !mission.is_applied ? (
              <Text style={styles.applyMultiHint}>
                {pendingApplications} candidature{pendingApplications > 1 ? 's' : ''} déjà reçue
                {pendingApplications > 1 ? 's' : ''} — vous pouvez aussi postuler.
              </Text>
            ) : null}
            {mission.can_apply === false ? (
              <Text style={styles.applyBlocked}>
                {applyBlockMessage(mission.apply_block_reason)}
              </Text>
            ) : null}
            <PrimaryButton
              label={showEnterpriseApply ? "Postuler pour l'entreprise" : 'Postuler'}
              loading={acting}
              disabled={mission.can_apply === false}
              onPress={() =>
                runAction('Candidature envoyée', () =>
                  applyToMission(mission.id, 'Via app mobile'),
                )
              }
            />
          </Card>
        ) : null}

        {/* Sécurisation (escrow + blockchain) */}
        <Card>
          <Text style={styles.section}>Sécurisation</Text>
          <View style={styles.secRow}>
            <Text style={styles.secLabel}>Escrow</Text>
            <Text style={[styles.secValue, escrowFunded ? styles.secOk : null]}>{escrowLabel}</Text>
          </View>
          {mission.blockchain_status ? (
            <View style={styles.secRow}>
              <Text style={styles.secLabel}>Blockchain</Text>
              <Text style={styles.secValue}>{mission.blockchain_status}</Text>
            </View>
          ) : null}
          {mission.escrow_tx_hash ? (
            <View style={styles.secRow}>
              <Text style={styles.secLabel}>Transaction</Text>
              <Text style={styles.secHash} numberOfLines={1}>{mission.escrow_tx_hash}</Text>
            </View>
          ) : null}
        </Card>

        {/* En attente / candidatures (client, mission financée non attribuée) */}
        {isClient && !mission.provider && mission.status === 'funded' ? (
          <View style={styles.waitBox}>
            <Text style={styles.waitTitle}>
              {pendingApplications > 0
                ? `${pendingApplications} prestataire${pendingApplications > 1 ? 's' : ''} en candidature`
                : 'En attente de prestataire'}
            </Text>
            <Text style={styles.waitText}>
              {pendingApplications > 0
                ? 'Consultez les profils et acceptez la candidature qui vous convient, ou sollicitez d\'autres prestataires.'
                : 'Consultez les candidatures ou sollicitez directement un prestataire / une entreprise.'}
            </Text>
            {pendingApplications > 0 ? (
              <PrimaryButton
                label={`Voir les ${pendingApplications} candidature${pendingApplications > 1 ? 's' : ''}`}
                onPress={() => router.push({ pathname: '/applications', params: { missionId: mission.id } })}
              />
            ) : null}
            <View style={styles.waitActions}>
              <PrimaryButton
                label="Attribuer la mission"
                onPress={() => router.push({ pathname: '/providers', params: { missionId: mission.id } })}
              />
            </View>
          </View>
        ) : null}

        {/* Itinéraire */}
        {(mission.pickup_address || mission.delivery_address) && (
          <Card>
            <Text style={styles.section}>Itinéraire</Text>
            {mission.pickup_address ? (
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Point de retrait</Text>
                  <Text style={styles.routeAddr}>{mission.pickup_address}</Text>
                </View>
              </View>
            ) : null}
            {mission.delivery_address ? (
              <View style={[styles.routeRow, { marginTop: mission.pickup_address ? spacing.sm : 0 }]}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Point de livraison</Text>
                  <Text style={styles.routeAddr}>{mission.delivery_address}</Text>
                </View>
              </View>
            ) : null}
          </Card>
        )}

        {mission.executing_employee && isEnterpriseReceived ? (
          <Card>
            <Text style={styles.section}>Agent assigné</Text>
            <Text style={styles.providerName}>
              {mission.executing_employee.first_name} {mission.executing_employee.last_name}
            </Text>
            {mission.executing_employee.email ? (
              <Text style={styles.clientPhone}>{mission.executing_employee.email}</Text>
            ) : null}
          </Card>
        ) : null}

        {mission.counterparty && mission.can_view_counterparty ? (
          <Card>
            <Text style={styles.section}>{isClient ? 'Prestataire' : 'Client'} — mission en cours</Text>
            <Text style={styles.providerName}>
              {mission.counterparty.first_name} {mission.counterparty.last_name}
            </Text>
            {mission.counterparty.phone_number ? (
              <Text style={styles.clientPhone}>{mission.counterparty.phone_number}</Text>
            ) : null}
            {mission.counterparty.email ? (
              <Text style={styles.clientPhone}>{mission.counterparty.email}</Text>
            ) : null}
            {mission.counterparty.city ? (
              <Text style={styles.clientPhone}>{mission.counterparty.city}</Text>
            ) : null}
            {mission.counterparty.reputation_score != null ? (
              <Text style={styles.clientPhone}>
                Réputation {Math.round(mission.counterparty.reputation_score)}/100
              </Text>
            ) : null}
            {mission.counterparty.bio ? (
              <Text style={styles.desc}>{mission.counterparty.bio}</Text>
            ) : null}
          </Card>
        ) : null}

        {mission.provider && isClient && !mission.can_view_counterparty ? (
          <Card>
            <Text style={styles.section}>Prestataire assigné</Text>
            <Text style={styles.providerName}>
              {mission.provider.first_name} {mission.provider.last_name}
            </Text>
            {mission.provider.id ? (
              <SecondaryButton
                label="Voir le profil"
                onPress={() => router.push(`/provider/${mission.provider!.id}`)}
              />
            ) : null}
          </Card>
        ) : null}

        {showProofs && id ? (
          <ProofSection
            missionId={id}
            canUpload={isProvider && ['in_progress', 'provider_done', 'submitted'].includes(mission.status)}
          />
        ) : null}

        {showChat && id ? (
          <Card>
            <Text style={styles.section}>Messagerie mission</Text>
            <MissionChat missionId={id} currentUserId={user?.id} />
          </Card>
        ) : null}

        {fundedOverdueNoProvider ? (
          <Card style={styles.expiryAlertInfo}>
            <Text style={styles.expiryAlertTitle}>ℹ️ Échéance dépassée</Text>
            <Text style={styles.expiryAlertText}>
              Aucun prestataire n'a été assigné à temps. Vos fonds bloqués en escrow vous seront
              remboursés automatiquement.
            </Text>
          </Card>
        ) : null}

        {isClient && isExpired ? (
          <Card style={styles.expiredInfo}>
            <Text style={styles.expiryAlertTitle}>✓ Mission expirée</Text>
            <Text style={styles.expiryAlertText}>
              Cette mission a expiré sans prestataire. Vos fonds ont été remboursés.
            </Text>
          </Card>
        ) : null}

        {showExpiryDecision ? (
          <Card style={styles.expiryAlert}>
            <Text style={styles.expiryAlertTitle}>⏰ Échéance dépassée</Text>
            <Text style={styles.expiryAlertText}>
              Prolongez la mission ou annulez pour récupérer vos fonds. La caution du prestataire sera
              restituée en cas d'annulation.
            </Text>
            {mission.expiry_decision_due_at ? (
              <Text style={styles.expiryDue}>
                Décision avant le{' '}
                {new Date(mission.expiry_decision_due_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}

            {showExtendForm ? (
              <>
                <Text style={styles.extendLabel}>Nouvelle échéance</Text>
                <DateField
                  value={extendDate}
                  onChange={setExtendDate}
                  minimumDate={new Date()}
                  placeholder="Choisir la date"
                />
                <TimeField value={extendTime} onChange={setExtendTime} placeholder="Choisir l'heure" />
                <PrimaryButton
                  label="Confirmer la prolongation"
                  loading={acting}
                  onPress={continueAfterExpiry}
                />
                <SecondaryButton label="Retour" onPress={() => setShowExtendForm(false)} />
              </>
            ) : (
              <>
                <PrimaryButton
                  label="Prolonger la mission"
                  onPress={() => {
                    setExtendDate(defaultExtendDate());
                    setShowExtendForm(true);
                  }}
                />
                <SecondaryButton label="Annuler et rembourser" onPress={cancelAfterExpiry} />
              </>
            )}
          </Card>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
        {/* Financement requis : mission créée mais pas encore payée */}
        {isClient && mission.status === 'pending' && mission.payment_id && (
          <Card>
            <Text style={styles.section}>Paiement Mobile Money requis</Text>
            <Text style={styles.payHint}>
              Financez la mission pour la publier et la rendre visible aux prestataires.
            </Text>
            <Input
              placeholder="Code de confirmation (test : 1234)"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
            <PrimaryButton
              label="Confirmer le paiement"
              loading={acting}
              onPress={confirmMissionPayment}
            />
          </Card>
        )}

        {isClient && !mission.provider && mission.status === 'funded' && (
          <>
            <PrimaryButton
              label={
                pendingApplications > 0
                  ? `Voir les ${pendingApplications} candidature${pendingApplications > 1 ? 's' : ''}`
                  : 'Voir les candidatures'
              }
              onPress={() => router.push({ pathname: '/applications', params: { missionId: mission.id } })}
            />
            <SecondaryButton
              label="Solliciter un prestataire"
              onPress={() => router.push({ pathname: '/providers', params: { missionId: mission.id } })}
            />
            <SecondaryButton
              label="Sollicitations envoyées"
              onPress={() => router.push('/solicitations')}
            />
          </>
        )}

        {isClient && mission.status === 'submitted' && (
          <PrimaryButton
            label="Valider et libérer le paiement"
            loading={acting}
            onPress={() => runAction('Mission validée — paiement libéré', () => validateMission(mission.id))}
          />
        )}

        {isClient && canRate && (
          <PrimaryButton label="Noter le prestataire" onPress={openRating} />
        )}

        {isClient &&
          !mission.expiry_decision_pending &&
          ['draft', 'pending', 'funded', 'accepted'].includes(mission.status) && (
          <SecondaryButton
            label="Annuler la mission"
            onPress={() =>
              Alert.alert('Confirmation', 'Annuler cette mission ?', [
                { text: 'Non', style: 'cancel' },
                {
                  text: 'Oui',
                  style: 'destructive',
                  onPress: () => runAction('Mission annulée', () => cancelMission(mission.id)),
                },
              ])
            }
          />
        )}

        {/* Provider / entreprise — postuler aussi en bas si la page est longue */}
        {showProviderApply && (
          <PrimaryButton
            label="Postuler"
            loading={acting}
            disabled={mission.can_apply === false}
            onPress={() => runAction('Candidature envoyée', () => applyToMission(mission.id, 'Via app mobile'))}
          />
        )}

        {showEnterpriseApply && !isEnterpriseReceived && (
          <PrimaryButton
            label="Postuler pour l'entreprise"
            loading={acting}
            disabled={mission.can_apply === false}
            onPress={() => runAction('Candidature envoyée', () => applyToMission(mission.id, 'Via app mobile'))}
          />
        )}

        {showApplicationPending && (
          <Card style={styles.appliedBoxInline}>
            <Text style={styles.appliedTitle}>Candidature en attente</Text>
            <Text style={styles.appliedText}>Le client examinera votre profil.</Text>
          </Card>
        )}

        {isEnterpriseReceived && mission.status === 'accepted' && !mission.deposit_paid && (
          <Card style={styles.depositAlert}>
            <Text style={styles.depositAlertTitle}>🕒 Caution entreprise requise</Text>
            <Text style={styles.depositAlertText}>
              Déposez la caution depuis le solde entreprise avant d'assigner un employé.
            </Text>
            <PrimaryButton
              label={`Déposer la caution${mission.required_deposit ? ` (${formatXOF(mission.required_deposit)})` : ''}`}
              loading={acting}
              onPress={goToDeposit}
            />
            <SecondaryButton label="Alimenter le solde" onPress={() => router.push('/deposit')} />
          </Card>
        )}

        {isEnterpriseReceived && mission.status === 'accepted' && mission.deposit_paid && !mission.executing_employee && (
          <PrimaryButton
            label="Assigner un employé"
            onPress={() => setShowAssignModal(true)}
          />
        )}

        {isProvider && mission.status === 'accepted' && !mission.deposit_paid && (
          <Card style={styles.depositAlert}>
            <Text style={styles.depositAlertTitle}>🕒 Caution requise</Text>
            <Text style={styles.depositAlertText}>
              Votre candidature a été acceptée. Déposez{' '}
              {mission.required_deposit ? formatXOF(mission.required_deposit) : 'la caution'}
              {mission.deposit_policy?.deposit_reason ? `. ${mission.deposit_policy.deposit_reason}` : ''}
              {mission.deposit_deadline
                ? ` avant ${new Date(mission.deposit_deadline).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}{' '}
              pour démarrer la mission.
            </Text>
            <PrimaryButton
              label="Déposer la caution et démarrer"
              loading={acting}
              onPress={goToDeposit}
            />
          </Card>
        )}

        {isProvider && mission.status === 'accepted' && mission.deposit_paid && (
          <PrimaryButton
            label="Démarrer la mission"
            loading={acting}
            onPress={() => runAction('Mission démarrée', () => startMission(mission.id))}
          />
        )}

        {isProvider && mission.status === 'in_progress' && (
          <>
            <PrimaryButton label="Partager ma position GPS" loading={gpsSending} onPress={shareGps} />
            <PrimaryButton
              label="Finaliser et soumettre les preuves"
              loading={acting}
              onPress={() => runAction('Preuves soumises au client', () => submitProof(mission.id))}
            />
          </>
        )}

        {isProvider && canRate && (
          <PrimaryButton label="Noter le client" onPress={openRating} />
        )}

        {/* Shared actions */}
        {canTrack && (
          <SecondaryButton
            label="Suivi GPS en direct"
            onPress={() => router.push(`/tracking/${mission.id}`)}
          />
        )}

        {canDispute && (
          <SecondaryButton
            label="Ouvrir un litige"
            onPress={() =>
              router.push({
                pathname: '/disputes/new',
                params: { missionId: mission.id, missionTitle: mission.title },
              })
            }
          />
        )}

        {isClient && mission.payment_id && mission.payment_status === 'pending' && (
          <SecondaryButton label="Voir les paiements" onPress={() => router.push('/payments')} />
        )}
        </View>

        <AssignEmployeeModal
          visible={showAssignModal}
          missionId={mission.id}
          missionTitle={mission.title}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => load()}
          onAssign={async (employeeId) => {
            await createAssignment({ mission: mission.id, employee: employeeId });
          }}
        />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  categoryText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  desc: { marginTop: spacing.sm, color: colors.textMuted, lineHeight: 21, fontSize: 14 },
  reqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  reqChip: { fontSize: 10, fontWeight: '700', color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metricBox: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHighlight: { borderColor: colors.accent },
  metricLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  metricValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  metricSub: { fontSize: 10.5, color: colors.danger, fontWeight: '700', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  section: { fontWeight: '700', marginBottom: spacing.sm, color: colors.text, fontSize: 15 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  routeAddr: { fontSize: 14, color: colors.text, marginTop: 2 },
  providerName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  secLabel: { color: colors.textMuted, fontSize: 14 },
  secValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  secOk: { color: colors.success },
  secHash: { color: colors.textMuted, fontSize: 11, flex: 1, textAlign: 'right', marginLeft: spacing.md },
  waitBox: { backgroundColor: colors.warningLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#f59e0b' },
  waitTitle: { fontWeight: '800', color: '#92400e', fontSize: 15, marginBottom: 4 },
  clientCard: { marginBottom: spacing.md },
  clientLock: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  applyCard: {
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4',
  },
  applyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  applyHint: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.md },
  applyMultiHint: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  applyBlocked: { fontSize: 12, color: colors.danger, fontWeight: '600', marginBottom: spacing.sm },
  appliedBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  appliedBoxInline: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    marginBottom: spacing.sm,
  },
  appliedTitle: { fontWeight: '800', color: '#047857', fontSize: 15, marginBottom: 4 },
  appliedText: { fontSize: 13, color: '#065f46', lineHeight: 18 },
  waitText: { color: '#92400e', fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  waitActions: { gap: spacing.sm, marginTop: spacing.xs },
  payHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clientAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  clientInitials: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  clientPhone: { fontSize: 13, color: colors.textMuted },
  actions: { marginTop: spacing.sm },
  depositAlert: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: '#f59e0b' },
  depositAlertTitle: { fontWeight: '800', color: '#92400e', fontSize: 15, marginBottom: 4 },
  depositAlertText: { color: '#92400e', fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  expiryAlert: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: '#f59e0b', marginBottom: spacing.md },
  expiryAlertTitle: { fontWeight: '800', color: '#92400e', fontSize: 15, marginBottom: 4 },
  expiryAlertText: { color: '#92400e', fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  expiryDue: { color: '#92400e', fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  extendLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  expiryAlertInfo: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6', marginBottom: spacing.md },
  expiredInfo: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#059669', marginBottom: spacing.md },
});
