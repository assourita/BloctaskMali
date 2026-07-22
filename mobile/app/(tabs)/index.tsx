import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getMyMissions, getStats } from '../../src/api/missions';
import {
  acceptEnterpriseInvite,
  getEnterpriseProfile,
  getMyEnterpriseInvites,
  getMyEnterprises,
  rejectEnterpriseInvite,
  type EnterpriseInvite,
  type ProviderEnterpriseMembership,
} from '../../src/api/enterprise';
import { getProviderProfile } from '../../src/api/deposits';
import { getMyReputation } from '../../src/api/reputation';
import { toggleAvailability } from '../../src/api/profile';
import { useScreenLoad } from '../../src/utils/useScreenLoad';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { WelcomeBanner, StatGrid, SoftCard, TabBar } from '../../src/components/widgets';
import { ProviderEarningsCard, AvailabilityCard } from '../../src/components/providerWidgets';
import { MissionCard } from '../../src/components/MissionCard';
import { Loader } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { formatXOF } from '../../src/constants/africa';
import { colors, spacing } from '../../src/constants/theme';
import type { Mission, MissionStats } from '../../src/types';

const ACTIVE_STATUSES = ['funded', 'published', 'accepted', 'in_progress', 'submitted'];

type ProviderWorkMode = 'independent' | 'enterprises';

