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
    const list = await listRecruitmentApplications(call.id).catch(() => [] as RecruitmentApplication[]);
    setApps(list);
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
    const name = `${app.provider?.first_name || ''} ${app.provider?.last_name || ''}`.trim() || 'ce candidat';
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

      <Pressable onPress={() => router.push('/enterprise-invitations')}>
        <Text style={styles.link}>Voir les invitations ciblées →</Text>
      </Pressable>

      <PrimaryButton
        label={showForm ? 'Masquer le formulaire' : 'Nouvel appel'}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <SoftCard style={styles.form}>
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

      <TabBar tabs={FILTERS} value={status} onChange={setStatus} />

      {loading ? (
        <Loader />
      ) : calls.length === 0 ? (
        <Text style={styles.empty}>Aucun appel pour ce filtre.</Text>
      ) : (
        calls.map((call) => (
          <SoftCard key={call.id} style={styles.card}>
            <Text style={styles.badge}>{statusLabel(call.status)}</Text>
            <Text style={styles.title}>{call.title}</Text>
            <Text style={styles.meta}>
              {call.position || ROLE_LABELS[call.role] || call.role}
              {call.city ? ` · ${call.city}` : ''}
              {` · ${call.pending_applications_count || 0} en attente`}
            </Text>
            <Text style={styles.desc}>{call.description}</Text>
            <View style={styles.actions}>
              <SecondaryButton
                label={expandedId === call.id ? 'Masquer' : 'Candidatures'}
                onPress={() => toggleApps(call)}
              />
              {call.status === 'open' ? (
                <>
                  <SecondaryButton
                    label={busyId === call.id ? '…' : 'Clôturer'}
                    onPress={() => setCallStatus(call, 'closed')}
                  />
                  <SecondaryButton
                    label="Annuler"
                    onPress={() => setCallStatus(call, 'cancelled')}
                  />
                </>
              ) : null}
            </View>
            {expandedId === call.id ? (
              <View style={styles.apps}>
                {apps.length === 0 ? (
                  <Text style={styles.empty}>Aucune candidature.</Text>
                ) : (
                  apps.map((app) => (
                    <View key={app.id} style={styles.appRow}>
                      <Text style={styles.appName}>
                        {app.provider?.first_name} {app.provider?.last_name}
                      </Text>
                      <Text style={styles.meta}>{app.provider?.email} · {statusLabel(app.status)}</Text>
                      {!!app.message && <Text style={styles.message}>« {app.message} »</Text>}
                      {app.status === 'pending' ? (
                        <View style={styles.actions}>
                          <PrimaryButton
                            label={busyId === app.id ? '…' : 'Accepter'}
                            onPress={() => review(app, 'accept')}
                          />
                          <SecondaryButton label="Refuser" onPress={() => review(app, 'reject')} />
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </SoftCard>
        ))
      )}
    </AppLayout>
  );
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

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.md },
  form: { marginBottom: spacing.md, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  card: { marginBottom: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  desc: { color: colors.textMuted, marginTop: 8, fontSize: 13 },
  message: { fontStyle: 'italic', color: colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  apps: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  appRow: { marginBottom: 12 },
  appName: { fontWeight: '700', color: colors.text },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
});
