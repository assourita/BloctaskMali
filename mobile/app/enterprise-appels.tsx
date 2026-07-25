import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  createRecruitmentCall,
  listEnterpriseRecruitmentCalls,
  listRecruitmentApplications,
  reviewRecruitmentApplication,
  updateRecruitmentCall,
  type RecruitmentApplication,
  type RecruitmentCall,
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, TabBar } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useEnterpriseGuard } from '../src/hooks/useEnterpriseGuard';
import { ApiError } from '../src/api/client';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'RH',
  accountant: 'Comptable',
};

const FILTERS = [
  { id: 'open', label: 'Ouverts' },
  { id: 'closed', label: 'Clôturés' },
  { id: 'cancelled', label: 'Annulés' },
  { id: 'all', label: 'Tout' },
];

function personName(first?: string | null, last?: string | null): string {
  return [first, last]
    .map((p) => (p || '').replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim() || 'Candidat';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Ouvert',
    closed: 'Clôturé',
    cancelled: 'Annulé',
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    withdrawn: 'Retirée',
  };
  return map[status] || status;
}

function badgeTone(status: string): { bg: string; fg: string } {
  if (status === 'open' || status === 'pending') return { bg: '#FEF3C7', fg: '#92400E' };
  if (status === 'closed' || status === 'accepted') return { bg: colors.successLight, fg: '#065f46' };
  if (status === 'cancelled' || status === 'rejected') return { bg: colors.dangerLight, fg: '#991b1b' };
  return { bg: colors.surfaceAlt, fg: colors.textMuted };
}

