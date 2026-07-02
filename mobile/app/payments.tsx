import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getPayments,
  requestRefund,
  setDefaultPaymentMethod,
} from '../src/api/payments';
import { Input, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { Badge, Card, ChipGroup, EmptyState, FieldLabel, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { DEFAULT_PHONE_PREFIX, formatXOF, MOBILE_MONEY_OPERATORS } from '../src/constants/africa';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { Payment, PaymentMethod } from '../src/types';

const OPERATOR_OPTIONS = MOBILE_MONEY_OPERATORS.map((o) => ({ id: o.id, label: o.name, color: o.color }));

const PAYMENT_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  completed: { label: 'Payé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  processing: { label: 'En cours', tone: 'info' },
  failed: { label: 'Échoué', tone: 'danger' },
  refunded: { label: 'Remboursé', tone: 'default' },
};

export default function PaymentsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [operator, setOperator] = useState('orange');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([getPaymentMethods(), getPayments()]);
      setMethods(m);
      setPayments(p);
    } catch {
      setMethods([]);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMethod = async () => {
    const digits = phone.replace(/\s/g, '');
    if (!digits) {
      Alert.alert('Numéro requis', 'Saisissez un numéro Mobile Money.');
      return;
    }
    setSaving(true);
    try {
      await createPaymentMethod({
        type: 'mobile_money',
        operator,
        phone_number: digits.startsWith('+') ? digits : `${DEFAULT_PHONE_PREFIX}${digits}`,
        is_default: methods.length === 0,
      });
      setPhone('');
      setShowAdd(false);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Ajout impossible');
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      await load();
    } catch {
      Alert.alert('Erreur', 'Action impossible');
    }
  };

  const removeMethod = (id: string) => {
    Alert.alert('Supprimer', 'Retirer cette méthode de paiement ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePaymentMethod(id);
            await load();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible');
          }
        },
      },
    ]);
  };

  const refund = (payment: Payment) => {
    Alert.alert('Remboursement', `Demander le remboursement de ${formatXOF(payment.amount)} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Demander',
        onPress: async () => {
          try {
            await requestRefund(payment.id, 'other', 'Demande via app mobile');
            Alert.alert('OK', 'Demande de remboursement envoyée.');
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Remboursement impossible');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Paiements" subtitle="Méthodes Mobile Money et historique" />
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <PageHeader title="Paiements" subtitle="Méthodes Mobile Money et historique" />

      <FieldLabel>Mes méthodes de paiement</FieldLabel>
        {methods.length === 0 ? (
          <Text style={styles.muted}>Aucune méthode enregistrée.</Text>
        ) : (
          methods.map((m) => (
            <Card key={m.id} style={styles.methodCard}>
              <View style={styles.methodTop}>
                <Text style={styles.methodName}>{m.display_name || `${m.operator} • ${m.phone_number}`}</Text>
                {m.is_default && <Badge label="Défaut" tone="success" />}
              </View>
              <View style={styles.methodActions}>
                {!m.is_default && <SecondaryButton label="Définir par défaut" onPress={() => makeDefault(m.id)} />}
                <Pressable onPress={() => removeMethod(m.id)}>
                  <Text style={styles.deleteText}>Supprimer</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {showAdd ? (
          <Card>
            <FieldLabel>Opérateur</FieldLabel>
            <ChipGroup options={OPERATOR_OPTIONS} value={operator} onChange={setOperator} />
            <Input
              placeholder="Numéro (70 XX XX XX)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <PrimaryButton label="Enregistrer" onPress={addMethod} loading={saving} />
            <SecondaryButton label="Annuler" onPress={() => setShowAdd(false)} />
          </Card>
        ) : (
          <SecondaryButton label="+ Ajouter une méthode" onPress={() => setShowAdd(true)} />
        )}

        <FieldLabel>Historique</FieldLabel>
        {payments.length === 0 ? (
          <EmptyState message="Aucun paiement pour le moment." />
        ) : (
          payments.map((p) => {
            const st = PAYMENT_STATUS[p.status] || { label: p.status, tone: 'default' as const };
            const canRefund = p.status === 'completed';
            return (
              <Card key={p.id}>
                <View style={styles.methodTop}>
                  <Text style={styles.amount}>{formatXOF(p.amount)}</Text>
                  <Badge label={st.label} tone={st.tone} />
                </View>
                <Text style={styles.muted}>
                  {p.operator ? `${p.operator} • ` : ''}
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                </Text>
                {p.escrow_tx_hash ? (
                  <Text style={styles.hash} numberOfLines={1}>Escrow : {p.escrow_tx_hash}</Text>
                ) : null}
                {canRefund && <SecondaryButton label="Demander un remboursement" onPress={() => refund(p)} />}
              </Card>
            );
          })
        )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  methodCard: { marginBottom: spacing.sm },
  methodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  methodName: { fontWeight: '700', color: colors.text, fontSize: 15, flex: 1 },
  methodActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  deleteText: { color: colors.danger, fontWeight: '600', paddingVertical: 8 },
  amount: { fontWeight: '800', fontSize: 18, color: colors.accent },
  hash: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
