import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getMyMissions } from '../src/api/missions';
import { getLiveGpsLocations } from '../src/api/enterprise';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing, STATUS_META } from '../src/constants/theme';
import type { Mission } from '../src/types';

const TRACKABLE = ['accepted', 'in_progress', 'submitted'];

export default function TrackingScreen() {
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';
  const [missions, setMissions] = useState<Mission[]>([]);
  const [liveAgents, setLiveAgents] = useState<Array<{ id: string; mission: string; mission_title?: string; user_name?: string }>>([]);

  const loadData = useCallback(async () => {
    let all: Mission[];
    if (isEnterprise) {
      const [ordered, received] = await Promise.all([
        getMyMissions('enterprise'),
        getMyMissions('enterprise', 'received'),
      ]);
      all = [...ordered, ...received];
    } else {
      all = await getMyMissions(activeRole);
    }
    const trackable = all.filter((m) => TRACKABLE.includes(m.status));
    setMissions(trackable);
    if (isEnterprise && trackable.length > 0) {
      try {
        setLiveAgents(await getLiveGpsLocations());
      } catch {
        setLiveAgents([]);
      }
    } else {
      setLiveAgents([]);
    }
  }, [activeRole, isEnterprise]);

  const { loading, refreshing, refresh } = useScreenLoad(loadData, [loadData]);

  return (
    <AppLayout refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Suivi en temps réel"
        subtitle={isEnterprise ? 'Missions actives et positions agents' : 'Suivez la position en direct de vos missions'}
      />

      {isEnterprise && liveAgents.length > 0 && (
        <>
          <Text style={styles.section}>Agents en ligne ({liveAgents.length})</Text>
          {liveAgents.map((loc) => (
            <SoftCard key={loc.id}>
              <Text style={styles.title}>{loc.user_name || 'Agent'}</Text>
              <Text style={styles.meta}>{loc.mission_title || 'Mission active'}</Text>
              <Pressable style={styles.btn} onPress={() => router.push(`/tracking/${loc.mission}`)}>
                <Text style={styles.btnText}>Voir sur la carte</Text>
              </Pressable>
            </SoftCard>
          ))}
        </>
      )}

      {loading ? (
        <Loader />
      ) : missions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune mission active à suivre pour l'instant.</Text>
        </View>
      ) : (
        missions.map((m) => {
          const meta = STATUS_META[m.status] || { label: m.status, bg: '#f3f4f6', fg: '#6b7280' };
          return (
            <SoftCard key={m.id}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>{m.title}</Text>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                </View>
              </View>
              {m.delivery_address ? <Text style={styles.meta} numberOfLines={1}>{m.delivery_address}</Text> : null}
              <Pressable style={styles.btn} onPress={() => router.push(`/tracking/${m.id}`)}>
                <Text style={styles.btnText}>Voir sur la carte</Text>
              </Pressable>
            </SoftCard>
          );
        })
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  btn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700' },
});
