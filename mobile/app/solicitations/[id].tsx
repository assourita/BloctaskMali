import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  acceptSolicitation,
  getSolicitationPreview,
  rejectSolicitation,
  type SolicitationPreview,
  type SolicitationWorkflow,
} from '../../src/api/solicitations';
import { createAssignment } from '../../src/api/enterprise';
import { payDepositSmart, startMission } from '../../src/api/missions';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { Badge, Card, Loader } from '../../src/components/ui';
import { PageHeader } from '../../src/components/widgets';
import { formatXOF } from '../../src/constants/africa';
import { colors, radius, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';

const STATUS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
  expired: 'Expirée',
};

function stepDone(workflow: SolicitationWorkflow, step: string): boolean {
  const order = workflow.is_enterprise
    ? ['accept', 'deposit', 'assign_employee', 'start', 'started']
    : ['accept', 'deposit', 'start', 'started'];
  const cur = order.indexOf(workflow.current_step);
  const idx = order.indexOf(step);
  return idx >= 0 && cur > idx;
}

export default function SolicitationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';
  const [preview, setPreview] = useState<SolicitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setPreview(await getSolicitationPreview(String(id)));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la sollicitation', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const accept = () => {
    if (!id) return;
    Alert.alert('Accepter', 'Accepter cette sollicitation ? Vous devrez ensuite déposer la caution pour démarrer.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Accepter',
        onPress: async () => {
          setActing(true);
          try {
            await acceptSolicitation(String(id));
            Alert.alert('Acceptée', 'Déposez maintenant la caution pour continuer.');
            setLoading(true);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const payDeposit = () => {
    const missionId = preview?.mission?.id;
    if (!missionId) return;
    const amount = preview?.workflow?.required_deposit;
    Alert.alert(
      'Déposer la caution',
      `Confirmer le dépôt de ${formatXOF(Number(amount || 0))} XOF ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déposer',
          onPress: async () => {
            setActing(true);
            try {
              const { toppedUp } = await payDepositSmart(missionId);
              const msg = toppedUp > 0
                ? `Caution déposée (${formatXOF(toppedUp)} XOF ajoutés au solde).`
                : 'Caution déposée.';
              Alert.alert('Succès', msg);
              setLoading(true);
              await load();
            } catch (e) {
              Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Dépôt impossible');
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  };

  const assignEmployee = async () => {
    const missionId = preview?.mission?.id;
    if (!missionId || !selectedEmployeeId) return;
    setActing(true);
    try {
      await createAssignment({ mission: missionId, employee: selectedEmployeeId });
      Alert.alert('Succès', 'Employé assigné — vous pouvez démarrer la mission.');
      setLoading(true);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Assignation impossible');
    } finally {
      setActing(false);
    }
  };

  const start = () => {
    const missionId = preview?.mission?.id;
    if (!missionId) return;
    Alert.alert('Démarrer', 'Confirmer le démarrage de la mission ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Démarrer',
        onPress: async () => {
          setActing(true);
          try {
            await startMission(missionId);
            Alert.alert('Succès', 'Mission démarrée.');
            setLoading(true);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Impossible de démarrer');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const reject = () => {
    if (!id) return;
    Alert.alert('Refuser', 'Refuser cette sollicitation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await rejectSolicitation(String(id));
            router.back();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const openMaps = (lat?: number | null, lng?: number | null) => {
    if (lat == null || lng == null) return;
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  if (loading || !preview) {
    return (
      <AppLayout>
        <PageHeader title="Détail sollicitation" />
        <Loader />
      </AppLayout>
    );
  }

  const { mission, client, solicitation, applications, other_solicitations: others, workflow } = preview;
  const req = (mission.requirements || {}) as Record<string, boolean>;
  const exec = mission.executing_employee as { first_name?: string; last_name?: string } | undefined;

  return (
    <AppLayout scroll={false}>
      <PageHeader
        title={mission.title}
        subtitle={STATUS[solicitation.status] || solicitation.status}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.budget}>
          {formatXOF(Number(mission.budget))} {mission.currency || 'XOF'}
        </Text>

        {solicitation.status === 'pending' ? (
          <Card>
            <Text style={styles.body}>
              Après acceptation : déposer la caution
              {workflow?.is_enterprise ? ', assigner un employé' : ''}, puis démarrer la mission.
            </Text>
          </Card>
        ) : null}

        {workflow ? (
          <Card>
            <Text style={styles.section}>Étapes pour démarrer</Text>
            <View style={styles.steps}>
              <StepRow
                label="1. Accepter la sollicitation"
                done={stepDone(workflow, 'accept')}
                active={workflow.current_step === 'accept'}
              />
              <StepRow
                label={`2. Déposer la caution (${formatXOF(workflow.required_deposit)} XOF)`}
                done={stepDone(workflow, 'deposit')}
                active={workflow.current_step === 'deposit'}
              />
              {workflow.is_enterprise ? (
                <StepRow
                  label="3. Assigner un employé"
                  done={stepDone(workflow, 'assign_employee')}
                  active={workflow.current_step === 'assign_employee'}
                />
              ) : null}
              <StepRow
                label={`${workflow.is_enterprise ? '4' : '3'}. Démarrer la mission`}
                done={workflow.current_step === 'started'}
                active={workflow.current_step === 'start'}
              />
            </View>
            {workflow.deposit_required && workflow.deposit_deadline ? (
              <Text style={styles.meta}>
                Caution avant le {new Date(workflow.deposit_deadline).toLocaleString('fr-FR')}
              </Text>
            ) : null}
            {workflow.deposit_balance != null ? (
              <Text style={styles.meta}>
                Solde caution : {formatXOF(workflow.deposit_balance)} XOF
              </Text>
            ) : null}
          </Card>
        ) : null}

        {solicitation.message ? (
          <Card>
            <Text style={styles.section}>Message du client</Text>
            <Text style={styles.quote}>« {solicitation.message} »</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.section}>Client</Text>
          <Text style={styles.clientName}>
            {client.first_name} {client.last_name}
          </Text>
          {client.city ? (
            <Text style={styles.meta}>{client.city}{client.country ? `, ${client.country}` : ''}</Text>
          ) : null}
          {client.identity_verified ? (
            <Badge label="Identité vérifiée" tone="success" />
          ) : null}
          {client.bio ? <Text style={styles.body}>{client.bio}</Text> : null}
        </Card>

        {mission.description ? (
          <Card>
            <Text style={styles.section}>Description</Text>
            <Text style={styles.body}>{mission.description}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.section}>Itinéraire</Text>
          {mission.pickup_address ? (
            <View style={styles.route}>
              <Text style={styles.routeLabel}>Retrait</Text>
              <Text style={styles.body}>{mission.pickup_address}</Text>
              {mission.pickup_latitude != null ? (
                <Pressable onPress={() => openMaps(mission.pickup_latitude, mission.pickup_longitude)}>
                  <Text style={styles.link}>Ouvrir dans Maps</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {mission.delivery_address ? (
            <View style={[styles.route, mission.pickup_address ? styles.routeGap : null]}>
              <Text style={styles.routeLabel}>Livraison</Text>
              <Text style={styles.body}>{mission.delivery_address}</Text>
              {mission.delivery_latitude != null ? (
                <Pressable onPress={() => openMaps(mission.delivery_latitude, mission.delivery_longitude)}>
                  <Text style={styles.link}>Ouvrir dans Maps</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card>

        {(req.requires_vehicle || req.requires_photo || mission.requires_gps_tracking) ? (
          <Card>
            <Text style={styles.section}>Exigences</Text>
            <View style={styles.chips}>
              {req.requires_vehicle ? <Badge label="Véhicule" tone="default" /> : null}
              {req.requires_photo ? <Badge label="Photo" tone="default" /> : null}
              {req.requires_signature ? <Badge label="Signature" tone="default" /> : null}
              {mission.requires_gps_tracking ? <Badge label="GPS" tone="default" /> : null}
            </View>
          </Card>
        ) : null}

        {applications.length > 0 ? (
          <Card>
            <Text style={styles.section}>Candidatures prestataires ({applications.length})</Text>
            {applications.map((app) => (
              <View key={app.id} style={styles.applicant}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>
                    {app.provider?.first_name} {app.provider?.last_name}
                  </Text>
                  {app.provider?.city ? <Text style={styles.meta}>{app.provider.city}</Text> : null}
                  {app.provider?.reputation_score != null ? (
                    <Text style={styles.meta}>
                      Réputation {Math.round(app.provider.reputation_score)}/100 ·{' '}
                      {app.provider.completed_missions || 0} mission(s)
                    </Text>
                  ) : null}
                  {app.message ? <Text style={styles.body}>{app.message}</Text> : null}
                </View>
                {app.provider?.id ? (
                  <Pressable onPress={() => router.push(`/provider/${app.provider!.id}`)}>
                    <Text style={styles.link}>Profil</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        {others.length > 0 ? (
          <Card>
            <Text style={styles.section}>Autres sollicitations</Text>
            {others.map((o) => (
              <Text key={o.id} style={styles.meta}>
                {o.target_type === 'enterprise'
                  ? o.enterprise_name || 'Entreprise'
                  : `${o.provider?.first_name || ''} ${o.provider?.last_name || ''}`.trim()}
                {' — '}{STATUS[o.status] || o.status}
              </Text>
            ))}
          </Card>
        ) : null}

        {solicitation.status === 'pending' ? (
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Refuser" onPress={reject} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Accepter" loading={acting} onPress={accept} />
            </View>
          </View>
        ) : null}

        {solicitation.status === 'accepted' && workflow ? (
          <Card>
            {workflow.current_step === 'deposit' ? (
              <>
                <Text style={styles.body}>
                  Déposez la caution pour confirmer votre engagement sur cette mission.
                </Text>
                <PrimaryButton
                  label={`Déposer ${formatXOF(workflow.required_deposit)} XOF`}
                  loading={acting}
                  onPress={payDeposit}
                />
              </>
            ) : null}

            {workflow.current_step === 'assign_employee' ? (
              <>
                <Text style={styles.body}>Choisissez l'employé qui réalisera la mission.</Text>
                {(preview.enterprise_employees || []).map((e) => {
                  const active = selectedEmployeeId === e.id;
                  return (
                    <Pressable
                      key={e.id}
                      style={[styles.empRow, active && styles.empRowActive]}
                      onPress={() => setSelectedEmployeeId(e.id)}
                    >
                      <Text style={styles.clientName}>{e.first_name} {e.last_name}</Text>
                      <Text style={styles.meta}>{e.position || 'Agent'}</Text>
                    </Pressable>
                  );
                })}
                <PrimaryButton
                  label="Assigner et continuer"
                  loading={acting}
                  disabled={!selectedEmployeeId}
                  onPress={assignEmployee}
                />
              </>
            ) : null}

            {workflow.current_step === 'start' ? (
              <>
                {isEnterprise && exec ? (
                  <Text style={styles.body}>
                    Employé assigné : {exec.first_name} {exec.last_name}
                  </Text>
                ) : null}
                <PrimaryButton label="Démarrer la mission" loading={acting} onPress={start} />
              </>
            ) : null}

            {workflow.current_step === 'started' ? (
              <>
                <Badge label="Mission démarrée" tone="success" />
                <View style={{ marginTop: spacing.sm }}>
                  <PrimaryButton
                    label="Voir la mission"
                    onPress={() => router.push(
                      isEnterprise ? '/missions' : { pathname: '/mission/[id]', params: { id: mission.id } },
                    )}
                  />
                </View>
              </>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </AppLayout>
  );
}

function StepRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <View style={[styles.stepRow, done && styles.stepDone, active && styles.stepActive]}>
      <Text style={styles.stepIcon}>{done ? '✓' : '○'}</Text>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
  budget: { fontSize: 22, fontWeight: '800', color: colors.accent, marginBottom: spacing.sm },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  quote: { fontStyle: 'italic', color: colors.text, lineHeight: 22 },
  clientName: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  body: { color: colors.text, lineHeight: 21, marginTop: 6, marginBottom: spacing.sm },
  route: {},
  routeGap: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  routeLabel: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 6, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  applicant: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  steps: { gap: spacing.xs, marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  stepDone: { opacity: 1 },
  stepActive: {},
  stepIcon: { width: 20, color: colors.textMuted, fontWeight: '700' },
  stepLabel: { color: colors.textMuted, fontSize: 14, flex: 1 },
  stepLabelActive: { color: colors.text, fontWeight: '700' },
  empRow: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  empRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
