import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  getMyEnterprisePayroll,
  updateMyEnterprisePayroll,
  type ProviderEnterprisePayroll,
} from '../../../src/api/enterprise';
import { ApiError } from '../../../src/api/client';
import { PrimaryButton, SecondaryButton, Input } from '../../../src/components/buttons';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { PageHeader, SoftCard, StatGrid, TabBar } from '../../../src/components/widgets';
import { Loader } from '../../../src/components/ui';
import { formatXOF } from '../../../src/constants/africa';
import { colors, spacing } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useScreenLoad } from '../../../src/utils/useScreenLoad';

type TabKey = 'earnings' | 'payments' | 'missions';

export default function ProviderEnterprisePayrollScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole } = useAuth();
  const [data, setData] = useState<ProviderEnterprisePayroll | null>(null);
  const [tab, setTab] = useState<TabKey>('earnings');
  const [editing, setEditing] = useState(false);
  const [payPhone, setPayPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (activeRole !== 'provider' || !id) return;
    const d = await getMyEnterprisePayroll(String(id));
    setData(d);
    setPayPhone(d.employee?.pay_phone || '');
  }, [activeRole, id]);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  if (activeRole !== 'provider') {
    return (
      <AppLayout title="Salaires" showBack>
        <Text style={styles.empty}>Réservé aux prestataires.</Text>
      </AppLayout>
    );
  }

  const e = data?.employee;

  const savePhone = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await updateMyEnterprisePayroll(String(id), { pay_phone: payPhone.trim() });
      setData(updated);
      setEditing(false);
      Alert.alert('OK', 'Numéro de paie enregistré');
    } catch (err) {
      Alert.alert('Erreur', err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Mes salaires" showBack refreshing={refreshing} onRefresh={refresh}>
      {loading || !data || !e ? (
        <Loader />
      ) : (
        <>
          <PageHeader
            title={data.enterprise?.company_name || 'Mes salaires'}
            subtitle={`${e.position || e.role} · coef. ${e.pay_weight}`}
          />

          <StatGrid
            items={[
              { value: formatXOF(Number(e.earnings_pending)), label: 'À recevoir', tint: colors.warning },
              { value: formatXOF(Number(e.earnings_paid)), label: 'Reçu', tint: colors.success },
              { value: formatXOF(Number(e.earnings_total)), label: 'Cumulé', tint: colors.accent },
              {
                value: String((e.solo_missions || 0) + (e.team_missions || 0)),
                label: 'Missions',
                tint: colors.info,
              },
            ]}
          />

          <SoftCard style={styles.block}>
            <Text style={styles.section}>Réception Mobile Money</Text>
            {editing ? (
              <>
                <Input
                  placeholder="Numéro Mobile Money"
                  value={payPhone}
                  onChangeText={setPayPhone}
                  keyboardType="phone-pad"
                />
                <PrimaryButton label="Enregistrer" loading={busy} onPress={savePhone} />
                <SecondaryButton label="Annuler" onPress={() => setEditing(false)} />
              </>
            ) : (
              <>
                <Text style={styles.meta}>Tél. paie : {e.pay_phone || 'Non renseigné'}</Text>
                <Text style={styles.meta}>
                  Solo {e.solo_missions} · Équipe {e.team_missions} · Lead {e.lead_missions}
                </Text>
                <PrimaryButton compact label="Modifier le numéro" onPress={() => setEditing(true)} />
              </>
            )}
          </SoftCard>

          <TabBar
            tabs={[
              { id: 'earnings', label: 'Gains', count: data.earnings?.length || 0 },
              { id: 'payments', label: 'Paiements', count: data.payments?.length || 0 },
              { id: 'missions', label: 'Missions', count: data.assignments?.length || 0 },
            ]}
            value={tab}
            onChange={(k) => setTab(k as TabKey)}
          />

          {tab === 'earnings' && (
            <View style={styles.list}>
              {(data.earnings || []).length === 0 ? (
                <Text style={styles.empty}>Aucun gain encore</Text>
              ) : (
                data.earnings.map((row) => (
                  <SoftCard key={row.id} style={styles.row}>
                    <Text style={styles.title}>{row.mission_title}</Text>
                    <Text style={styles.meta}>
                      {row.is_team ? `Équipe (${row.team_size})` : 'Solo'}
                      {row.is_lead ? ' · Lead' : ''} · {row.status}
                    </Text>
                    <Text style={styles.amount}>{formatXOF(Number(row.amount))}</Text>
                  </SoftCard>
                ))
              )}
            </View>
          )}

          {tab === 'payments' && (
            <View style={styles.list}>
              {(data.payments || []).length === 0 ? (
                <Text style={styles.empty}>Aucun paiement reçu</Text>
              ) : (
                data.payments.map((row) => (
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
                    </Text>
                  </SoftCard>
                ))
              )}
            </View>
          )}

          {tab === 'missions' && (
            <View style={styles.list}>
              {(data.assignments || []).length === 0 ? (
                <Text style={styles.empty}>Aucune mission</Text>
              ) : (
                data.assignments.map((row) => (
                  <SoftCard key={row.id} style={styles.row}>
                    <Text style={styles.title}>{row.mission_title}</Text>
                    <Text style={styles.meta}>
                      {row.mission_status}
                      {row.is_lead ? ' · Lead' : ''}
                    </Text>
                  </SoftCard>
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
  list: { marginTop: spacing.md },
  row: { marginBottom: spacing.sm, gap: 4 },
  title: { fontWeight: '700', fontSize: 14, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  amount: { fontWeight: '700', color: colors.primary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.lg },
});
