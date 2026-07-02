import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { getEnterpriseAnalytics } from '../src/api/enterprise';
import { Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, StatGrid, SoftCard } from '../src/components/widgets';
import { formatXOF } from '../src/constants/africa';
import { colors, spacing } from '../src/constants/theme';

export default function AnalyticsScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getEnterpriseAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getEnterpriseAnalytics());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load]);

  if (loading) {
    return <AppLayout title="Analytics" showBack><Loader /></AppLayout>;
  }

  return (
    <AppLayout
      title="Analytics"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader title="Analytics" subtitle="Indicateurs de performance de votre entreprise" />

      <StatGrid
        items={[
          { value: data?.missions_total ?? 0, label: 'Missions totales', tint: colors.accent },
          { value: data?.missions_active ?? 0, label: 'Actives', tint: colors.info },
          { value: data?.missions_completed ?? 0, label: 'Terminées', tint: colors.success },
          { value: data?.employees_count ?? 0, label: 'Employés', tint: colors.warning },
        ]}
      />

      <SoftCard>
        <Text style={styles.label}>Dépenses totales</Text>
        <Text style={styles.value}>{formatXOF(data?.spent_total ?? 0)}</Text>
        <Text style={styles.sub}>Ce mois : {formatXOF(data?.spent_this_month ?? 0)}</Text>
      </SoftCard>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  value: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
});
