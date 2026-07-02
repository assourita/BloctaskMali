import { useCallback, useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getMyMissions, getStats, type MissionScope } from '../../src/api/missions';
import { invalidateCache } from '../../src/api/cache';
import { getMyApplications } from '../../src/api/applications';
import { useScreenLoad, useFocusReload } from '../../src/utils/useScreenLoad';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { EnterpriseMissionsNav } from '../../src/components/EnterpriseMissionsNav';
import { PageHeader, StatGrid, TabBar } from '../../src/components/widgets';
import { MissionCard } from '../../src/components/MissionCard';
import { Loader } from '../../src/components/ui';
import { formatXOF } from '../../src/constants/africa';
import { colors, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';
import { NetworkBanner } from '../../src/components/NetworkBanner';
import type { Mission, MissionApplication } from '../../src/types';

const IN_PROGRESS = ['accepted', 'in_progress', 'submitted'];
const DONE = ['completed', 'cancelled'];

type ClientFilter = 'all' | 'progress' | 'pending' | 'done';
type ProviderTab = 'active' | 'history' | 'pending';
type EnterpriseTab = 'ordered' | 'received';

export default function MissionsScreen() {
  const { activeRole } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const isProvider = activeRole === 'provider';
  const isEnterprise = activeRole === 'enterprise';
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applications, setApplications] = useState<MissionApplication[]>([]);
  const [earned, setEarned] = useState(0);
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');
  const [providerTab, setProviderTab] = useState<ProviderTab>('active');
  const [enterpriseTab, setEnterpriseTab] = useState<EnterpriseTab>('ordered');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isEnterprise) {
      setEnterpriseTab(tab === 'received' ? 'received' : 'ordered');
    }
  }, [tab, isEnterprise]);

  const missionScope: MissionScope | undefined = isEnterprise && enterpriseTab === 'received'
    ? 'received'
    : undefined;

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      invalidateCache('/missions');
      const [m, s] = await Promise.all([
        getMyMissions(activeRole, missionScope),
        getStats(activeRole),
      ]);
      setMissions(m);
      setEarned(s.total_earned ?? 0);
      if (isProvider) {
        setApplications(await getMyApplications('provider'));
      }
    } catch (e) {
      setMissions([]);
      setApplications([]);
      setLoadError(e instanceof ApiError ? e.message : 'Impossible de charger les missions');
    }
  }, [activeRole, isProvider, missionScope]);

  const { loading, refreshing, refresh, reload } = useScreenLoad(loadData, [loadData]);
  useFocusReload(reload);

  const activeMissions = useMemo(
    () => missions.filter((m) => IN_PROGRESS.includes(m.status)),
    [missions],
  );
  const historyMissions = useMemo(
    () => missions.filter((m) => DONE.includes(m.status)),
    [missions],
  );
  const pendingApps = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications],
  );

  const clientCounts = useMemo(() => {
    const progress = missions.filter((m) => IN_PROGRESS.includes(m.status) || m.status === 'published').length;
    const pending = missions.filter((m) => ['pending', 'funded', 'draft'].includes(m.status)).length;
    const done = missions.filter((m) => m.status === 'completed').length;
    return { total: missions.length, progress, pending, done };
  }, [missions]);

  const clientFiltered = useMemo(() => {
    switch (clientFilter) {
      case 'progress':
        return missions.filter((m) => IN_PROGRESS.includes(m.status) || m.status === 'published');
      case 'pending':
        return missions.filter((m) => ['pending', 'funded', 'draft'].includes(m.status));
      case 'done':
        return missions.filter((m) => m.status === 'completed');
      default:
        return missions;
    }
  }, [missions, clientFilter]);

  const providerList = providerTab === 'active'
    ? activeMissions
    : providerTab === 'history'
      ? historyMissions
      : [];

  const pageTitle = isProvider
    ? 'Mes missions assignées'
    : isEnterprise
      ? 'Missions'
      : 'Mes missions créées';

  const pageSubtitle = isProvider
    ? 'Missions où vous êtes prestataire retenu'
    : isEnterprise
      ? "Missions commandées, reçues et création d'une nouvelle mission"
      : 'Uniquement les missions que vous avez publiées';

  const displayList = isProvider
    ? providerList
    : isEnterprise
      ? missions
      : clientFiltered;

  return (
    <AppLayout refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        action={isProvider ? (
          <Pressable onPress={() => router.push('/solicitations')}>
            <Text style={styles.linkBtn}>Mes sollicitations</Text>
          </Pressable>
        ) : isEnterprise && enterpriseTab === 'received' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => router.push('/(tabs)/available')}>
              <Text style={styles.linkBtn}>Postuler</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/assignments')}>
              <Text style={styles.linkBtn}>Affectations</Text>
            </Pressable>
          </View>
        ) : undefined}
      />

      {isProvider ? (
        <StatGrid
          items={[
            { value: missions.length, label: 'Total missions', tint: colors.accent },
            { value: activeMissions.length, label: 'En cours', tint: colors.info },
            { value: historyMissions.filter((m) => m.status === 'completed').length, label: 'Terminées', tint: colors.success },
            { value: formatXOF(earned), label: 'Gagnés ce mois', tint: colors.warning },
          ]}
        />
      ) : (
        <StatGrid
          items={[
            { value: clientCounts.total, label: 'Total', tint: colors.accent },
            { value: clientCounts.progress, label: 'En cours', tint: colors.info },
            { value: clientCounts.pending, label: 'En attente', tint: colors.warning },
            { value: clientCounts.done, label: 'Terminées', tint: colors.success },
          ]}
        />
      )}

      {isEnterprise ? (
        <EnterpriseMissionsNav active={enterpriseTab} />
      ) : isProvider ? (
        <TabBar
          value={providerTab}
          onChange={(id) => setProviderTab(id as ProviderTab)}
          tabs={[
            { id: 'active', label: 'En cours', count: activeMissions.length },
            { id: 'history', label: 'Historique', count: historyMissions.length },
            { id: 'pending', label: 'En attente', count: pendingApps.length },
          ]}
        />
      ) : (
        <TabBar
          value={clientFilter}
          onChange={(id) => setClientFilter(id as ClientFilter)}
          tabs={[
            { id: 'all', label: 'Toutes', count: clientCounts.total },
            { id: 'progress', label: 'En cours', count: clientCounts.progress },
            { id: 'pending', label: 'En attente', count: clientCounts.pending },
            { id: 'done', label: 'Terminées', count: clientCounts.done },
          ]}
        />
      )}

      {loadError ? <NetworkBanner message={loadError} onRetry={reload} /> : null}

      {loading ? (
        <Loader />
      ) : isProvider && providerTab === 'pending' ? (
        pendingApps.length === 0 ? (
          <EmptyState
            title="Aucune candidature en attente"
            text="Postulez à des missions disponibles pour commencer à travailler"
            cta="Trouver des missions"
            onCta={() => router.push('/(tabs)/available')}
          />
        ) : (
          pendingApps.map((a) => (
            <Pressable key={a.id} style={styles.appCard} onPress={() => a.mission && router.push(`/mission/${a.mission}`)}>
              <Text style={styles.appTitle}>{a.mission_title || 'Mission'}</Text>
              <Text style={styles.appMeta}>En attente de réponse du client</Text>
              {a.mission_budget ? <Text style={styles.appBudget}>{formatXOF(a.mission_budget)}</Text> : null}
            </Pressable>
          ))
        )
      ) : displayList.length === 0 && !loadError ? (
        <EmptyState
          title={isProvider ? 'Aucune mission en cours' : 'Aucune mission'}
          text={isProvider
            ? 'Postulez à des missions disponibles pour commencer à travailler'
            : isEnterprise && enterpriseTab === 'received'
              ? 'Postulez ou acceptez une sollicitation pour recevoir des missions'
              : "Vous n'avez pas encore créé de mission."}
          cta={isProvider || (isEnterprise && enterpriseTab === 'received')
            ? 'Trouver des missions'
            : 'Créer une mission'}
          onCta={() => router.push(
            isProvider || (isEnterprise && enterpriseTab === 'received')
              ? '/(tabs)/available'
              : '/create-mission',
          )}
        />
      ) : (
        displayList.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            showActions={isProvider && providerTab === 'active'}
            onChanged={reload}
          />
        ))
      )}
    </AppLayout>
  );
}

function EmptyState({
  title, text, cta, onCta,
}: { title: string; text: string; cta: string; onCta: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <Pressable style={styles.cta} onPress={onCta}>
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linkBtn: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  cta: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: 10 },
  ctaText: { color: '#fff', fontWeight: '700' },
  appCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  appTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  appMeta: { color: colors.warning, fontSize: 13, marginTop: 4 },
  appBudget: { color: colors.primary, fontWeight: '800', marginTop: 6, fontSize: 16 },
});
