import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DISPUTE_STATUS_LABELS, getMyDisputes } from '../../src/api/disputes';
import { Badge, Card, EmptyState, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/widgets';
import { colors, spacing } from '../../src/constants/theme';
import type { Dispute } from '../../src/types';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  open: 'warning',
  under_review: 'info',
  pending_evidence: 'warning',
  arbitration: 'info',
  resolved: 'success',
  closed: 'default',
};

export default function DisputesScreen() {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getMyDisputes());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Litiges" subtitle="Suivi de vos réclamations" />
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout scroll={false}>
      <PageHeader title="Litiges" subtitle="Suivi de vos réclamations" />

      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState message="Aucun litige. Tout va bien !" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/disputes/${item.id}`)}>
            <Card>
              <View style={styles.top}>
                <Text style={styles.title} numberOfLines={2}>{item.mission_title}</Text>
                <Badge label={DISPUTE_STATUS_LABELS[item.status] || item.status} tone={STATUS_TONE[item.status] || 'default'} />
              </View>
              <Text style={styles.reason}>{item.description}</Text>
              <Text style={styles.meta}>
                {item.evidence_count ?? 0} preuve(s) • {new Date(item.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontWeight: '700', fontSize: 16, color: colors.text },
  reason: { color: colors.text, marginTop: 6, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
