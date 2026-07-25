import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getMyEnterpriseDetail,
  type ProviderEnterpriseDetail,
  type ProviderEnterpriseMission,
} from '../src/api/enterprise';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useAuth } from '../src/context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Acceptée',
  in_progress: 'En cours',
  submitted: 'Preuves soumises',
  funded: 'Financée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'En litige',
  expired: 'Expirée',
  pending: 'En attente',
};

type Filter = 'all' | 'in_progress' | 'completed' | 'other';

export default function MyEnterpriseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole } = useAuth();
  const [detail, setDetail] = useState<ProviderEnterpriseDetail | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (activeRole !== 'provider' || !id) return;
    const data = await getMyEnterpriseDetail(String(id));
    setDetail(data);
  }, [activeRole, id]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const missions = useMemo(() => {
    const list = detail?.missions || [];
    if (filter === 'all') return list;
    if (filter === 'other') return list.filter((m) => !['in_progress', 'completed'].includes(m.bucket));
    return list.filter((m) => m.bucket === filter);
  }, [detail, filter]);

  if (activeRole !== 'provider') {
    return (
      <AppLayout title="Entreprise" showBack>
        <Text style={styles.empty}>Réservé aux prestataires.</Text>
      </AppLayout>
    );
  }

  const m = detail?.membership;

  return (
    <AppLayout title={m?.enterprise_name || 'Entreprise'} showBack refreshing={refreshing} onRefresh={refresh}>
      {loading || !detail || !m ? (
        <Loader />
      ) : (
        <>
          <PageHeader
            title={m.enterprise_name}
            subtitle={`${m.position || ROLE_LABELS[m.role] || m.role} · ${m.is_active ? 'Actif' : 'Inactif'}`}
          />

          <View style={styles.stats}>
            <Stat label="Équipes" value={detail.stats.teams_count} />
            <Stat label="En cours" value={detail.stats.missions_in_progress} />
            <Stat label="Terminées" value={detail.stats.missions_completed} />
          </View>

          <SoftCard style={styles.block}>
            <Text style={styles.section}>Mon poste</Text>
            <Text style={styles.title}>{m.position || '—'}</Text>
            <Text style={styles.meta}>Rôle : {ROLE_LABELS[m.role] || m.role}</Text>
            {!!m.hired_at && (
              <Text style={styles.meta}>
                Membre depuis {new Date(m.hired_at).toLocaleDateString('fr-FR')}
              </Text>
            )}
            {!!m.enterprise?.city && (
              <Text style={styles.meta}>{m.enterprise.city}{m.enterprise.country ? `, ${m.enterprise.country}` : ''}</Text>
            )}
          </SoftCard>

          <SoftCard style={styles.block}>
            <Text style={styles.section}>Mes équipes</Text>
            {detail.teams.length === 0 ? (
              <Text style={styles.emptyInline}>Aucune équipe.</Text>
            ) : (
              detail.teams.map((t) => (
                <View key={t.id} style={styles.row}>
                  <Text style={styles.title}>{t.name}</Text>
                  <Text style={styles.meta}>
                    {t.is_manager ? 'Chef · ' : ''}
                    {t.category ? `${t.category} · ` : ''}
                    {t.members_count || 0} membre(s)
                  </Text>
                </View>
              ))
            )}
          </SoftCard>

          <SoftCard style={styles.block}>
            <Text style={styles.section}>Mes missions</Text>
            <View style={styles.filters}>
              {([
                ['all', 'Toutes'],
                ['in_progress', 'En cours'],
                ['completed', 'Terminées'],
                ['other', 'Autres'],
              ] as Array<[Filter, string]>).map(([key, label]) => (
                <Pressable
                  key={key}
                  style={[styles.chip, filter === key && styles.chipActive]}
                  onPress={() => setFilter(key)}
                >
                  <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {missions.length === 0 ? (
              <Text style={styles.emptyInline}>Aucune mission dans ce filtre.</Text>
            ) : (
              missions.map((mission: ProviderEnterpriseMission) => (
                <Pressable
                  key={mission.id}
                  style={styles.row}
                  onPress={() => router.push(`/mission/${mission.id}`)}
                >
                  <Text style={styles.title}>{mission.title}</Text>
                  <Text style={styles.meta}>
                    {STATUS_LABELS[mission.status] || mission.status}
                    {mission.is_lead ? ' · Chef' : ''}
                    {mission.budget ? ` · ${mission.budget} ${mission.currency || 'XOF'}` : ''}
                  </Text>
                </Pressable>
              ))
            )}
          </SoftCard>
        </>
      )}
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  block: { marginBottom: spacing.md },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  title: { fontWeight: '700', color: colors.text, fontSize: 14 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#166534' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  emptyInline: { color: colors.textMuted, fontSize: 13 },
});