export default function DashboardScreen() {
  const { user, activeRole, refreshProfile } = useAuth();
  const isProvider = activeRole === 'provider';
  const isEnterprise = activeRole === 'enterprise';
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [enterpriseDeposit, setEnterpriseDeposit] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [workMode, setWorkMode] = useState<ProviderWorkMode>('independent');
  const [myInvites, setMyInvites] = useState<EnterpriseInvite[]>([]);
  const [myEnterprises, setMyEnterprises] = useState<ProviderEnterpriseMembership[]>([]);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getStats(activeRole), getMyMissions(activeRole)]);
      setStats(s);
      setMissions(m);
      if (isProvider) {
        const [profile, rep, invites, memberships] = await Promise.all([
          getProviderProfile(),
          getMyReputation().catch(() => null),
          getMyEnterpriseInvites().catch(() => [] as EnterpriseInvite[]),
          getMyEnterprises().catch(() => [] as ProviderEnterpriseMembership[]),
        ]);
        setIsAvailable(profile?.is_available !== false);
        setAvgRating(rep?.average_rating ?? 0);
        setMyInvites(invites.filter((i) => i.status === 'pending'));
        setMyEnterprises(memberships.filter((x) => x.is_active));
      }
      if (isEnterprise) {
        const ep = await getEnterpriseProfile();
        setEnterpriseDeposit(Number(ep?.deposit_balance ?? 0));
        setEmployeeCount(ep?.total_employees ?? 0);
      }
    } catch {
      setStats(null);
      setMissions([]);
    }
  }, [activeRole, isProvider, isEnterprise]);

  const { loading, refreshing, refresh, reload } = useScreenLoad(loadData, [loadData]);

  const ongoing = useMemo(
    () => missions.filter((m) => ACTIVE_STATUSES.includes(m.status)).slice(0, 3),
    [missions],
  );

  const handleToggleAvail = async () => {
    setTogglingAvail(true);
    try {
      const res = await toggleAvailability() as { is_available?: boolean };
      setIsAvailable(res.is_available ?? !isAvailable);
      await refreshProfile();
    } catch {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité');
    } finally {
      setTogglingAvail(false);
    }
  };

  const respondInvite = async (id: string, accept: boolean) => {
    setInviteBusyId(id);
    try {
      if (accept) {
        await acceptEnterpriseInvite(id);
        Alert.alert('Bienvenue', 'Vous êtes maintenant lié à cette entreprise.');
      } else {
        await rejectEnterpriseInvite(id);
      }
      await reload();
    } catch {
      Alert.alert('Erreur', accept ? 'Acceptation impossible' : 'Refus impossible');
    } finally {
      setInviteBusyId(null);
    }
  };

  const providerSubtitle = isProvider
    ? workMode === 'enterprises'
      ? 'Gérez vos liens entreprises et invitations.'
      : 'Prêt à trouver de nouvelles missions sur BlockTask ?'
    : undefined;

  return (
    <AppLayout refreshing={refreshing} onRefresh={refresh}>
      <WelcomeBanner name={user?.first_name || ''} subtitle={providerSubtitle} />

      {user?.can_access_platform === false && (
        <Pressable style={styles.onboarding} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.onboardingTitle}>Profil incomplet</Text>
          <Text style={styles.onboardingText}>
            {user?.kyc_block_message || 'Complétez votre profil pour accéder à toutes les fonctionnalités.'}
          </Text>
          <Text style={styles.onboardingLink}>Compléter mon profil ›</Text>
        </Pressable>
      )}

      {loading ? (
        <Loader />
      ) : isProvider ? (
        <>
          <TabBar
            value={workMode}
            onChange={(id) => setWorkMode(id as ProviderWorkMode)}
            tabs={[
              { id: 'independent', label: 'Indépendant' },
              {
                id: 'enterprises',
                label: 'Entreprises',
                count: myInvites.length > 0 ? myInvites.length : myEnterprises.length || undefined,
              },
            ]}
          />

          {workMode === 'independent' ? (
            <>
              <ProviderEarningsCard
                totalEarned={stats?.total_earned ?? 0}
                completedMissions={stats?.completed_missions ?? 0}
                averageRating={avgRating || 4.5}
                responseTime="1.5h"
                level={stats?.level}
                reputationScore={stats?.reputation_score}
              />

              <AvailabilityCard
                isAvailable={isAvailable}
                loading={togglingAvail}
                onToggle={handleToggleAvail}
              />

              <View style={styles.actions}>
                <ActionBtn label="Trouver des missions" onPress={() => router.push('/(tabs)/available')} primary />
                <ActionBtn label="Ma caution" onPress={() => router.push('/deposit')} />
              </View>
              <View style={styles.actions}>
                <ActionBtn label="Ma réputation" onPress={() => router.push('/reputation')} />
                <ActionBtn label="Mes missions" onPress={() => router.push('/(tabs)/missions')} />
              </View>

              <SoftCard>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Mission en cours</Text>
                  <Pressable onPress={() => router.push('/(tabs)/missions')}>
                    <Text style={styles.link}>Voir tout</Text>
                  </Pressable>
                </View>
                {ongoing.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.empty}>Aucune mission en cours</Text>
                    <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/available')}>
                      <Text style={styles.ctaText}>Trouver des missions</Text>
                    </Pressable>
                  </View>
                ) : (
                  ongoing.map((m) => <MissionCard key={m.id} mission={m} showActions onChanged={reload} />)
                )}
              </SoftCard>
            </>
          ) : (
            <>
              {myInvites.length > 0 && (
                <SoftCard style={{ marginBottom: spacing.md }}>
                  <Text style={styles.sectionTitle}>Invitations en attente</Text>
                  {myInvites.map((inv) => (
                    <View key={inv.id} style={styles.inviteBlock}>
                      <Text style={styles.inviteTitle}>{inv.enterprise_name}</Text>
                      <Text style={styles.enterpriseMeta}>
                        {inv.position || inv.role}
                        {inv.message ? ` · ${inv.message}` : ''}
                      </Text>
                      <View style={styles.inviteActions}>
                        <View style={{ flex: 1 }}>
                          <PrimaryButton
                            label="Accepter"
                            loading={inviteBusyId === inv.id}
                            onPress={() => respondInvite(inv.id, true)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <SecondaryButton
                            label="Refuser"
                            onPress={() => respondInvite(inv.id, false)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </SoftCard>
              )}

              <SoftCard>
                <Text style={styles.sectionTitle}>Mes entreprises</Text>
                {myEnterprises.length === 0 ? (
                  <Text style={[styles.empty, { marginTop: spacing.sm }]}>
                    Aucune entreprise liée pour le moment.
                  </Text>
                ) : (
                  myEnterprises.map((m) => (
                    <View key={m.id} style={styles.membershipRow}>
                      <Text style={styles.inviteTitle}>{m.enterprise_name}</Text>
                      <Text style={styles.enterpriseMeta}>
                        {m.position || m.role}
                        {m.hired_at
                          ? ` · depuis ${new Date(m.hired_at).toLocaleDateString('fr-FR')}`
                          : ''}
                      </Text>
                    </View>
                  ))
                )}
                <Text style={[styles.enterpriseMeta, { marginTop: spacing.md }]}>
                  Les missions assignées via une entreprise apparaissent dans Mes missions.
                </Text>
                <Pressable style={[styles.cta, { alignSelf: 'flex-start' }]} onPress={() => router.push('/(tabs)/missions')}>
                  <Text style={styles.ctaText}>Voir mes missions</Text>
                </Pressable>
              </SoftCard>
            </>
          )}
        </>
      ) : (
        <>
          {isEnterprise && (
            <SoftCard style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>Entreprise</Text>
              <Text style={styles.enterpriseMeta}>
                Caution disponible : {formatXOF(enterpriseDeposit)} · {employeeCount} employé(s)
              </Text>
            </SoftCard>
          )}
          <StatGrid
            items={[
              { value: stats?.active_missions ?? 0, label: 'Missions actives', tint: colors.info },
              { value: stats?.completed_missions ?? 0, label: 'Missions terminées', tint: colors.success },
              { value: stats?.pending_missions ?? 0, label: 'En attente', tint: colors.warning },
              { value: `${formatXOF(stats?.total_spent ?? 0)}`, label: 'Dépensé ce mois', tint: colors.accent },
            ]}
          />
          <View style={styles.actions}>
            <ActionBtn label="Nouvelle mission" onPress={() => router.push('/create-mission')} primary />
            <ActionBtn
              label={isEnterprise ? 'Caution entreprise' : 'Suivi en direct'}
              onPress={() => router.push(isEnterprise ? '/deposit' : '/tracking')}
            />
            <ActionBtn label="Mes missions" onPress={() => router.push('/(tabs)/missions')} />
          </View>
          {isEnterprise && (
            <View style={styles.actions}>
              <ActionBtn label="Employés" onPress={() => router.push('/employees')} />
              <ActionBtn label="Affectations" onPress={() => router.push('/assignments')} />
            </View>
          )}
          {isEnterprise && (
            <View style={styles.actions}>
              <ActionBtn label="Missions disponibles" onPress={() => router.push('/(tabs)/available')} primary />
              <ActionBtn label="Sollicitations" onPress={() => router.push('/solicitations')} />
            </View>
          )}
          <SoftCard>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Missions en cours</Text>
              <Pressable onPress={() => router.push('/(tabs)/missions')}>
                <Text style={styles.link}>Voir tout</Text>
              </Pressable>
            </View>
            {ongoing.length === 0 ? (
              <Text style={styles.empty}>Aucune mission en cours pour le moment.</Text>
            ) : (
              ongoing.map((m) => <MissionCard key={m.id} mission={m} />)
            )}
          </SoftCard>
        </>
      )}
    </AppLayout>
  );
}

function ActionBtn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable style={[styles.actionBtn, primary && styles.actionBtnPrimary]} onPress={onPress}>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  actionBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text, textAlign: 'center' },
  actionLabelPrimary: { color: '#fff' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.md },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  cta: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: 10 },
  ctaText: { color: '#fff', fontWeight: '700' },
  enterpriseMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  inviteBlock: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  inviteTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  inviteActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  membershipRow: { marginTop: spacing.md },
  onboarding: {
    backgroundColor: colors.warningLight, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#f59e0b',
  },
  onboardingTitle: { fontWeight: '800', color: '#92400e', fontSize: 15 },
  onboardingText: { color: '#92400e', fontSize: 13, marginTop: 4, lineHeight: 19 },
  onboardingLink: { color: '#92400e', fontWeight: '800', marginTop: spacing.sm },
});
