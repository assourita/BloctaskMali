import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getMyMissions } from '../src/api/missions';
import {
  getAvailability,
  getEmployees,
  getLiveGpsLocations,
  type EmployeeAvailability,
  type LiveGpsLocation,
} from '../src/api/enterprise';
import type { MapUser } from '../src/api/map';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { BlockTaskMap } from '../src/components/BlockTaskMap';
import { Loader } from '../src/components/ui';
import { colors, spacing, STATUS_META } from '../src/constants/theme';
import type { Mission } from '../src/types';

const TRACKABLE = ['accepted', 'in_progress', 'submitted'];
const BAMAKO = { lat: 12.6392, lng: -8.0029 };

/** Positions estimées autour de Bamako quand GPS absent */
const FALLBACK_OFFSETS = [
  { lat: 0.02, lng: 0.01 },
  { lat: -0.015, lng: 0.025 },
  { lat: 0.03, lng: -0.02 },
  { lat: -0.025, lng: -0.015 },
  { lat: 0.01, lng: -0.03 },
];

export default function TrackingScreen() {
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';
  const [missions, setMissions] = useState<Mission[]>([]);
  const [liveAgents, setLiveAgents] = useState<LiveGpsLocation[]>([]);
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);
  const [mapUsers, setMapUsers] = useState<MapUser[]>([]);

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

    if (isEnterprise) {
      try {
        const [live, avail, employees] = await Promise.all([
          getLiveGpsLocations().catch(() => [] as LiveGpsLocation[]),
          getAvailability().catch(() => [] as EmployeeAvailability[]),
          getEmployees().catch(() => []),
        ]);
        setLiveAgents(live);
        setAvailability(avail);

        const liveByUser = new Map<string, LiveGpsLocation>();
        for (const loc of live) {
          const uid = loc.user?.id;
          if (uid) liveByUser.set(String(uid), loc);
        }
        const availByEmp = new Map(avail.map((a) => [String(a.employee), a]));
        const active = employees.filter((e) => e.is_active !== false);

        const users: MapUser[] = active.map((emp, index) => {
          const a = availByEmp.get(emp.id);
          const linkedUserId = emp.user || undefined;
          const live = linkedUserId ? liveByUser.get(String(linkedUserId)) : undefined;
          const offset = FALLBACK_OFFSETS[index % FALLBACK_OFFSETS.length];
          const lat = live?.latitude
            ?? a?.current_latitude
            ?? BAMAKO.lat + offset.lat;
          const lng = live?.longitude
            ?? a?.current_longitude
            ?? BAMAKO.lng + offset.lng;
          const hasReal = !!(live || (a?.current_latitude != null && a?.current_longitude != null));
          const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ')
            || a?.employee_name
            || 'Agent';
          return {
            id: emp.id,
            name,
            first_name: emp.first_name || name,
            last_name: emp.last_name || '',
            user_type: 'provider' as const,
            latitude: Number(lat),
            longitude: Number(lng),
            city: '',
            source: hasReal ? 'gps' as const : 'city' as const,
            location_precision: hasReal ? 'exact' as const : 'approximate' as const,
            is_live: !!live,
            mission_link: live?.mission
              ? {
                  mission_id: live.mission,
                  mission_title: live.mission_title || a?.mission_title || '',
                  mission_status: 'in_progress',
                  mission_count: 1,
                  can_contact: true,
                  can_navigate: true,
                  can_see_exact_location: true,
                }
              : a?.current_mission
                ? {
                    mission_id: String(a.current_mission),
                    mission_title: a.mission_title || '',
                    mission_status: a.status || '',
                    mission_count: 1,
                    can_contact: true,
                    can_navigate: true,
                    can_see_exact_location: hasReal,
                  }
                : null,
          };
        });
        setMapUsers(users);
      } catch {
        setLiveAgents([]);
        setAvailability([]);
        setMapUsers([]);
      }
    } else {
      setLiveAgents([]);
      setAvailability([]);
      setMapUsers([]);
    }
  }, [activeRole, isEnterprise]);

  const { loading, refreshing, refresh } = useScreenLoad(loadData, [loadData]);

  const mapCenter = useMemo(() => {
    const live = mapUsers.find((u) => u.is_live);
    if (live) return { lat: live.latitude, lng: live.longitude };
    if (mapUsers[0]) return { lat: mapUsers[0].latitude, lng: mapUsers[0].longitude };
    return BAMAKO;
  }, [mapUsers]);

  const availableCount = availability.filter((a) => a.status === 'available').length;
  const liveCount = mapUsers.filter((u) => u.is_live).length;

  return (
    <AppLayout refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Suivi en temps réel"
        subtitle={
          isEnterprise
            ? 'Carte de tous les agents actifs (GPS live / connu / estimé)'
            : 'Suivez la position en direct de vos missions'
        }
      />

      {isEnterprise && (
        <>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{mapUsers.length} agent(s)</Text>
            <Text style={styles.stat}>{liveCount} live</Text>
            <Text style={styles.stat}>{availableCount} dispo.</Text>
          </View>
          <View style={styles.mapBox}>
            {loading ? <Loader /> : <BlockTaskMap center={mapCenter} users={mapUsers} />}
          </View>
        </>
      )}

      {isEnterprise && liveAgents.length > 0 && (
        <>
          <Text style={styles.section}>Agents en mission ({liveAgents.length})</Text>
          {liveAgents.map((loc) => (
            <SoftCard key={loc.id}>
              <Text style={styles.title}>{loc.user_name || 'Agent'}</Text>
              <Text style={styles.meta}>{loc.mission_title || 'Mission active'}</Text>
              <Pressable style={styles.btn} onPress={() => router.push(`/tracking/${loc.mission}`)}>
                <Text style={styles.btnText}>Voir détail mission</Text>
              </Pressable>
            </SoftCard>
          ))}
        </>
      )}

      {loading && !isEnterprise ? (
        <Loader />
      ) : missions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {isEnterprise
              ? mapUsers.length === 0
                ? 'Aucun employé actif à afficher.'
                : 'Aucune mission active — la carte montre vos agents.'
              : 'Aucune mission active à suivre pour l\'instant.'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.section}>Missions suivables ({missions.length})</Text>
          {missions.map((m) => {
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
          })}
        </>
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.sm },
  stat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  mapBox: { height: 300, marginBottom: spacing.md, borderRadius: 16, overflow: 'hidden' },
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
