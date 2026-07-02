import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getStats } from '../src/api/missions';
import { getPayments } from '../src/api/payments';
import { getWalletTransactions, type WalletTransaction } from '../src/api/wallet';
import { Badge, EmptyState, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, StatGrid } from '../src/components/widgets';
import { formatXOF } from '../src/constants/africa';
import { colors, spacing } from '../src/constants/theme';
import type { MissionStats, Payment } from '../src/types';

export default function EarningsScreen() {
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, w] = await Promise.all([
        getStats('provider'),
        getPayments(),
        getWalletTransactions().catch(() => []),
      ]);
      setStats(s);
      setPayments(p.filter((x) => x.status === 'completed'));
      setWalletTxs(w);
    } catch {
      setStats(null);
      setPayments([]);
      setWalletTxs([]);
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
      <AppLayout title="Mes revenus" showBack>
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Mes revenus"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader
        title="Mes revenus"
        subtitle="Paiements reçus et historique wallet"
        action={
          <Pressable onPress={() => { setRefreshing(true); load(); }}>
            <Text style={styles.refresh}>Actualiser</Text>
          </Pressable>
        }
      />

      <StatGrid
        items={[
          { value: formatXOF(stats?.total_earned ?? 0), label: 'Total gagné (XOF)', tint: '#0f3460' },
          { value: stats?.completed_missions ?? 0, label: 'Missions terminées', tint: colors.accent },
          { value: stats?.active_missions ?? 0, label: 'En cours', tint: colors.info },
          { value: walletTxs.length, label: 'Transactions wallet', tint: colors.warning },
        ]}
      />

      <SoftCard>
        <Text style={styles.sectionTitle}>Paiements missions</Text>
        {payments.length === 0 ? (
          <EmptyState message="Aucun paiement pour le moment" />
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.txItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txAmount}>+{formatXOF(p.provider_amount || p.amount)}</Text>
                <Text style={styles.txMeta}>
                  Mission · {new Date(p.created_at).toLocaleString('fr-FR')}
                </Text>
              </View>
              <Badge label={p.status} tone="success" />
            </View>
          ))
        )}
      </SoftCard>

      <SoftCard>
        <Text style={styles.sectionTitle}>Transactions wallet</Text>
        {walletTxs.length === 0 ? (
          <EmptyState message="Aucune transaction wallet" />
        ) : (
          walletTxs.map((t) => (
            <View key={t.id} style={styles.txItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txAmount}>{formatXOF(Number(t.amount))}</Text>
                <Text style={styles.txMeta}>
                  {t.description || t.transaction_type} · {new Date(t.created_at).toLocaleString('fr-FR')}
                </Text>
              </View>
              <Badge label={t.status} tone="default" />
            </View>
          ))
        )}
      </SoftCard>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  refresh: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  txItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  txAmount: { fontWeight: '800', fontSize: 16, color: colors.primary },
  txMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
