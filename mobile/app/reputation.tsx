import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getMyReputation,
  getReputationHistory,
  REPUTATION_LEVEL_COLORS,
  REPUTATION_LEVEL_LABELS,
} from '../src/api/reputation';
import { Card, EmptyState, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { colors, spacing } from '../src/constants/theme';
import type { ReputationHistoryItem, ReputationScore } from '../src/types';

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.barValue}>{value.toFixed(0)}/{max}</Text>
    </View>
  );
}

export default function ReputationScreen() {
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [history, setHistory] = useState<ReputationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getMyReputation();
      setScore(s);
      if (s?.id) setHistory(await getReputationHistory(s.id));
    } catch {
      setScore(null);
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
      <AppLayout showBack title="Réputation">
        <Loader />
      </AppLayout>
    );
  }

  if (!score) {
    return (
      <AppLayout showBack title="Réputation">
        <PageHeader title="Réputation" subtitle="Votre score de confiance BlockTask" />
        <EmptyState message="Aucun score pour le moment. Terminez des missions pour bâtir votre réputation." />
      </AppLayout>
    );
  }

  const levelColor = REPUTATION_LEVEL_COLORS[score.level] || colors.accent;

  return (
    <AppLayout
      showBack
      title="Réputation"
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader title="Réputation" subtitle="Votre score de confiance BlockTask" />

      <Card style={[styles.hero, { borderColor: levelColor }]}>
          <Text style={[styles.score, { color: levelColor }]}>{Math.round(score.overall_score)}</Text>
          <Text style={styles.scoreMax}>/ 100</Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{REPUTATION_LEVEL_LABELS[score.level] || score.level}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Composantes du score</Text>
          <Bar label="Taux de réussite" value={score.success_rate_score ?? 0} max={40} />
          <Bar label="Évaluations" value={score.rating_score ?? 0} max={30} />
          <Bar label="Litiges" value={score.dispute_score ?? 0} max={20} />
          <Bar label="Volume" value={score.volume_score ?? 0} max={10} />
        </Card>

        <View style={styles.grid}>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{score.successful_missions}</Text>
            <Text style={styles.statLabel}>Missions réussies</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{score.average_rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>{score.rating_count} avis</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(score.on_time_rate)}%</Text>
            <Text style={styles.statLabel}>Ponctualité</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{score.dispute_count}</Text>
            <Text style={styles.statLabel}>Litiges</Text>
          </Card>
        </View>

        {history.length > 0 && (
          <>
            <Text style={styles.section}>Historique récent</Text>
            {history.slice(0, 15).map((h) => (
              <Card key={h.id} style={styles.histItem}>
                <View style={styles.row}>
                  <Text style={styles.histDesc} numberOfLines={2}>{h.description}</Text>
                  <Text style={[styles.histChange, h.change_amount >= 0 ? styles.up : styles.down]}>
                    {h.change_amount >= 0 ? '+' : ''}{h.change_amount.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.histDate}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</Text>
              </Card>
            ))}
          </>
        )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', borderWidth: 2 },
  score: { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  scoreMax: { color: colors.textMuted, marginTop: -6 },
  levelBadge: { marginTop: spacing.sm, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  levelText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
  section: { fontWeight: '700', fontSize: 16, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 110, fontSize: 12, color: colors.textMuted },
  barTrack: { flex: 1, height: 8, backgroundColor: '#eef2f7', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary, borderRadius: 999 },
  barValue: { width: 48, textAlign: 'right', fontSize: 11, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  stat: { width: '47%' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.accent },
  statLabel: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  histItem: { paddingVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  histDesc: { flex: 1, color: colors.text, fontSize: 14 },
  histChange: { fontWeight: '800', fontSize: 15 },
  up: { color: '#059669' },
  down: { color: colors.danger },
  histDate: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});
