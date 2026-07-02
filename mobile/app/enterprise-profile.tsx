import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  getEnterpriseProfile,
  updateEnterpriseProfile,
  type EnterpriseProfile,
} from '../src/api/enterprise';
import { PrimaryButton, Input } from '../src/components/buttons';
import { Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import { formatXOF } from '../src/constants/africa';

export default function EnterpriseProfileScreen() {
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    rccm: '',
    ifu: '',
    company_email: '',
    company_phone: '',
    website: '',
    address: '',
    city: '',
  });

  const load = useCallback(async () => {
    try {
      const p = await getEnterpriseProfile();
      setProfile(p);
      if (p) {
        setForm({
          company_name: p.company_name || '',
          rccm: p.rccm || '',
          ifu: p.ifu || '',
          company_email: p.company_email || '',
          company_phone: p.company_phone || '',
          website: p.website || '',
          address: p.address || '',
          city: p.city || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.company_name || !form.address || !form.city) {
      Alert.alert('Champs requis', 'Raison sociale, adresse et ville sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateEnterpriseProfile(form);
      setProfile(updated);
      Alert.alert('Succès', 'Profil entreprise mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AppLayout title="Mon entreprise" showBack><Loader /></AppLayout>;
  }

  return (
    <AppLayout title="Mon entreprise" showBack>
      <PageHeader title="Profil entreprise" subtitle="Informations légales et contact" />

      {profile && (
        <SoftCard style={styles.kpi}>
          <Text style={styles.kpiLabel}>Caution disponible</Text>
          <Text style={styles.kpiValue}>{formatXOF(Number(profile.deposit_balance ?? 0))}</Text>
          <Text style={styles.kpiSub}>{profile.total_employees ?? 0} employé(s)</Text>
        </SoftCard>
      )}

      <SoftCard style={styles.form}>
        <Input placeholder="Raison sociale *" value={form.company_name} onChangeText={(v) => setForm({ ...form, company_name: v })} />
        <Input placeholder="RCCM" value={form.rccm} onChangeText={(v) => setForm({ ...form, rccm: v })} />
        <Input placeholder="IFU" value={form.ifu} onChangeText={(v) => setForm({ ...form, ifu: v })} />
        <Input placeholder="Email entreprise" keyboardType="email-address" autoCapitalize="none" value={form.company_email} onChangeText={(v) => setForm({ ...form, company_email: v })} />
        <Input placeholder="Téléphone" value={form.company_phone} onChangeText={(v) => setForm({ ...form, company_phone: v })} />
        <Input placeholder="Site web" autoCapitalize="none" value={form.website} onChangeText={(v) => setForm({ ...form, website: v })} />
        <Input placeholder="Adresse *" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
        <Input placeholder="Ville *" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
        <PrimaryButton label="Enregistrer" loading={saving} onPress={save} />
      </SoftCard>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  kpi: { marginBottom: spacing.md, alignItems: 'center' },
  kpiLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 4 },
  kpiSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  form: { gap: spacing.sm },
});
