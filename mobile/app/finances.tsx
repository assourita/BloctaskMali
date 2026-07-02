import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  fundEnterpriseDeposit,
  getEnterpriseProfile,
  getFinancesSummary,
  type EnterpriseFinancesSummary,
} from '../src/api/enterprise';
import { getPaymentMethods } from '../src/api/payments';
import { PrimaryButton } from '../src/components/buttons';
import { Card, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, StatGrid } from '../src/components/widgets';
import { DEFAULT_PHONE_PREFIX, formatXOF, MOBILE_MONEY_OPERATORS } from '../src/constants/africa';
import { colors, radius, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { Operator } from '../src/types';

export default function FinancesScreen() {
  const [summary, setSummary] = useState<EnterpriseFinancesSummary | null>(null);
  const [depositBalance, setDepositBalance] = useState(0);
  const [depositLocked, setDepositLocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState<Operator>('orange');
  const [otp, setOtp] = useState('1234');
  const [funding, setFunding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([getFinancesSummary(), getEnterpriseProfile()]);
      setSummary(s);
      setDepositBalance(Number(p?.deposit_balance ?? 0));
      setDepositLocked(Number(p?.deposit_locked ?? 0));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    getPaymentMethods()
      .then((methods) => {
        const mm = methods.find((m) => m.is_default) || methods[0];
        if (mm?.phone_number) setPhone(mm.phone_number);
        if (mm?.operator) setOperator(mm.operator as Operator);
      })
      .catch(() => {});
  }, [load]);

  const fund = async () => {
    const value = Number(amount.replace(/\s/g, ''));
    if (!value || value < 1000) {
      Alert.alert('Montant', 'Minimum 1 000 XOF.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Mobile Money', 'Saisissez votre numéro Mobile Money.');
      return;
    }
    setFunding(true);
    try {
      const res = await fundEnterpriseDeposit({
        amount: value,
        phone_number: phone.trim(),
        operator,
        otp: otp.trim() || undefined,
      });
      setDepositBalance(res.deposit_balance);
      setDepositLocked(res.deposit_locked);
      Alert.alert('Succès', res.message);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Paiement impossible');
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return <AppLayout title="Finances" showBack><Loader /></AppLayout>;
  }

  return (
    <AppLayout
      title="Finances"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader title="Finances entreprise" subtitle="Dépenses, factures et caution collective" />

      <StatGrid
        items={[
          { value: formatXOF(depositBalance), label: 'Caution dispo', tint: colors.success },
          { value: formatXOF(depositLocked), label: 'Caution bloquée', tint: colors.warning },
          { value: formatXOF(summary?.mission_spent_total ?? 0), label: 'Dépensé', tint: colors.accent },
          { value: formatXOF(summary?.mission_committed_total ?? 0), label: 'En cours', tint: colors.info },
        ]}
      />

      <SoftCard style={styles.fund}>
        <Text style={styles.section}>Alimenter via Mobile Money</Text>
        <Text style={styles.mmInfo}>
          Débit depuis Orange Money ou Moov Money — même principe que le paiement client.
        </Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="Montant (min. 1 000 XOF)" value={amount} onChangeText={setAmount} />
        <View style={styles.ops}>
          {MOBILE_MONEY_OPERATORS.map((op) => (
            <Pressable
              key={op.id}
              style={[styles.opBtn, operator === op.id && styles.opBtnActive]}
              onPress={() => setOperator(op.id)}
            >
              <Text style={[styles.opText, operator === op.id && styles.opTextActive]}>{op.name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder={`${DEFAULT_PHONE_PREFIX} 70 00 00 00`}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="OTP (test: 1234)" value={otp} onChangeText={setOtp} />
        <PrimaryButton label="Payer via Mobile Money" loading={funding} onPress={fund} />
      </SoftCard>

      <Text style={styles.section}>Missions commandées ({summary?.missions_count ?? 0})</Text>
      {(summary?.missions ?? []).slice(0, 8).map((m) => (
        <Card key={m.id} style={styles.row}>
          <Text style={styles.rowTitle}>{m.title}</Text>
          <Text style={styles.rowMeta}>{formatXOF(m.budget)} · {m.status}</Text>
        </Card>
      ))}

      <Text style={styles.section}>Factures ({summary?.invoices?.length ?? 0})</Text>
      {(summary?.invoices ?? []).slice(0, 5).map((inv) => (
        <Card key={inv.id} style={styles.row}>
          <Text style={styles.rowTitle}>{inv.invoice_number}</Text>
          <Text style={styles.rowMeta}>{formatXOF(inv.total_amount)} · {inv.status}</Text>
        </Card>
      ))}

      <PrimaryButton label="Voir la caution" onPress={() => router.push('/deposit')} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  fund: { marginVertical: spacing.md, gap: spacing.sm },
  section: { fontWeight: '700', fontSize: 15, color: colors.text, marginVertical: spacing.sm },
  mmInfo: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface,
  },
  ops: { flexDirection: 'row', gap: spacing.sm },
  opBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  opBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  opText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  opTextActive: { color: colors.primary },
  row: { marginBottom: spacing.sm },
  rowTitle: { fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
