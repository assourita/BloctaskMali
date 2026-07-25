import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  acceptEnterpriseInvite,
  getMyEnterpriseInvites,
  rejectEnterpriseInvite,
  type EnterpriseInvite,
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, TabBar } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, radius, spacing } from '../src/constants/theme';
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

const FILTERS = [
  { id: 'pending', label: 'En attente' },
  { id: 'accepted', label: 'Acceptées' },
  { id: 'rejected', label: 'Refusées' },
  { id: 'cancelled', label: 'Annulées' },
  { id: 'expired', label: 'Expirées' },
  { id: 'all', label: 'Tout' },
];

export default function ProviderInvitationsScreen() {
  const { activeRole } = useAuth();
  const [status, setStatus] = useState('pending');
  const [invites, setInvites] = useState<EnterpriseInvite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (activeRole !== 'provider') return;
    const list = await getMyEnterpriseInvites(status).catch(() => [] as EnterpriseInvite[]);
    setInvites(list);
  }, [activeRole, status]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      if (accept) {
        await acceptEnterpriseInvite(id);
        Alert.alert('Bienvenue', 'Vous avez rejoint cette entreprise.');
      } else {
        await rejectEnterpriseInvite(id);
      }
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (activeRole !== 'provider') {
    return (
      <AppLayout title="Appels / invitations" showBack>
        <Text style={styles.empty}>Réservé aux prestataires.</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Appels / invitations" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Rejoindre une entreprise"
        subtitle="Appels pour faire partie d'une équipe — pas pour exécuter une mission"
      />

      <Pressable onPress={() => router.push('/my-enterprises')}>
        <Text style={styles.link}>Voir mes entreprises liées →</Text>
      </Pressable>

      <TabBar
        tabs={FILTERS}
        value={status}
        onChange={(id) => {
          setStatus(id);
          setExpandedId(null);
        }}
      />

      {loading ? (
        <Loader />
      ) : invites.length === 0 ? (
        <Text style={styles.empty}>Aucune invitation pour ce filtre.</Text>
      ) : (
        invites.map((inv) => {
          const ent = inv.enterprise;
          const pending = inv.status === 'pending';
          return (
            <SoftCard key={inv.id} style={styles.card}>
              <View style={styles.row}>
                {ent?.logo ? (
                  <Image source={{ uri: ent.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoLetter}>{(inv.enterprise_name || 'E')[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.badge}>{statusLabel(inv)}</Text>
                  <Text style={styles.title}>{inv.enterprise_name}</Text>
                  <Text style={styles.meta}>
                    {inv.position || ROLE_LABELS[inv.role] || inv.role}
                    {ent?.city ? ` · ${ent.city}` : ''}
                  </Text>
                  {!!inv.message && <Text style={styles.message}>« {inv.message} »</Text>}
                </View>
              </View>

              <View style={styles.actions}>
                <SecondaryButton
                  label={expandedId === inv.id ? 'Masquer' : 'Détails'}
                  onPress={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                />
                {pending ? (
                  <>
                    <PrimaryButton
                      label="Accepter"
                      loading={busyId === inv.id}
                      onPress={() => respond(inv.id, true)}
                    />
                    <SecondaryButton
                      label="Refuser"
                      onPress={() => {
                        if (busyId === inv.id) return;
                        respond(inv.id, false);
                      }}
                    />
                  </>
                ) : null}
              </View>

              {expandedId === inv.id && ent ? (
                <View style={styles.details}>
                  {!!ent.description && <Text style={styles.detailText}>{ent.description}</Text>}
                  {!!ent.address && <Text style={styles.detailText}>{ent.address}</Text>}
                  <Text style={styles.detailText}>
                    {[ent.city, ent.country].filter(Boolean).join(', ')}
                  </Text>
                  {!!ent.company_phone && <Text style={styles.detailText}>Tél. {ent.company_phone}</Text>}
                  {!!ent.company_email && <Text style={styles.detailText}>{ent.company_email}</Text>}
                  {!!ent.website && <Text style={styles.detailText}>{ent.website}</Text>}
                </View>
              ) : null}
            </SoftCard>
          );
        })
      )}
    </AppLayout>
  );
}

function statusLabel(inv: EnterpriseInvite): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    cancelled: 'Annulée',
    expired: 'Expirée',
  };
  return map[inv.status] || inv.status;
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  logo: { width: 48, height: 48, borderRadius: radius.md },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontWeight: '800', color: colors.primary, fontSize: 18 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  details: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  detailText: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
