import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  deactivateEmployee,
  getEmployee,
  updateEmployee,
  type EnterpriseEmployee,
} from '../../src/api/enterprise';
import { PrimaryButton, SecondaryButton, Input } from '../../src/components/buttons';
import { Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { SoftCard } from '../../src/components/widgets';
import { colors, radius, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';

const ROLE_OPTIONS = [
  { id: 'agent', label: 'Agent terrain' },
  { id: 'manager', label: 'Manager' },
  { id: 'admin', label: 'Administrateur' },
  { id: 'hr', label: 'Ressources humaines' },
  { id: 'accountant', label: 'Comptable' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.id, r.label]),
);

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [employee, setEmployee] = useState<EnterpriseEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    role: 'agent',
  });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const e = await getEmployee(id);
      setEmployee(e);
      setForm({
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email,
        phone: e.phone || '',
        position: e.position || '',
        role: e.role || 'agent',
      });
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const save = async () => {
    if (!id || !form.first_name || !form.last_name) {
      Alert.alert('Champs requis', 'Prénom et nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateEmployee(id, form);
      setEmployee(updated);
      setEditing(false);
      Alert.alert('Succès', 'Employé mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = () => {
    if (!employee) return;
    const next = !employee.is_active;
    Alert.alert(
      next ? 'Réactiver' : 'Désactiver',
      next
        ? `Réactiver ${employee.first_name} ${employee.last_name} ?`
        : `Désactiver ${employee.first_name} ${employee.last_name} ? Son compte ne pourra plus se connecter.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const updated = await updateEmployee(employee.id, { is_active: next });
              setEmployee(updated);
            } catch (e) {
              Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Action impossible');
            }
          },
        },
      ],
    );
  };

  const remove = () => {
    if (!employee) return;
    Alert.alert(
      'Supprimer l\'employé',
      `Retirer ${employee.first_name} ${employee.last_name} de votre entreprise ? Le compte sera désactivé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateEmployee(employee.id);
              router.back();
            } catch (e) {
              Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Suppression impossible');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <AppLayout title="Employé" showBack><Loader /></AppLayout>;
  }

  if (!employee) {
    return (
      <AppLayout title="Employé" showBack>
        <Text style={styles.empty}>Employé introuvable.</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Fiche employé" showBack>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{employee.first_name[0]}{employee.last_name[0]}</Text>
        </View>
        <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
        <Text style={styles.role}>{ROLE_LABELS[employee.role] || employee.role}</Text>
        <View style={[styles.badge, employee.is_active ? styles.active : styles.inactive]}>
          <Text style={styles.badgeText}>{employee.is_active ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      <SoftCard style={styles.info}>
        {editing ? (
          <>
            <Input placeholder="Prénom *" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
            <Input placeholder="Nom *" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
            <Input placeholder="Email" value={form.email} editable={false} />
            <Input placeholder="Téléphone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
            <Input placeholder="Poste" value={form.position} onChangeText={(v) => setForm({ ...form, position: v })} />
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setForm({ ...form, role: r.id })}
                  style={[styles.roleChip, form.role === r.id && styles.roleChipActive]}
                >
                  <Text style={[styles.roleText, form.role === r.id && styles.roleTextActive]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Téléphone" value={employee.phone || '—'} />
            <InfoRow label="Poste" value={employee.position || '—'} />
            <InfoRow label="Missions terminées" value={String(employee.missions_completed ?? 0)} />
            {employee.hired_at ? (
              <InfoRow label="Embauché le" value={new Date(employee.hired_at).toLocaleDateString('fr-FR')} />
            ) : null}
          </>
        )}
      </SoftCard>

      <View style={styles.actions}>
        {editing ? (
          <>
            <PrimaryButton label="Enregistrer" loading={saving} onPress={save} />
            <SecondaryButton label="Annuler" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            <PrimaryButton label="Modifier" onPress={() => setEditing(true)} />
            <SecondaryButton
              label={employee.is_active ? 'Désactiver' : 'Activer'}
              onPress={toggleActive}
            />
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          </>
        )}
      </View>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 24 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  role: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  badge: { marginTop: spacing.sm, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  active: { backgroundColor: '#d1fae5' },
  inactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.text },
  info: { gap: spacing.sm, marginBottom: spacing.lg },
  infoRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  roleChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  roleTextActive: { color: colors.primary },
  actions: { gap: spacing.sm },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteText: { color: '#b91c1c', fontWeight: '700' },
});
