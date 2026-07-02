import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fundDeposit, getDeposits, getProviderProfile, type ProviderDeposit } from '../src/api/deposits';
import { fundEnterpriseDeposit, getEnterpriseProfile } from '../src/api/enterprise';
import { getPaymentMethods } from '../src/api/payments';
import { useAuth } from '../src/context/AuthContext';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { Card, EmptyState, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { DEFAULT_PHONE_PREFIX, formatXOF, MOBILE_MONEY_OPERATORS } from '../src/constants/africa';
import { colors, radius, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { Operator } from '../src/types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  locked: 'Bloquée',
  released: 'Libérée',
  forfeited: 'Perdue',
};

export default function DepositScreen() {
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';
  const [balance, setBalance] = useState(0);
  const [locked, setLocked] = useState(0);
  const [deposits, setDeposits] = useState<ProviderDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState<Operator>('orange');
  const [otp, setOtp] = useState('1234');
  const [showForm, setShowForm] = useState(false);
  const [funding, setFunding] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isEnterprise) {
        const profile = await getEnterpriseProfile();
        setBalance(Number(profile?.deposit_balance ?? 0));
        setLocked(Number(profile?.deposit_locked ?? 0));
        setDeposits([]);
      } else {
        const [profile, list] = await Promise.all([getProviderProfile(), getDeposits()]);
        setBalance(Number(profile?.deposit_balance ?? 0));
        setLocked(Number(profile?.deposit_locked ?? 0));
        setDeposits(list);
      }
    } catch {
      setBalance(0);
      setLocked(0);
      setDeposits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEnterprise]);

  useEffect(() => {
    load();
    getPaymentMethods()
      .then((methods) => {
        const mm = methods.find((m) => m.is_default) || methods[0];
        if (mm?.phone_number) setPhone(mm.phone_number);
        if (mm?.operator) setOperator(mm.operator as Operator);
      })
      .catch(() => {});
  }, [load]);

  const submitDeposit = async () => {
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
      const payload = {
        amount: value,
        phone_number: phone.trim(),
        operator,
        otp: otp.trim() || undefined,
      };
      const res = isEnterprise
        ? await fundEnterpriseDeposit(payload)
        : await fundDeposit(payload);
      setBalance(res.deposit_balance);
      setLocked(res.deposit_locked);
      setShowForm(false);
      await load();
      Alert.alert('Succès', res.message || 'Paiement Mobile Money confirmé — caution alimentée.');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Paiement impossible';
      Alert.alert('Erreur', msg);
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Caution" showBack>
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Caution"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader
        title={isEnterprise ? 'Caution entreprise' : 'Caution'}
        subtitle={isEnterprise
          ? 'Paiement Mobile Money du gérant'
          : 'Débit depuis votre compte Mobile Money'}
        action={
          <Pressable onPress={() => { setRefreshing(true); load(); }}>
            <Text style={styles.refresh}>Actualiser</Text>
          </Pressable>
        }
      />

      <View style={styles.balanceRow}>
        <View style={[styles.balanceCard, styles.available]}>
          <Text style={styles.balanceLabelTop}>Disponible</Text>
          <Text style={styles.balanceValue}>{formatXOF(balance)}</Text>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
        </View>
        <View style={[styles.balanceCard, styles.locked]}>
          <Text style={styles.balanceLabelTop}>Bloquée</Text>
          <Text style={styles.balanceValue}>{formatXOF(locked)}</Text>
          <Text style={styles.balanceLabel}>Caution bloquée</Text>
        </View>
      </View>

      <SoftCard>
        <View style={styles.historyHead}>
          <Text style={styles.sectionTitle}>Payer via Mobile Money</Text>
          <PrimaryButton
            label={showForm ? 'Masquer' : '+ Déposer'}
            onPress={() => setShowForm((v) => !v)}
          />
        </View>

        <Text style={styles.mmInfo}>
          Le montant sera débité de votre compte Orange Money ou Moov Money,
          comme pour le paiement d'une mission client.
        </Text>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>Montant (XOF, min. 1 000)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />

            <Text style={styles.formLabel}>Opérateur</Text>
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

            <Text style={styles.formLabel}>Numéro Mobile Money</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder={`${DEFAULT_PHONE_PREFIX} 70 00 00 00`}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.formLabel}>Code OTP (test : 1234)</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} />

            <View style={styles.formActions}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Payer" loading={funding} onPress={submitDeposit} />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Annuler" onPress={() => setShowForm(false)} />
              </View>
            </View>
          </View>
        )}

        {deposits.length === 0 ? (
          <EmptyState message={isEnterprise ? 'Historique détaillé sur le web' : 'Aucune caution bloquée pour l\'instant'} />
        ) : (
          deposits.map((d) => (
            <Card key={d.id} style={styles.depItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.depAmount}>{formatXOF(Number(d.amount))}</Text>
                <Text style={styles.depMeta}>{new Date(d.created_at).toLocaleString('fr-FR')}</Text>
                {d.deposit_tx_hash ? (
                  <Text style={styles.depHash} numberOfLines={1}>{d.deposit_tx_hash}</Text>
                ) : null}
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{STATUS_LABELS[d.status] || d.status}</Text>
              </View>
            </Card>
          ))
        )}
      </SoftCard>

      <SoftCard style={styles.infoCard}>
        <Text style={styles.infoTitle}>À propos de la caution</Text>
        <Text style={styles.infoText}>
          {isEnterprise
            ? 'Le gérant paie via Mobile Money pour alimenter le solde, puis la caution est bloquée lors de l\'acceptation d\'une mission avant d\'assigner un employé.'
            : 'La caution garantit la bonne exécution de vos missions. Elle est bloquée pendant la mission et libérée à la fin si tout se passe bien.'}
        </Text>
      </SoftCard>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  refresh: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  balanceCard: {
    flex: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: 6,
  },
  available: { backgroundColor: '#f0faf4' },
  locked: { backgroundColor: '#fef3c7' },
  balanceLabelTop: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  balanceLabel: { fontSize: 12, color: colors.textMuted },
  historyHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm, gap: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  mmInfo: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md, backgroundColor: '#f0faf4', padding: spacing.sm, borderRadius: radius.sm },
  form: { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formLabel: { fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  ops: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  opBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  opBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  opText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  opTextActive: { color: colors.primary },
  formActions: { flexDirection: 'row', gap: spacing.sm },
  depItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  depAmount: { fontWeight: '800', fontSize: 16, color: colors.text },
  depMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  depHash: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  statusPill: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  infoCard: { backgroundColor: '#f8fafc' },
  infoTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 6 },
  infoText: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
});
