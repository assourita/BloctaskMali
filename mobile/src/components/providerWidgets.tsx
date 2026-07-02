import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatXOF } from '../constants/africa';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { REPUTATION_LEVEL_LABELS } from '../api/reputation';

const LEVEL_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#94a3b8',
  gold: '#eab308',
  platinum: '#6366f1',
  diamond: '#06b6d4',
};

/** Carte revenus prestataire (dashboard web). */
export function ProviderEarningsCard({
  totalEarned,
  completedMissions,
  averageRating,
  responseTime,
  level,
  reputationScore,
}: {
  totalEarned: number;
  completedMissions: number;
  averageRating: number;
  responseTime: string;
  level?: string;
  reputationScore?: number;
}) {
  const lvl = (level || 'bronze').toLowerCase();
  const levelColor = LEVEL_COLORS[lvl] || colors.accent;

  return (
    <View style={[styles.earningsCard, shadow]}>
      <View style={styles.earningsMain}>
        <Text style={styles.earningsTitle}>Mes revenus</Text>
        <Text style={styles.earningsAmount}>{formatXOF(totalEarned)}</Text>
        <Text style={styles.earningsLabel}>Gagnés ce mois</Text>
        <View style={styles.statsRow}>
          <MiniStat value={String(completedMissions)} label="Missions" />
          <MiniStat value={averageRating.toFixed(1)} label="Note moyenne" />
          <MiniStat value={responseTime} label="Temps réponse" />
        </View>
      </View>
      <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.levelName}>{REPUTATION_LEVEL_LABELS[lvl] || level || 'Bronze'}</Text>
        <Text style={styles.levelScore}>{Math.round(reputationScore ?? 50)}/100</Text>
      </View>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

/** Toggle disponibilité prestataire. */
export function AvailabilityCard({
  isAvailable,
  loading,
  onToggle,
}: {
  isAvailable: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.availCard, shadow]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.availTitle}>Disponibilité</Text>
        <Text style={styles.availDesc}>Activez pour recevoir des missions automatiquement</Text>
      </View>
      <Pressable
        style={[styles.availBtn, isAvailable ? styles.availOn : styles.availOff, loading && { opacity: 0.6 }]}
        onPress={onToggle}
        disabled={loading}
      >
        <Text style={[styles.availBtnText, isAvailable && styles.availBtnTextOn]}>
          {isAvailable ? 'Disponible' : 'Indisponible'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Bannière verte type web (missions disponibles, etc.). */
export function GreenBanner({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.greenBanner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.greenSub}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.greenAction} onPress={onAction}>
          <Text style={styles.greenActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  earningsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
  earningsMain: { flex: 1 },
  earningsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  earningsAmount: { fontSize: 28, fontWeight: '800', color: colors.text },
  earningsLabel: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.lg },
  miniStat: { alignItems: 'flex-start' },
  miniValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  miniLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  levelBadge: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  levelName: { color: '#fff', fontWeight: '800', fontSize: 13, textTransform: 'capitalize' },
  levelScore: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 4, fontWeight: '600' },

  availCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  availTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  availDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  availBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  availOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  availOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  availBtnText: { fontWeight: '700', fontSize: 13, color: colors.textMuted },
  availBtnTextOn: { color: '#fff' },

  greenBanner: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greenTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  greenSub: { fontSize: 13, color: '#eafff3', marginTop: 4 },
  greenAction: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  greenActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
