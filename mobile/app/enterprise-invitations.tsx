import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  cancelEnterpriseInvite,
  listEnterpriseInvites,
  type EnterpriseInvite,
} from '../src/api/enterprise';
import { SecondaryButton } from '../src/components/buttons';
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
  { id: 'pending', label: 'En attente' },
  { id: 'accepted', label: 'Acceptées' },
  { id: 'rejected', label: 'Refusées' },
  { id: 'cancelled', label: 'Annulées' },
  { id: 'expired', label: 'Expirées' },
  { id: 'all', label: 'Tout' },
];

export default function EnterpriseInvitationsScreen() {
  const { redirect: guardRedirect } = useEnterpriseGuard();
  const [status, setStatus] = useState('pending');
  const [invites, setInvites] = useState<EnterpriseInvite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listEnterpriseInvites(status).catch(() => [] as EnterpriseInvite[]);
    setInvites(list);
  }, [status]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const cancel = (inv: EnterpriseInvite) => {
    Alert.alert('Annuler', `Annuler l'invitation pour ${inv.email} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          setBusyId(inv.id);
          try {
            await cancelEnterpriseInvite(inv.id);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Annulation impossible');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (guardRedirect) return null;

  return (
    <AppLayout title="Appels / invitations" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Appels à rejoindre l'entreprise"
        subtitle="Invitez des prestataires à faire partie de votre équipe"
      />

      <Pressable onPress={() => router.push('/employees')}>
        <Text style={styles.link}>Inviter depuis Employés →</Text>
      </Pressable>

      <TabBar tabs={FILTERS} value={status} onChange={setStatus} />

      {loading ? (
        <Loader />
      ) : invites.length === 0 ? (
        <Text style={styles.empty}>Aucune invitation pour ce filtre.</Text>
      ) : (
        invites.map((inv) => (
          <SoftCard key={inv.id} style={styles.card}>
            <Text style={styles.badge}>{statusLabel(inv.status)}</Text>
            <Text style={styles.title}>{inv.email}</Text>
            <Text style={styles.meta}>
              {inv.position || ROLE_LABELS[inv.role] || inv.role}
              {inv.invited_by_name ? ` · par ${inv.invited_by_name}` : ''}
            </Text>
            {!!inv.message && <Text style={styles.message}>« {inv.message} »</Text>}
            {inv.status === 'pending' ? (
              <View style={styles.actions}>
                <SecondaryButton label={busyId === inv.id ? '…' : 'Annuler'} onPress={() => cancel(inv)} />
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
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    cancelled: 'Annulée',
    expired: 'Expirée',
  };
  return map[status] || status;
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  message: { fontSize: 13, fontStyle: 'italic', color: colors.textMuted, marginTop: 6 },
  actions: { marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
