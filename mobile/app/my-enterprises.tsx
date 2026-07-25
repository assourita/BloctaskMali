import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  getMyEnterpriseInvites,
  getMyEnterprises,
  type EnterpriseInvite,
  type ProviderEnterpriseMembership,
} from '../src/api/enterprise';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useAuth } from '../src/context/AuthContext';

export default function MyEnterprisesScreen() {
  const { activeRole } = useAuth();
  const [invites, setInvites] = useState<EnterpriseInvite[]>([]);
  const [memberships, setMemberships] = useState<ProviderEnterpriseMembership[]>([]);

  const load = useCallback(async () => {
    if (activeRole !== 'provider') return;
    const [pending, links] = await Promise.all([
      getMyEnterpriseInvites('pending').catch(() => [] as EnterpriseInvite[]),
      getMyEnterprises().catch(() => [] as ProviderEnterpriseMembership[]),
    ]);
    setInvites(pending);
    setMemberships(links.filter((m) => m.is_active));
  }, [activeRole]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

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
        subtitle="Entreprises auxquelles vous êtes lié"
      />

      {loading ? (
        <Loader />
      ) : (
        <>
          {invites.length > 0 ? (
            <Pressable onPress={() => router.push('/invitations')}>
              <SoftCard style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionTitle}>
                  {invites.length} invitation(s) en attente
                </Text>
                <Text style={styles.meta}>Ouvrir pour accepter ou refuser →</Text>
              </SoftCard>
            </Pressable>
          ) : null}

          <SoftCard>
            <Text style={styles.sectionTitle}>Entreprises liées</Text>
            {memberships.length === 0 ? (
              <Text style={styles.emptyInline}>Aucune entreprise liée pour le moment.</Text>
            ) : (
              memberships.map((m) => {
                const logo = m.enterprise?.logo;
                return (
                  <Pressable
                    key={m.id}
                    style={styles.row}
                    onPress={() => router.push(`/my-enterprise/${m.enterprise_id}`)}
                  >
                    {logo ? (
                      <Image source={{ uri: logo }} style={styles.logoImg} />
                    ) : (
                      <View style={styles.logo}>
                        <Text style={styles.logoText}>
                          {(m.enterprise_name || 'E')[0]}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{m.enterprise_name}</Text>
                      <Text style={styles.meta}>
                        {m.position || m.role}
                        {m.hired_at
                          ? ` · depuis ${new Date(m.hired_at).toLocaleDateString('fr-FR')}`
                          : ''}
                      </Text>
                      <Text style={[styles.meta, { color: colors.primary }]}>Voir le détail →</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Lié</Text>
                    </View>
                  </Pressable>
                );
              })
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
  title: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
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
  logoImg: { width: 40, height: 40, borderRadius: 10 },
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
