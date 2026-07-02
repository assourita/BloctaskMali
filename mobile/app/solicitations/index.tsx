import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  cancelSolicitation,
  getMySolicitations,
  getSentSolicitations,
} from '../../src/api/solicitations';
import { SecondaryButton } from '../../src/components/buttons';
import { Badge, Card, EmptyState, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader, TabBar } from '../../src/components/widgets';
import { formatXOF } from '../../src/constants/africa';
import { colors, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';
import type { MissionSolicitation } from '../../src/types';

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }> = {
  pending: { label: 'En attente', tone: 'warning' },
  accepted: { label: 'Acceptée', tone: 'success' },
  rejected: { label: 'Refusée', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'default' },
  expired: { label: 'Expirée', tone: 'default' },
};

type ProviderTab = 'pending' | 'accepted' | 'declined';
type ClientTab = 'all' | 'pending' | 'accepted' | 'declined';

export default function SolicitationsScreen() {
  const { activeRole } = useAuth();
  const isProvider = activeRole === 'provider';
  const isEnterprise = activeRole === 'enterprise';
  const isRecipient = isProvider || isEnterprise;
  const [items, setItems] = useState<MissionSolicitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [providerTab, setProviderTab] = useState<ProviderTab>('pending');
  const [clientTab, setClientTab] = useState<ClientTab>('all');

  const load = useCallback(async () => {
    try {
      const data = isProvider
        ? await getMySolicitations('provider')
        : isEnterprise
          ? await getMySolicitations('enterprise')
          : await getSentSolicitations();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isProvider, isEnterprise]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const pageTitle = isProvider
    ? 'Mes sollicitations'
    : isEnterprise
      ? 'Sollicitations reçues'
      : 'Sollicitations envoyées';
  const pageSubtitle = isProvider
    ? 'Missions pour lesquelles un client vous a sollicité directement'
    : isEnterprise
      ? 'Demandes clients adressées à votre entreprise'
      : 'Suivez les missions proposées à des prestataires ou entreprises';
  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const accepted = useMemo(() => items.filter((i) => i.status === 'accepted'), [items]);
  const declined = useMemo(
    () => items.filter((i) => ['rejected', 'cancelled', 'expired'].includes(i.status)),
    [items],
  );

  const filtered = isRecipient
    ? providerTab === 'pending'
      ? pending
      : providerTab === 'accepted'
        ? accepted
        : declined
    : clientTab === 'all'
      ? items
      : clientTab === 'pending'
        ? pending
        : clientTab === 'accepted'
          ? accepted
          : declined;

  const cancelClient = async (s: MissionSolicitation) => {
    setActing(s.id);
    try {
      await cancelSolicitation(s.id);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title={pageTitle} />
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout scroll={false}>
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />

      {isRecipient ? (
        <TabBar
          value={providerTab}
          onChange={(id) => setProviderTab(id as ProviderTab)}
          tabs={[
            { id: 'pending', label: 'En attente', count: pending.length },
            { id: 'accepted', label: 'Acceptées', count: accepted.length },
            { id: 'declined', label: 'Refusées / expirées', count: declined.length },
          ]}
        />
      ) : (
        <TabBar
          value={clientTab}
          onChange={(id) => setClientTab(id as ClientTab)}
          tabs={[
            { id: 'all', label: 'Toutes', count: items.length },
            { id: 'pending', label: 'En attente', count: pending.length },
            { id: 'accepted', label: 'Acceptées', count: accepted.length },
            { id: 'declined', label: 'Refusées', count: declined.length },
          ]}
        />
      )}

      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState message="Aucune sollicitation dans cette catégorie" />}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || { label: item.status, tone: 'default' as const };
          return (
            <Pressable
              onPress={isRecipient ? () => router.push(`/solicitations/${item.id}`) : undefined}
            >
              <Card>
                <View style={styles.top}>
                  <Text style={styles.title} numberOfLines={2}>{item.mission_title}</Text>
                  <Badge label={st.label} tone={st.tone} />
                </View>
                <Text style={styles.budget}>{formatXOF(item.mission_budget)}</Text>
                {(isProvider || isEnterprise) && item.client ? (
                  <Text style={styles.meta}>De : {item.client.first_name} {item.client.last_name}</Text>
                ) : null}
                {!isRecipient && item.provider ? (
                  <Text style={styles.meta}>Pour : {item.provider.first_name} {item.provider.last_name}</Text>
                ) : null}
                {!isRecipient && item.enterprise_name ? (
                  <Text style={styles.meta}>Entreprise : {item.enterprise_name}</Text>
                ) : null}
                {item.pickup_address ? (
                  <Text style={styles.meta} numberOfLines={1}>Départ : {item.pickup_address}</Text>
                ) : null}
                {item.message ? <Text style={styles.message}>{item.message}</Text> : null}

                {isRecipient ? (
                  <Text style={styles.detailLink}>Voir le détail pour accepter ou refuser ›</Text>
                ) : item.mission ? (
                  <Pressable onPress={() => router.push(`/mission/${item.mission}`)}>
                    <Text style={styles.detailLink}>Voir la mission ›</Text>
                  </Pressable>
                ) : null}

                {!isRecipient && item.status === 'pending' ? (
                  <View style={styles.actions}>
                    <SecondaryButton label="Annuler" onPress={() => cancelClient(item)} />
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontWeight: '700', fontSize: 16, color: colors.text },
  budget: { fontWeight: '800', fontSize: 18, color: colors.accent, marginVertical: 6 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  message: { marginTop: 8, color: colors.text, lineHeight: 20 },
  detailLink: { marginTop: spacing.sm, color: colors.primary, fontWeight: '700', fontSize: 13 },
  actions: { marginTop: spacing.sm },
});
