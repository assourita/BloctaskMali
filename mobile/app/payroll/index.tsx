import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  approvePayrollPeriod,
  deletePayrollPeriod,
  generatePayrollPeriod,
  getPayrollDashboard,
  getPayrollPeriods,
  payPayrollPeriod,
  resetPayrollSettings,
  updatePayrollPeriod,
  updatePayrollSettings,
  type EnterprisePayrollSettings,
  type PayrollDashboard,
  type PayrollPeriod,
} from '../../src/api/enterprise';
import { ApiError } from '../../src/api/client';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader, SoftCard, StatGrid, TabBar } from '../../src/components/widgets';
import { Loader } from '../../src/components/ui';
import { formatXOF } from '../../src/constants/africa';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useEnterpriseGuard } from '../../src/hooks/useEnterpriseGuard';
import { useScreenLoad } from '../../src/utils/useScreenLoad';

type TabKey = 'employees' | 'history' | 'periods' | 'settings';

const PERIOD_STATUS: Record<string, string> = {
  draft: 'Brouillon',
  pending_approval: 'À valider',
  approved: 'Approuvée',
  paid: 'Payée',
  cancelled: 'Annulée',
};

export default function EnterprisePayrollScreen() {
  const { allowed, redirect } = useEnterpriseGuard();
  const [tab, setTab] = useState<TabKey>('employees');
  const [dash, setDash] = useState<PayrollDashboard | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [settings, setSettings] = useState<EnterprisePayrollSettings | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    period_start: '',
    period_end: '',
    frequency: 'weekly',
    payment_mode: 'manual',
    notes: '',
  });

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([getPayrollDashboard(), getPayrollPeriods()]);
    setDash(d);
    setPeriods(p);
    setSettings({ ...d.settings });
  }, []);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const employees = useMemo(() => {
    const list = dash?.employees || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.position}`.toLowerCase().includes(q),
    );
  }, [dash, search]);

  if (!allowed) return redirect;

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      Alert.alert('OK', okMsg);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Salaires" showBack refreshing={refreshing} onRefresh={refresh}>
      {loading || !dash || !settings ? (
        <Loader />
      ) : (
        <>
          <PageHeader title="Salaires & paie" subtitle="Gains, périodes et règles de redistribution" />

          <StatGrid
            items={[
              { value: formatXOF(Number(dash.summary.pending_total)), label: 'À verser', tint: colors.warning },
              { value: formatXOF(Number(dash.summary.paid_total)), label: 'Payé', tint: colors.success },
              { value: formatXOF(Number(dash.summary.lifetime_total)), label: 'Cumulé', tint: colors.accent },
              { value: String(dash.summary.active_employees), label: 'Actifs', tint: colors.info },
            ]}
          />

          <PrimaryButton
            label="Générer la période"
            loading={busy}
            onPress={() => run(async () => { await generatePayrollPeriod(); setTab('periods'); }, 'Période générée')}
          />

          <TabBar
            tabs={[
              { id: 'employees', label: 'Employés' },
              { id: 'history', label: 'Historique' },
              { id: 'periods', label: 'Périodes' },
              { id: 'settings', label: 'Règles' },
            ]}
            value={tab}
            onChange={(k) => setTab(k as TabKey)}
          />

          {tab === 'employees' && (
            <View style={styles.block}>
              <TextInput
                style={styles.input}
                placeholder="Rechercher un employé…"
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.textMuted}
              />
              {employees.length === 0 ? (
                <Text style={styles.empty}>Aucun employé</Text>
              ) : (
                employees.map((e) => (
                  <Pressable
                    key={e.employee_id}
                    style={styles.card}
                    onPress={() => router.push(`/payroll/${e.employee_id}`)}
                  >
                    <Text style={styles.title}>{e.first_name} {e.last_name}</Text>
                    <Text style={styles.meta}>
                      {e.position || 'Agent'} · coef. {e.pay_weight} ·
                      solo {e.solo_missions} / équipe {e.team_missions}
                    </Text>
                    <Text style={styles.pending}>En attente {formatXOF(Number(e.earnings_pending))}</Text>
                    <Text style={styles.meta}>Payé {formatXOF(Number(e.earnings_paid))}</Text>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {tab === 'history' && (
            <View style={styles.block}>
              {(dash.payment_history || []).length === 0 ? (
                <Text style={styles.empty}>Aucun paiement</Text>
              ) : (
                dash.payment_history.map((h) => (
                  <SoftCard key={h.id} style={styles.card}>
                    <Text style={styles.title}>{h.employee_name}</Text>
                    <Text style={styles.meta}>
                      {h.period_start} → {h.period_end} · {h.missions_count} mission(s)
                    </Text>
                    <Text style={styles.amount}>{formatXOF(Number(h.net_amount))}</Text>
                    <Text style={styles.meta}>{h.paid_at ? new Date(h.paid_at).toLocaleString('fr-FR') : '—'} · {h.payment_reference || ''}</Text>
                  </SoftCard>
                ))
              )}
            </View>
          )}

          {tab === 'periods' && (
            <View style={styles.block}>
              {periods.length === 0 ? (
                <Text style={styles.empty}>Aucune période — générez-en une</Text>
              ) : (
                periods.map((p) => (
                  <SoftCard key={p.id} style={styles.card}>
                    <Text style={styles.title}>{p.period_start} → {p.period_end}</Text>
                    <Text style={styles.meta}>
                      {PERIOD_STATUS[p.status] || p.status} · {p.frequency} · {p.employees_count} emp. · {formatXOF(Number(p.total_amount))}
                    </Text>

                    {editingId === p.id && (
                      <View style={styles.editBox}>
                        <TextInput style={styles.input} value={editForm.period_start} onChangeText={(v) => setEditForm((f) => ({ ...f, period_start: v }))} placeholder="Début YYYY-MM-DD" />
                        <TextInput style={styles.input} value={editForm.period_end} onChangeText={(v) => setEditForm((f) => ({ ...f, period_end: v }))} placeholder="Fin YYYY-MM-DD" />
                        <TextInput style={styles.input} value={editForm.notes} onChangeText={(v) => setEditForm((f) => ({ ...f, notes: v }))} placeholder="Notes" />
                        <PrimaryButton
                          compact
                          label="Enregistrer"
                          loading={busy}
                          onPress={() => run(async () => {
                            await updatePayrollPeriod(p.id, editForm);
                            setEditingId(null);
                          }, 'Période mise à jour')}
                        />
                        <SecondaryButton compact label="Annuler" onPress={() => setEditingId(null)} />
                      </View>
                    )}

                    <View style={styles.actions}>
                      {p.status !== 'paid' && p.status !== 'cancelled' && (
                        <SecondaryButton
                          compact
                          label="Modifier"
                          onPress={() => {
                            setEditingId(p.id);
                            setEditForm({
                              period_start: (p.period_start || '').slice(0, 10),
                              period_end: (p.period_end || '').slice(0, 10),
                              frequency: p.frequency || 'weekly',
                              payment_mode: p.payment_mode || 'manual',
                              notes: p.notes || '',
                            });
                          }}
                        />
                      )}
                      {p.status === 'pending_approval' && (
                        <SecondaryButton compact label="Approuver" onPress={() => run(async () => { await approvePayrollPeriod(p.id); }, 'Approuvée')} />
                      )}
                      {(p.status === 'approved' || p.status === 'pending_approval') && (
                        <PrimaryButton compact label="Payer" loading={busy} onPress={() => run(async () => { await payPayrollPeriod(p.id); setTab('history'); }, 'Paie versée')} />
                      )}
                      {p.status !== 'cancelled' && (
                        <SecondaryButton
                          compact
                          label="Supprimer"
                          onPress={() => {
                            const paid = p.status === 'paid';
                            Alert.alert(
                              'Supprimer',
                              paid
                                ? 'Annuler cette période payée (sans rembourser) ?'
                                : 'Supprimer ? Les gains reviendront en attente.',
                              [
                                { text: 'Non', style: 'cancel' },
                                {
                                  text: 'Oui',
                                  style: 'destructive',
                                  onPress: () => run(async () => { await deletePayrollPeriod(p.id, paid); }, paid ? 'Annulée' : 'Supprimée'),
                                },
                              ],
                            );
                          }}
                        />
                      )}
                    </View>

                    {(p.lines || []).map((line) => (
                      <Pressable key={line.id} onPress={() => router.push(`/payroll/${line.employee_id}`)}>
                        <Text style={styles.line}>{line.employee_name} · {formatXOF(Number(line.net_amount))} · {line.status}</Text>
                      </Pressable>
                    ))}
                  </SoftCard>
                ))
              )}
            </View>
          )}

          {tab === 'settings' && (
            <SoftCard style={styles.block}>
              <Text style={styles.section}>Règles de calcul</Text>
              <Text style={styles.meta}>Pool = net mission × %. Lead équipe a un poids multiplié.</Text>

              <Text style={styles.label}>Fréquence</Text>
              <View style={styles.rowBtns}>
                {(['weekly', 'monthly'] as const).map((f) => (
                  <Pressable key={f} style={[styles.chip, settings.frequency === f && styles.chipActive]} onPress={() => setSettings({ ...settings, frequency: f })}>
                    <Text style={[styles.chipText, settings.frequency === f && styles.chipTextActive]}>{f === 'weekly' ? 'Hebdo' : 'Mensuel'}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Mode</Text>
              <View style={styles.rowBtns}>
                {(['manual', 'automatic'] as const).map((m) => (
                  <Pressable key={m} style={[styles.chip, settings.payment_mode === m && styles.chipActive]} onPress={() => setSettings({ ...settings, payment_mode: m })}>
                    <Text style={[styles.chipText, settings.payment_mode === m && styles.chipTextActive]}>{m === 'manual' ? 'Manuel' : 'Auto'}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>% pool employés</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings.employee_pool_percent)}
                onChangeText={(v) => setSettings({ ...settings, employee_pool_percent: v })}
              />
              <Text style={styles.label}>Multiplicateur lead</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={String(settings.lead_weight_multiplier)}
                onChangeText={(v) => setSettings({ ...settings, lead_weight_multiplier: v })}
              />

              <PrimaryButton
                label="Enregistrer les règles"
                loading={busy}
                onPress={() => run(async () => { await updatePayrollSettings(settings); }, 'Règles enregistrées')}
              />
              <SecondaryButton
                label="Réinitialiser"
                onPress={() => {
                  Alert.alert('Réinitialiser', 'Remettre les valeurs par défaut ?', [
                    { text: 'Non', style: 'cancel' },
                    { text: 'Oui', onPress: () => run(async () => { const s = await resetPayrollSettings(); setSettings(s); }, 'Réinitialisé') },
                  ]);
                }}
              />
            </SoftCard>
          )}
        </>
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  title: { fontWeight: '700', fontSize: 15, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  pending: { fontSize: 13, fontWeight: '700', color: '#9a3412', marginTop: 4 },
  amount: { fontWeight: '700', color: colors.primary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.lg },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surface, color: colors.text,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  editBox: { gap: 8, marginTop: spacing.sm },
  line: { fontSize: 12, color: colors.text, marginTop: 6 },
  section: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 4 },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
});
