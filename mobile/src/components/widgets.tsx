import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';

/** Bannière verte de bienvenue (dashboard). */
export function WelcomeBanner({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Bonjour {name}</Text>
      <Text style={styles.bannerSubtitle}>
        {subtitle ?? 'Bienvenue sur votre tableau de bord BlockTask'}
      </Text>
    </View>
  );
}

/** En-tête de page (titre + sous-titre), comme le web. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export interface StatItem {
  value: string | number;
  label: string;
  tint?: string;
}

/** Grille de cartes statistiques (2 par ligne) avec accent de couleur sobre. */
export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <View style={styles.statGrid}>
      {items.map((it, i) => (
        <View key={i} style={[styles.statCard, shadow]}>
          <View style={[styles.statAccent, { backgroundColor: it.tint ?? colors.primary }]} />
          <Text style={[styles.statValue, it.tint ? { color: it.tint } : null]}>{it.value}</Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Barre d'onglets simples (filtres missions). */
export function TabBar({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBar}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t.label}
              {t.count != null ? ` ${t.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Bloc carte générique avec ombre (web-like). */
export function SoftCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.softCard, shadow, style]}>{children}</View>;
}

/** Stepper horizontal de progression de mission. */
export function ProgressStepper({
  steps,
  current,
}: {
  steps: string[];
  current: number; // index 0-based de l'étape active
}) {
  return (
    <View style={styles.stepper}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.stepWrap}>
            <View style={styles.stepRow}>
              {i > 0 ? <View style={[styles.stepLine, done || active ? styles.stepLineDone : null]} /> : <View style={styles.stepLine} />}
              <View
                style={[
                  styles.stepCircle,
                  done && styles.stepCircleDone,
                  active && styles.stepCircleActive,
                ]}
              >
                <Text style={[styles.stepNum, (done || active) && { color: '#fff' }]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              {i < steps.length - 1 ? <View style={[styles.stepLine, done ? styles.stepLineDone : null]} /> : <View style={styles.stepLine} />}
            </View>
            <Text style={[styles.stepLabel, active && { color: colors.accent, fontWeight: '700' }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bannerSubtitle: { color: '#eafff3', fontSize: 14, marginTop: 6 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    width: '47.6%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statAccent: { width: 28, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  tabBarScroll: { marginBottom: spacing.md, flexGrow: 0 },
  tabBar: { flexDirection: 'row', gap: spacing.xs, paddingBottom: 2 },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  softCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  stepper: { flexDirection: 'row', justifyContent: 'space-between' },
  stepWrap: { flex: 1, alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.accent },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepCircleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  stepLabel: { fontSize: 10.5, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
});
