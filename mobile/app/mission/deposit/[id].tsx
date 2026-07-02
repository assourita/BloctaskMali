import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { getProviderProfile } from '../../../src/api/deposits';
import { getEnterpriseProfile } from '../../../src/api/enterprise';
import { getMission, payMissionDeposit } from '../../../src/api/missions';
import { getPaymentMethods } from '../../../src/api/payments';
import { sendLocation } from '../../../src/api/tracking';
import { useAuth } from '../../../src/context/AuthContext';
import { PrimaryButton, SecondaryButton } from '../../../src/components/buttons';
import { Card, Loader } from '../../../src/components/ui';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../../../src/components/widgets';
import { DEFAULT_PHONE_PREFIX, formatXOF, MOBILE_MONEY_OPERATORS } from '../../../src/constants/africa';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { ApiError } from '../../../src/api/client';
import type { Mission, Operator } from '../../../src/types';

export default function MissionDepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';

  const [mission, setMission] = useState<Mission | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);

  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState<Operator>('orange');
  const [otp, setOtp] = useState('1234');
  const [topUpAmount, setTopUpAmount] = useState('');

  const required = Number(mission?.required_deposit ?? mission?.deposit_amount ?? 0);
  const needsTopUp = balance < required;
  const topUpValue = needsTopUp ? Math.max(required - balance, required) : 0;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const m = await getMission(id);
      setMission(m);
      const req = Number(m.required_deposit ?? m.deposit_amount ?? 0);
      if (isEnterprise) {
        const profile = await getEnterpriseProfile();
        const bal = Number(profile?.deposit_balance ?? 0);
        setBalance(bal);
        setTopUpAmount(String(Math.max(req - bal, req) || req || 10000));
      } else {
        const profile = await getProviderProfile();
        const bal = Number(profile?.deposit_balance ?? 0);
        setBalance(bal);
        setTopUpAmount(String(Math.max(req - bal, req) || req || 10000));
      }
    } catch {
      setMission(null);
    } finally {
      setLoading(false);
    }
  }, [id, isEnterprise]);

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

  useEffect(() => {
    if (required > 0) {
      setTopUpAmount(String(Math.max(required - balance, 0) || required));
    }
  }, [required, balance]);

  const shareInitialLocation = async (missionId: string) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await sendLocation(missionId, pos.coords.latitude, pos.coords.longitude);
  };

  const submit = async () => {
    if (!id || !mission) return;

    if (!isEnterprise && !gpsConsent) {
      Alert.alert(
        'Partage GPS requis',
        'Acceptez le partage de votre position jusqu\'à la fin de la mission pour démarrer.',
      );
      return;
    }

    if (needsTopUp) {
      const value = Number(topUpAmount.replace(/\s/g, ''));
      if (!value || value < 1000) {
        Alert.alert('Montant', 'Minimum 1 000 XOF pour le paiement Mobile Money.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Mobile Money', 'Saisissez votre numéro Mobile Money.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Parameters<typeof payMissionDeposit>[1] = {};

      if (needsTopUp) {
        payload.amount = Number(topUpAmount.replace(/\s/g, ''));
        payload.phone_number = phone.trim();
        payload.operator = operator;
        payload.otp = otp.trim() || undefined;
      }

      if (!isEnterprise) {
        payload.auto_start = true;
        payload.gps_consent = gpsConsent;
      }

      const result = await payMissionDeposit(id, payload);

      if (!isEnterprise && gpsConsent) {
        try {
          await shareInitialLocation(id);
        } catch {
          /* permission refusée — mission déjà démarrée */
        }
      }

      Alert.alert(
        'Succès',
        result.mission_started
          ? 'Caution déposée — la mission est démarrée. Le client a été notifié.'
          : result.status || 'Caution déposée avec succès.',
        [{ text: 'OK', onPress: () => router.replace(`/mission/${id}`) }],
      );
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.status === 400 && err.data && typeof err.data === 'object') {
        const data = err.data as { payment_method_required?: boolean; required_deposit?: number };
        if (data.payment_method_required) {
          Alert.alert('Mobile Money requis', 'Complétez le paiement Mobile Money ci-dessous.');
          return;
        }
      }
      Alert.alert('Erreur', err?.message || 'Paiement impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !mission) {
    return (
      <AppLayout title="Caution mission" showBack>
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Caution mission" showBack scroll={false}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Déposer la caution"
          subtitle={mission.title}
        />

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Caution requise</Text>
            <Text style={styles.summaryValue}>{formatXOF(required)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Votre solde</Text>
            <Text style={[styles.summaryValue, needsTopUp && styles.insufficient]}>
              {formatXOF(balance)}
            </Text>
          </Card>
        </View>

        {needsTopUp ? (
          <SoftCard style={styles.mmCard}>
            <Text style={styles.sectionTitle}>Paiement Mobile Money</Text>
            <Text style={styles.mmHint}>
              Solde insuffisant — un paiement de {formatXOF(topUpValue)} minimum sera débité
              de votre compte {operator === 'orange' ? 'Orange Money' : 'Moov Money'} pour alimenter
              la caution, puis la mission {isEnterprise ? 'sera confirmée' : 'démarrera automatiquement'}.
            </Text>

            <Text style={styles.fieldLabel}>Montant à payer (XOF)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />

            <Text style={styles.fieldLabel}>Opérateur</Text>
            <View style={styles.ops}>
              {MOBILE_MONEY_OPERATORS.map((op) => (
                <Pressable
                  key={op.id}
                  style={[styles.opBtn, operator === op.id && styles.opBtnActive]}
                  onPress={() => setOperator(op.id)}
                >
                  <Text style={[styles.opText, operator === op.id && styles.opTextActive]}>
                    {op.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Numéro Mobile Money</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder={`${DEFAULT_PHONE_PREFIX} 70 00 00 00`}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.fieldLabel}>Code OTP (test : 1234)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />
          </SoftCard>
        ) : (
          <SoftCard>
            <Text style={styles.okBalance}>
              ✓ Solde suffisant — la caution sera bloquée depuis votre compte BlockTask.
            </Text>
          </SoftCard>
        )}

        {!isEnterprise ? (
          <Pressable style={styles.consentRow} onPress={() => setGpsConsent((v) => !v)}>
            <View style={[styles.checkbox, gpsConsent && styles.checkboxOn]}>
              {gpsConsent ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.consentText}>
              J'accepte de partager ma position GPS en temps réel avec le client jusqu'à la
              fin de la mission (remise des preuves et validation).
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={
              isEnterprise
                ? 'Déposer la caution entreprise'
                : 'Déposer la caution et démarrer'
            }
            loading={submitting}
            onPress={submit}
          />
          <SecondaryButton label="Annuler" onPress={() => router.back()} />
        </View>

        <Text style={styles.footerNote}>
          {isEnterprise
            ? 'Après le dépôt, assignez un employé pour exécuter la mission.'
            : 'La mission passera automatiquement en « En cours » après confirmation du paiement.'}
        </Text>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl + 80 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  insufficient: { color: colors.danger },
  mmCard: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  mmHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
    backgroundColor: '#f0faf4',
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  fieldLabel: { fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  ops: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  opBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  opBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  opText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  opTextActive: { color: colors.primary },
  okBalance: { fontSize: 14, color: '#065f46', lineHeight: 20 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#fffbeb',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  consentText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  footerNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