export default function EnterpriseAppelsScreen() {
  const { redirect: guardRedirect } = useEnterpriseGuard();
  const [status, setStatus] = useState('open');
  const [calls, setCalls] = useState<RecruitmentCall[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apps, setApps] = useState<RecruitmentApplication[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    position: 'Agent terrain',
    role: 'agent',
    city: '',
    requirements: '',
  });

  const load = useCallback(async () => {
    const list = await listEnterpriseRecruitmentCalls(status).catch(() => [] as RecruitmentCall[]);
    setCalls(list);
  }, [status]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const create = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Titre et description sont obligatoires.');
      return;
    }
    setCreating(true);
    try {
      await createRecruitmentCall({ ...form, days_valid: 30 });
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        position: 'Agent terrain',
        role: 'agent',
        city: '',
        requirements: '',
      });
      setStatus('open');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Publication impossible');
    } finally {
      setCreating(false);
    }
  };

  const toggleApps = async (call: RecruitmentCall) => {
    if (expandedId === call.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(call.id);
    try {
      setApps(await listRecruitmentApplications(call.id));
    } catch {
      setApps([]);
    }
  };

  const setCallStatus = (call: RecruitmentCall, next: 'closed' | 'cancelled') => {
    Alert.alert(
      next === 'closed' ? 'Clôturer' : 'Annuler',
      `${next === 'closed' ? 'Clôturer' : 'Annuler'} « ${call.title} » ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            setBusyId(call.id);
            try {
              await updateRecruitmentCall(call.id, { status: next });
              await load();
            } catch (e) {
              Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const review = (app: RecruitmentApplication, action: 'accept' | 'reject') => {
    const name = personName(app.provider?.first_name, app.provider?.last_name);
    Alert.alert(
      action === 'accept' ? 'Accepter' : 'Refuser',
      action === 'accept' ? `Accepter ${name} dans l'entreprise ?` : `Refuser ${name} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(app.id);
            try {
              await reviewRecruitmentApplication(app.id, action);
              if (expandedId) {
                setApps(await listRecruitmentApplications(expandedId).catch(() => []));
              }
              await load();
            } catch (e) {
              Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  if (guardRedirect) return null;

  return (
    <AppLayout title="Appels à candidature" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Appels ouverts"
        subtitle="Tous les prestataires peuvent postuler — distinct des invitations ciblées"
      />

      <Pressable onPress={() => router.push('/enterprise-invitations')} style={styles.linkWrap}>
        <Text style={styles.link}>Voir les invitations ciblées →</Text>
      </Pressable>

      <PrimaryButton
        label={showForm ? 'Masquer le formulaire' : 'Nouvel appel'}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <SoftCard style={styles.form}>
          <Text style={styles.formTitle}>Publier un appel</Text>
          <TextInput
            style={styles.input}
            placeholder="Titre *"
            value={form.title}
            onChangeText={(title) => setForm((f) => ({ ...f, title }))}
          />
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Description *"
            multiline
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Poste"
            value={form.position}
            onChangeText={(position) => setForm((f) => ({ ...f, position }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Ville"
            value={form.city}
            onChangeText={(city) => setForm((f) => ({ ...f, city }))}
          />
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Prérequis (optionnel)"
            multiline
            value={form.requirements}
            onChangeText={(requirements) => setForm((f) => ({ ...f, requirements }))}
          />
          <PrimaryButton label={creating ? 'Publication…' : 'Publier'} onPress={create} disabled={creating} />
        </SoftCard>
      ) : null}

      <View style={styles.filters}>
        <TabBar tabs={FILTERS} value={status} onChange={setStatus} />
      </View>

      {loading ? (
        <Loader />
      ) : calls.length === 0 ? (
        <Text style={styles.empty}>Aucun appel pour ce filtre.</Text>
      ) : (
        calls.map((call) => {
          const tone = badgeTone(call.status);
          return (
            <SoftCard key={call.id} style={styles.card}>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.fg }]}>{statusLabel(call.status)}</Text>
              </View>
              <Text style={styles.title}>{call.title}</Text>
              <Text style={styles.meta}>
                {call.position || ROLE_LABELS[call.role] || call.role}
                {call.city ? ` · ${call.city}` : ''}
                {` · ${call.pending_applications_count || 0} en attente`}
              </Text>
              {!!call.description?.trim() && (
                <Text style={styles.desc} numberOfLines={4}>{call.description.trim()}</Text>
              )}

              <View style={styles.actions}>
                <SecondaryButton
                  compact
                  label={expandedId === call.id ? 'Masquer' : 'Candidatures'}
                  onPress={() => toggleApps(call)}
                />
                {call.status === 'open' ? (
                  <>
                    <SecondaryButton
                      compact
                      label={busyId === call.id ? '…' : 'Clôturer'}
                      onPress={() => setCallStatus(call, 'closed')}
                    />
                    <SecondaryButton
                      compact
                      danger
                      label="Annuler"
                      onPress={() => setCallStatus(call, 'cancelled')}
                    />
                  </>
                ) : null}
              </View>

              {expandedId === call.id ? (
                <View style={styles.apps}>
                  <Text style={styles.appsTitle}>Candidatures</Text>
                  {apps.length === 0 ? (
                    <Text style={styles.emptyInline}>Aucune candidature pour le moment.</Text>
                  ) : (
                    apps.map((app) => (
                      <View key={app.id} style={styles.appRow}>
                        <Text style={styles.appName}>
                          {personName(app.provider?.first_name, app.provider?.last_name)}
                        </Text>
                        <Text style={styles.meta}>
                          {app.provider?.email || '—'} · {statusLabel(app.status)}
                        </Text>
                        {!!app.message && <Text style={styles.message}>« {app.message} »</Text>}
                        {app.status === 'pending' ? (
                          <View style={styles.actions}>
                            <PrimaryButton
                              compact
                              label={busyId === app.id ? '…' : 'Accepter'}
                              onPress={() => review(app, 'accept')}
                            />
                            <SecondaryButton
                              compact
                              danger
                              label="Refuser"
                              onPress={() => review(app, 'reject')}
                            />
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </SoftCard>
          );
        })
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  linkWrap: { marginBottom: spacing.md },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  form: { marginTop: spacing.md, marginBottom: spacing.md },
  formTitle: { fontWeight: '700', fontSize: 15, marginBottom: spacing.sm, color: colors.text },
  filters: { marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  card: { marginTop: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  desc: { color: colors.textMuted, marginTop: 10, fontSize: 13, lineHeight: 19 },
  message: { fontStyle: 'italic', color: colors.textMuted, marginTop: 6, lineHeight: 18 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  apps: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  appsTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  appRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appName: { fontWeight: '700', color: colors.text, fontSize: 15 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
  emptyInline: { color: colors.textMuted, fontSize: 13 },
});
