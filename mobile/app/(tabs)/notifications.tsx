import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  type AppNotification,
} from '../../src/api/notifications';
import { PrimaryButton } from '../../src/components/buttons';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/widgets';
import { colors, spacing } from '../../src/constants/theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setItems(list);
      setUnread(count);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onMarkAll = async () => {
    await markAllRead();
    await load();
  };

  const onOpen = async (n: AppNotification) => {
    if (!n.is_read) {
      await markRead(n.id);
      await load();
    }
    if (n.mission_id) {
      router.push(`/mission/${n.mission_id}`);
    }
  };

  return (
    <AppLayout scroll={false}>
      <PageHeader title="Notifications" subtitle={unread > 0 ? `${unread} non lue(s)` : 'Tout est à jour'} />

      {unread > 0 && <PrimaryButton label="Tout marquer comme lu" onPress={onMarkAll} />}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={{ flex: 1, marginTop: spacing.sm }}
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, !item.is_read && styles.unread]}
              onPress={() => onOpen(item)}
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMsg}>{item.message}</Text>
              <Text style={styles.itemTime}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune notification</Text>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, backgroundColor: '#f0faf4' },
  itemTitle: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  itemMsg: { color: colors.textMuted, fontSize: 14 },
  itemTime: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
