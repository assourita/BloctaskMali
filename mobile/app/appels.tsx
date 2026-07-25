import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  applyToRecruitmentCall,
  getMyRecruitmentApplications,
  listOpenRecruitmentCalls,
  type RecruitmentApplication,
  type RecruitmentCall,
} from '../src/api/enterprise';
import { PrimaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, TabBar } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useAuth } from '../src/context/AuthContext';
import { ApiError } from '../src/api/client';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'RH',
  accountant: 'Comptable',
};

const TABS = [
  { id: 'open', label: 'Appels ouverts' },
  { id: 'mine', label: 'Mes candidatures' },
];

export default function ProviderAppelsScreen() {
  const { activeRole } = useAuth();
  const [tab, setTab] = useState('open');
  const [calls, setCalls] = useState<RecruitmentCall[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (activeRole !== 'provider') return;
    if (tab === 'open') {
      setCalls(await listOpenRecruitmentCalls().catch(() => [] as RecruitmentCall[]));
      return;
    }
    setApplications(await getMyRecruitmentApplications().catch(() => [] as RecruitmentApplication[]));
  }, [activeRole, tab]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const apply = async (call: RecruitmentCall) => {
    setBusyId(call.id);
    try {
      await applyToRecruitmentCall(call.id, messages[call.id] || '');
      Alert.alert('Envoyé', 'Votre candidature a été transmise.');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Candidature impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (activeRole !== 'provider') {
    return (
      <AppLayout title="Appels à candidature" showBack>
        <Text style={styles.empty}>Réservé aux prestataires.</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Appels à candidature" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Rejoindre une entreprise"
        subtitle="Appels ouverts à tous — les invitations ciblées sont ailleurs"
      />

      <Pressable onPress={() => router.push('/invitations')}>
        <Text style={styles.link}>Voir mes invitations ciblées →</Text>
      </Pressable>

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <Loader />
      ) : tab === 'open' ? (
        calls.length === 0 ? (
          <Text style={styles.empty}>Aucun appel ouvert pour le moment.</Text>
        ) : (
          calls.map((call) => {
            const applied = call.my_application?.status === 'pending' || call.my_application?.status === 'accepted';
            return (
              <SoftCard key={call.id} style={styles.card}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>Ouvert</Text>
                  <Text style={styles.badgeMuted}>{ROLE_LABELS[call.role] || call.role}</Text>
                </View>
                <Text style={styles.title}>{call.title}</Text>
                <Text style={styles.ent}>
                  {call.enterprise_name}{call.city ? ` · ${call.city}` : ''}
                </Text>
                {!!call.position && <Text style={styles.meta}>{call.position}</Text>}
                {!!call.description && <Text style={styles.desc}>{call.description}</Text>}
                {!!call.requirements && (
                  <View style={styles.reqBox}>
                    <Text style={styles.reqTitle}>Prérequis</Text>
                    <Text style={styles.meta}>{call.requirements}</Text>
                  </View>
                )}
                {!!call.expires_at && (
                  <Text style={styles.meta}>
                    Expire le {new Date(call.expires_at).toLocaleString('fr-FR')}
                  </Text>
                )}
                {applied ? (
                  <Text style={styles.applied}>
                    {call.my_application?.status === 'accepted' ? 'Candidature acceptée' : 'Déjà postulé'}
                  </Text>
                ) : (
                  <View style={styles.apply}>
                    <TextInput
                      style={[styles.input, styles.area]}
                      placeholder="Message (optionnel)"
                      multiline
                      value={messages[call.id] || ''}
                      onChangeText={(v) => setMessages((m) => ({ ...m, [call.id]: v }))}
                    />
                    <PrimaryButton
                      label={busyId === call.id ? 'Envoi…' : 'Postuler'}
                      onPress={() => apply(call)}
                      disabled={busyId === call.id}
                    />
                  </View>
                )}
              </SoftCard>
            );
          })
        )
      ) : applications.length === 0 ? (
        <Text style={styles.empty}>Aucune candidature pour le moment.</Text>
      ) : (
        applications.map((app) => (
          <SoftCard key={app.id} style={styles.card}>
            <Text style={styles.badge}>{statusLabel(app.status)}</Text>
            <Text style={styles.title}>{app.call?.title || 'Appel'}</Text>
            <Text style={styles.ent}>{app.call?.enterprise_name}</Text>
            <Text style={styles.meta}>{app.call?.position || ROLE_LABELS[app.call?.role || ''] || ''}</Text>
            {!!app.message && <Text style={styles.message}>« {app.message} »</Text>}
          </SoftCard>
        ))
      )}
    </AppLayout>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    withdrawn: 'Retirée',
  };
  return map[status] || status;
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.md },
  card: { marginBottom: spacing.sm, paddingVertical: spacing.md },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
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
  },
  badgeMuted: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 22 },
  ent: { fontWeight: '600', color: colors.text, marginTop: 4, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  desc: { color: '#475569', marginTop: 10, fontSize: 14, lineHeight: 20 },
  reqBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  reqTitle: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 },
  message: { fontStyle: 'italic', color: colors.textMuted, marginTop: 4 },
  applied: { marginTop: 10, color: colors.primary, fontWeight: '600' },
  apply: { marginTop: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  area: { minHeight: 72, textAlignVertical: 'top', marginBottom: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
});
