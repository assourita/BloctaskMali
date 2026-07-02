import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../constants/theme';

export type EnterpriseMissionsSection = 'ordered' | 'received' | 'create';

const ITEMS: { id: EnterpriseMissionsSection; label: string; href: string }[] = [
  { id: 'ordered', label: 'Missions commandées', href: '/(tabs)/missions' },
  { id: 'received', label: 'Missions reçues', href: '/(tabs)/missions?tab=received' },
  { id: 'create', label: 'Nouvelle mission', href: '/create-mission' },
];

export function EnterpriseMissionsNav({ active }: { active: EnterpriseMissionsSection }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push(item.href as never)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
});
