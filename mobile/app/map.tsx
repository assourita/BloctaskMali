import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { getMapPresence, getMapUserDetail, updateMapLocation, type MapUser } from '../src/api/map';
import { ApiError } from '../src/api/client';
import { BlockTaskMap, type BlockTaskMapHandle } from '../src/components/BlockTaskMap';
import { MapUserSheet } from '../src/components/MapUserSheet';
import { NetworkBanner } from '../src/components/NetworkBanner';
import { Input } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';

export default function MapScreen() {
  const mapRef = useRef<BlockTaskMapHandle>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState({ lat: 12.6392, lng: -8.0029 });
  const [users, setUsers] = useState<MapUser[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [focusUserId, setFocusUserId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      let coords: { lat: number; lng: number } | null = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(coords);
        try {
          await updateMapLocation(coords.lat, coords.lng);
        } catch {
          /* sync optionnelle */
        }
      }

      const data = await getMapPresence(q);
      setCenter(coords || data.center);
      setUsers(data.users);
    } catch (e) {
      setUsers([]);
      setError(e instanceof ApiError ? e.message : 'Impossible de charger la carte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(search);
      load(search.trim() || undefined);
    }, 400);
    return () => clearTimeout(t);
  }, [search, load]);

  const linkedUsers = useMemo(
    () => users.filter((u) => u.mission_link),
    [users],
  );

  const openUser = useCallback(async (user: MapUser) => {
    try {
      const detail = await getMapUserDetail(user.id);
      setSelectedUser(detail);
    } catch {
      setSelectedUser(user);
    }
  }, []);

  const focusUser = useCallback((user: MapUser) => {
    setFocusUserId(user.id);
    mapRef.current?.focusUser(user.id, user.latitude, user.longitude);
  }, []);

  return (
    <AppLayout scroll={false} title="Carte BlockTask" contentStyle={{ flex: 1, paddingBottom: spacing.md + 78 }}>
      <Input
        placeholder="Rechercher un utilisateur (nom, ville…)"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.legendRow}>
        <Text style={styles.legendItem}>🔵 Client</Text>
        <Text style={styles.legendItem}>🟢 Prestataire</Text>
        <Text style={styles.legendItem}>🟣 Entreprise</Text>
        <Text style={styles.legendItem}>🟡 Mission en cours</Text>
      </View>

      {linkedUsers.length > 0 ? (
        <Text style={styles.linkedHint}>
          {linkedUsers.length} contact{linkedUsers.length > 1 ? 's' : ''} lié{linkedUsers.length > 1 ? 's' : ''} par une mission active
        </Text>
      ) : null}

      {error ? <NetworkBanner message={error} onRetry={() => load(searchQuery || undefined)} /> : null}

      <View style={styles.mapBox}>
        {loading && !users.length ? (
          <Loader />
        ) : error && !users.length ? (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>La carte s'affichera dès que le serveur sera accessible.</Text>
          </View>
        ) : (
          <BlockTaskMap
            ref={mapRef}
            center={center}
            users={users}
            myLocation={myLocation}
            focusUserId={focusUserId}
            onUserPress={openUser}
          />
        )}
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => setShowList((v) => !v)}>
          <Text style={styles.toolBtnText}>{showList ? 'Masquer liste' : `Liste (${users.length})`}</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => load(searchQuery || undefined)}>
          <Text style={styles.toolBtnText}>Actualiser</Text>
        </Pressable>
      </View>

      {showList ? (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.listItem, item.mission_link && styles.listItemLinked]}
              onPress={() => openUser(item)}
            >
              <View style={styles.listMain}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listMeta}>
                  {item.city || 'Mali'}
                  {item.mission_link ? ` · ${item.mission_link.mission_title}` : ''}
                </Text>
              </View>
              <Text style={styles.listChevron}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyList}>Aucun utilisateur trouvé</Text>
          }
        />
      ) : null}

      <MapUserSheet
        user={selectedUser}
        myLocation={myLocation}
        onClose={() => setSelectedUser(null)}
        onFocus={focusUser}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: spacing.sm,
  },
  legendItem: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  linkedHint: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  mapBox: { flex: 1, minHeight: 280, marginBottom: spacing.sm },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fallbackText: { color: colors.textMuted, textAlign: 'center' },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  toolBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toolBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  list: { maxHeight: 200, marginBottom: spacing.sm },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  listItemLinked: { backgroundColor: '#fffbeb' },
  listMain: { flex: 1 },
  listName: { fontWeight: '700', fontSize: 14, color: colors.text },
  listMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listChevron: { fontSize: 20, color: colors.textMuted },
  emptyList: { textAlign: 'center', color: colors.textMuted, padding: spacing.md },
});
