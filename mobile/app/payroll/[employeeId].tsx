import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getPayrollEmployeeDetail,
  updateEmployee,
  type PayrollEmployeeDetail,
} from '../../src/api/enterprise';
import { ApiError } from '../../src/api/client';
import { PrimaryButton, SecondaryButton, Input } from '../../src/components/buttons';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader, SoftCard, StatGrid, TabBar } from '../../src/components/widgets';
import { Loader } from '../../src/components/ui';
import { formatXOF } from '../../src/constants/africa';
import { colors, spacing } from '../../src/constants/theme';
import { useEnterpriseGuard } from '../../src/hooks/useEnterpriseGuard';
import { useScreenLoad } from '../../src/utils/useScreenLoad';

type TabKey = 'earnings' | 'payments' | 'missions';

export default function PayrollEmployeeScreen() {
  const { allowed, redirect } = useEnterpriseGuard();
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const [detail, setDetail] = useState<PayrollEmployeeDetail | null>(null);
  const [tab, setTab] = useState<TabKey>('earnings');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ pay_weight: '1', pay_phone: '' });

  const load = useCallback(async () => {
    if (!employeeId) return;
    const d = await getPayrollEmployeeDetail(String(employeeId));
    setDetail(d);
    setForm({
      pay_weight: String(d.employee.pay_weight ?? 1),
      pay_phone: d.employee.pay_phone || '',
    });
  }, [employeeId]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  if (!allowed) return redirect;

  const e = detail?.employee;

  const savePay = async () => {
    if (!employeeId) return;
    const w = Number(form.pay_weight);
    if (!w || w <= 0) {
      Alert.alert('Coefficient', 'Indiquez un coefficient > 0.');
      return;
    }
    setBusy(true);
    try {
      await updateEmployee(String(employeeId), {
        pay_weight: w,
        pay_phone: form.pay_phone.trim(),
      });
      await load();
      setEditing(false);
      Alert.alert('OK', 'Paramètres de paie mis à jour');
    } catch (err) {
      Alert.alert('Erreur', err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Salaire" showBack refreshing={refreshing} onRefresh={refresh}>
      {loading || !detail || !e ? (
        <Loader />
      ) : (
        <>
          <PageHeader
            title={`${e.first_name} ${e.last_name}`}
            subtitle={`${e.position || e.role} · coef. ${e.pay_weight}`}
          />

          <StatGrid
            items={[
              { value: formatXOF(Number(e.earnings_pending)), label: 'À verser', tint: colors.warning },
              { value: formatXOF(Number(e.earnings_paid)), label: 'Payé', tint: colors.success },
              { value: formatXOF(Number(e.earnings_total)), label: 'Cumulé', tint: colors.accent },
              { value: String(e.solo_missions + e.team_missions), label: 'Missions', tint: colors.info },
            ]}
          />

          <SoftCard style={styles.block}>
            <Text style={styles.section}>Paramètres paie</Text>
            {editing ? (
              <>
                <Input
                  placeholder="Coefficient (ex. 1)"
                  value={form.pay_weight}
                  onChangeText={(v) => setForm((f) => ({ ...f, pay_weight: v }))}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Téléphone paie (Mobile Money)"
                  value={form.pay_phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, pay_phone: v }))}
                  keyboardType="phone-pad"
                />
                <PrimaryButton label="Enregistrer" loading={busy} onPress={savePay} />
                <SecondaryButton label="Annuler" onPress={() => setEditing(false)} />
              </>
            ) : (
              <>
                <Text style={styles.meta}>Coefficient : {e.pay_weight}</Text>
                <Text style={styles.meta}>Tél. paie : {e.pay_phone || '—'}</Text>
                <Text style={styles.meta}>
                  Solo {e.solo_missions} · Équipe {e.team_missions} · Lead {e.lead_missions}
                </Text>
                <PrimaryButton compact label="Modifier" onPress={() => setEditing(true)} />
                <SecondaryButton
                  compact
                  label="Fiche employé"
                  onPress={() => router.push(`/employee/${e.employee_id}`)}
                />
              </>
            )}
          </SoftCard>

          <TabBar
            tabs={[
              { id: 'earnings', label: 'Gains', count: detail.earnings.length },
              { id: 'payments', label: 'Paiements', count: detail.payments.length },
              { id: 'missions', label: 'Missions', count: detail.assignments.length },
            ]}
            value={tab}
            onChange={(k) => setTab(k as TabKey)}
          />

          {tab === 'earnings' && (
            <View style={styles.list}>
              {detail.earnings.length === 0 ? (
                <Text style={styles.empty}>Aucun gain</Text>
              ) : (
                detail.earnings.map((row) => (
                  <Pressable
                    key={row.id}
                    style={styles.row}
                    onPress={() => router.push(`/mission/${row.mission_id}`)}
                  >
                    <Text style={styles.title}>{row.mission_title}</Text>
                    <Text style={styles.meta}>
                      {row.is_team ? `Équipe (${row.team_size})` : 'Solo'}
                      {row.is_lead ? ' · Lead' : ''} · {row.status}
                    </Text>
                    <Text style={styles.amount}>{formatXOF(Number(row.amount))}</Text>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {tab === 'payments' && (
            <View style={styles.list}>
              {detail.payments.length === 0 ? (
                <Text style={styles.empty}>Aucun paiement</Text>
              ) : (
                detail.payments.map((row) => (
                  <SoftCard key={row.id} style={styles.row}>
                    <Text style={styles.title}>
                      {row.period_start} → {row.period_end}
                    </Text>
                    <Text style={styles.meta}>
                      {row.missions_count} mission(s) · {row.status}
                    </Text>
                    <Text style={styles.amount}>{formatXOF(Number(row.net_amount))}</Text>
                    <Text style={styles.meta}>
                      {row.paid_at ? new Date(row.paid_at).toLocaleString('fr-FR') : '—'}
                      {row.payment_reference ? ` · ${row.payment_reference}` : ''}
                    </Text>
                  </SoftCard>
                ))
              )}
            </View>
          )}

          {tab === 'missions' && (
            <View style={styles.list}>
              {detail.assignments.length === 0 ? (
                <Text style={styles.empty}>Aucune mission</Text>
              ) : (
                detail.assignments.map((row) => (
                  <Pressable
                    key={row.id}
                    style={styles.row}
                    onPress={() => router.push(`/mission/${row.mission_id}`)}
                  >
                    <Text style={styles.title}>{row.mission_title}</Text>
                    <Text style={styles.meta}>
                      {row.mission_status}
                      {row.is_lead ? ' · Lead' : ''}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </>
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.md, gap: spacing.sm },
  section: { fontWeight: '700', fontSize: 15, color: colors.text },
  list: { marginTop: spacing.md, gap: spacing.sm },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  title: { fontWeight: '700', fontSize: 14, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  amount: { fontWeight: '700', color: colors.primary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.lg },
});
