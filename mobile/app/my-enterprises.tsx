import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  acceptEnterpriseInvite,
  getMyEnterpriseInvites,
  getMyEnterprises,
  rejectEnterpriseInvite,
  type EnterpriseInvite,
  type ProviderEnterpriseMembership,
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useAuth } from '../src/context/AuthContext';
import { ApiError } from '../src/api/client';

export default function MyEnterprisesScreen() {
  const { activeRole } = useAuth();
  const [invites, setInvites] = useState<EnterpriseInvite[]>([]);
  const [memberships, setMemberships] = useState<ProviderEnterpriseMembership[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (activeRole !== 'provider') return;
    const [pending, links] = await Promise.all([
      getMyEnterpriseInvites().catch(() => [] as EnterpriseInvite[]),
      getMyEnterprises().catch(() => [] as ProviderEnterpriseMembership[]),
    ]);
    setInvites(pending.filter((i) => i.status === 'pending'));
    setMemberships(links.filter((m) => m.is_active));
  }, [activeRole]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      if (accept) {
        await acceptEnterpriseInvite(id);
        Alert.alert('Bienvenue', 'Vous êtes maintenant lié à cette entreprise.');
      } else {
        await rejectEnterpriseInvite(id);
      }
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : accept ? 'Acceptation impossible' : 'Refus impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (activeRole !== 'provider') {
    return (
      <AppLayout title="Mes entreprises" showBack>
        <Text style={styles.empty}>Réservé aux prestataires.</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mes entreprises" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Mes entreprises"
        subtitle="Invitations et liens avec les entreprises partenaires"
      />

      {loading ? (
        <Loader />
      ) : (
        <>
          {invites.length > 0 ? (
            <SoftCard style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>Invitations en attente</Text>
              {invites.map((inv) => (
                <View key={inv.id} style={styles.inviteBlock}>
                  <Text style={styles.title}>{inv.enterprise_name}</Text>
                  <Text style={styles.meta}>
                    {inv.position || inv.role}
                    {inv.message ? ` · ${inv.message}` : ''}
                  </Text>
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Accepter"
                        loading={busyId === inv.id}
                        onPress={() => respond(inv.id, true)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton label="Refuser" onPress={() => respond(inv.id, false)} />
                    </View>
                  </View>
                </View>
              ))}
            </SoftCard>
          ) : null}

          <SoftCard>
            <Text style={styles.sectionTitle}>Entreprises liées</Text>
            {memberships.length === 0 ? (
              <Text style={styles.emptyInline}>Aucune entreprise liée pour le moment.</Text>
            ) : (
              memberships.map((m) => (
                <View key={m.id} style={styles.row}>
                  <View style={styles.logo}>
                    <Text style={styles.logoText}>E</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{m.enterprise_name}</Text>
                    <Text style={styles.meta}>
                      {m.position || m.role}
                      {m.hired_at
                        ? ` · depuis ${new Date(m.hired_at).toLocaleDateString('fr-FR')}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Lié</Text>
                  </View>
                </View>
              ))
            )}
            <Text style={[styles.meta, { marginTop: spacing.md }]}>
              Les missions assignées via une entreprise apparaissent dans Mes missions.
            </Text>
            <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/missions')}>
              <Text style={styles.ctaText}>Voir mes missions</Text>
            </Pressable>
          </SoftCard>
        </>
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  inviteBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  title: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.primary, fontWeight: '800' },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  emptyInline: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  cta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
});
