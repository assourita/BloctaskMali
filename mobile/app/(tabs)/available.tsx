import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getAvailableMissions } from '../../src/api/missions';
import { useAuth } from '../../src/context/AuthContext';
import { useScreenLoad, useFocusReload } from '../../src/utils/useScreenLoad';
import { AvailableMissionCard } from '../../src/components/AvailableMissionCard';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { GreenBanner } from '../../src/components/providerWidgets';
import { colors } from '../../src/constants/theme';
import type { Mission } from '../../src/types';

export default function AvailableScreen() {
  const { activeRole } = useAuth();
  const asEnterprise = activeRole === 'enterprise';
  const [missions, setMissions] = useState<Mission[]>([]);

  const loadData = useCallback(async () => {
    setMissions(await getAvailableMissions(undefined, undefined, asEnterprise, true));
  }, [asEnterprise]);

  const { loading, refreshing, refresh, reload } = useScreenLoad(loadData, [loadData]);
  useFocusReload(reload);

  const pendingCount = missions.filter((m) => m.is_applied).length;

  return (
    <AppLayout scroll={false}>
      <GreenBanner
        title="Missions disponibles"
        subtitle={asEnterprise
          ? `${missions.length} mission(s) ouverte(s) pour votre entreprise`
          : `${missions.length} mission(s) ouverte(s)${pendingCount ? ` — ${pendingCount} candidature(s) en attente` : ''}`}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AvailableMissionCard mission={item} />}
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
  loader: { marginTop: 40 },
  list: { paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
