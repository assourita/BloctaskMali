import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { applyToMission, getAvailableMissions } from '../../src/api/missions';
import { useAuth } from '../../src/context/AuthContext';
import { useScreenLoad } from '../../src/utils/useScreenLoad';
import { AvailableMissionCard } from '../../src/components/AvailableMissionCard';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { GreenBanner } from '../../src/components/providerWidgets';
import { colors } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';
import type { Mission } from '../../src/types';

export default function AvailableScreen() {
  const { activeRole } = useAuth();
  const asEnterprise = activeRole === 'enterprise';
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setMissions(await getAvailableMissions(undefined, undefined, asEnterprise));
  }, [asEnterprise]);

  const { loading, refreshing, refresh, reload } = useScreenLoad(loadData, [loadData]);

  const handleApply = (mission: Mission) => {
    Alert.alert('Postuler', `Envoyer votre candidature pour « ${mission.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Postuler',
        onPress: async () => {
          setApplyingId(mission.id);
          try {
            await applyToMission(mission.id, 'Via app mobile');
            Alert.alert('Succès', 'Candidature envoyée');
            await reload();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Candidature impossible');
          } finally {
            setApplyingId(null);
          }
        },
      },
    ]);
  };

  const pendingCount = missions.filter((m) => m.is_applied).length;

  return (
    <AppLayout scroll={false}>
      <GreenBanner
        title="Missions disponibles"
        subtitle={asEnterprise
          ? `${missions.length} mission(s) ouverte(s) pour votre entreprise`
          : `${missions.length} mission(s) ouverte(s)${pendingCount ? ` — inclut ${pendingCount} candidature(s) en attente` : ''}`}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AvailableMissionCard
              mission={item}
              onApply={() => handleApply(item)}
              applying={applyingId === item.id}
            />
          )}
          onRefresh={refresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune mission disponible pour le moment</Text>
            </View>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  list: { paddingBottom: 24 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted },
});
