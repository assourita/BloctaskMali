import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  acceptApplication,
  getMissionApplications,
  rejectApplication,
} from '../src/api/applications';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { Badge, Card, EmptyState, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { formatXOF } from '../src/constants/africa';
import { REPUTATION_LEVEL_LABELS } from '../src/api/reputation';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { MissionApplication } from '../src/types';

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }> = {
  pending: { label: 'En attente', tone: 'warning' },
  accepted: { label: 'Acceptée', tone: 'success' },
  rejected: { label: 'Refusée', tone: 'danger' },
};

export default function ApplicationsScreen() {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const [apps, setApps] = useState<MissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!missionId) return;
    try {
      setApps(await getMissionApplications(missionId));
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [missionId]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = (app: MissionApplication) => {
    if (!missionId) return;
    Alert.alert('Accepter', `Assigner ${app.provider?.first_name} à la mission ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Accepter',
        onPress: async () => {
          setActing(app.id);
          try {
            await acceptApplication(missionId, app.id);
            Alert.alert('Succès', 'Prestataire assigné.');
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  };

  const reject = async (app: MissionApplication) => {
    setActing(app.id);
    try {
      await rejectApplication(app.id);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <AppLayout showBack title="Candidatures">
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Candidatures" scroll={false} contentStyle={{ flex: 1, paddingBottom: 0 }}>
      <PageHeader title="Candidatures" subtitle="Choisissez un prestataire pour votre mission" />

      <FlatList
        style={{ flex: 1 }}
        style={{ flex: 1 }}
        data={apps}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState message="Aucune candidature pour l'instant." />}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || { label: item.status, tone: 'default' as const };
          const p = item.provider;
          return (
            <Card>
              <View style={styles.top}>
                <Text style={styles.name}>
                  {p ? `${p.first_name} ${p.last_name}` : 'Prestataire'}
                </Text>
                <Badge label={st.label} tone={st.tone} />
              </View>
              {p && (
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{Math.round(p.reputation_score ?? 50)}/100</Text>
                  <Text style={styles.meta}>{p.completed_missions ?? 0} missions</Text>
                  {p.level ? <Text style={styles.meta}>{REPUTATION_LEVEL_LABELS[p.level] || p.level}</Text> : null}
                  {p.identity_verified ? <Text style={styles.verified}>KYC vérifié</Text> : null}
                </View>
              )}
              {item.proposed_price ? (
                <Text style={styles.price}>Prix proposé : {formatXOF(item.proposed_price)}</Text>
              ) : null}
              {item.message ? <Text style={styles.message}>{item.message}</Text> : null}

              {p?.id ? (
                <SecondaryButton
                  label="Voir le profil"
                  onPress={() => router.push(`/provider/${p.id}`)}
                />
              ) : null}

              {item.status === 'pending' && (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Accepter" loading={acting === item.id} onPress={() => accept(item)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Refuser" onPress={() => reject(item)} />
                  </View>
                </View>
              )}
            </Card>
          );
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '700', fontSize: 16, color: colors.text, flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  meta: { color: colors.textMuted, fontSize: 13 },
  verified: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  price: { marginTop: 8, fontWeight: '700', color: colors.accent },
  message: { marginTop: 8, color: colors.text, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
