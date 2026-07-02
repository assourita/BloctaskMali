import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  createEmployee,
  getAssignments,
  getEmployees,
  type EmployeeAssignment,
  type EnterpriseEmployee,
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton, Input } from '../src/components/buttons';
import { Card, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, TabBar } from '../src/components/widgets';
import { colors, radius, spacing } from '../src/constants/theme';
import { useEnterpriseGuard } from '../src/hooks/useEnterpriseGuard';
import { assignmentStatusLabel } from '../src/utils/enterprise';
import { ApiError } from '../src/api/client';

const ROLE_OPTIONS = [
  { id: 'agent', label: 'Agent terrain' },
  { id: 'manager', label: 'Manager' },
  { id: 'admin', label: 'Administrateur' },
  { id: 'hr', label: 'RH' },
  { id: 'accountant', label: 'Comptable' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.id, r.label]),
);

type PageTab = 'employees' | 'assignments';
type EmployeeFilter = 'all' | 'active' | 'inactive';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  role: 'agent',
};

export default function EmployeesScreen() {
  const { redirect: guardRedirect } = useEnterpriseGuard();
  const [pageTab, setPageTab] = useState<PageTab>('employees');
  const [filter, setFilter] = useState<EmployeeFilter>('all');
  const [employees, setEmployees] = useState<EnterpriseEmployee[]>([]);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const [emps, assigns] = await Promise.all([getEmployees(), getAssignments()]);
      setEmployees(emps);
      setAssignments(assigns);
    } catch {
      setEmployees([]);
      setAssignments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const activeCount = useMemo(
    () => employees.filter((e) => e.is_active).length,
    [employees],
  );

  const filtered = useMemo(() => {
    if (filter === 'active') return employees.filter((e) => e.is_active);
    if (filter === 'inactive') return employees.filter((e) => !e.is_active);
    return employees;
  }, [employees, filter]);

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      Alert.alert('Champs requis', 'Prénom, nom et email sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const res = await createEmployee(form);
      Alert.alert(
        'Employé créé',
        res.temporary_password
          ? `Mot de passe temporaire : ${res.temporary_password}\nCommuniquez-le pour la première connexion.`
          : 'Compte employé créé.',
      );
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (guardRedirect) return guardRedirect;

  return (
    <AppLayout
      title="Employés"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader
        title="Employés"
        subtitle={`${activeCount} actif(s) · ${employees.length} au total`}
        action={
          pageTab === 'employees' ? (
            <PrimaryButton label={showForm ? 'Fermer' : '+ Ajouter'} onPress={() => setShowForm((v) => !v)} />
          ) : undefined
        }
      />

      <TabBar
        value={pageTab}
        onChange={(id) => setPageTab(id as PageTab)}
        tabs={[
          { id: 'employees', label: 'Liste', count: employees.length },
          { id: 'assignments', label: 'Affectations', count: assignments.length },
        ]}
      />

      {pageTab === 'employees' && (
        <>
          <View style={styles.filters}>
            {(['all', 'active', 'inactive'] as EmployeeFilter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Inactifs'}
                </Text>
              </Pressable>
            ))}
          </View>

          {showForm && (
            <SoftCard style={styles.form}>
              <Text style={styles.formTitle}>Nouvel employé</Text>
              <Input placeholder="Prénom *" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
              <Input placeholder="Nom *" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
              <Input
                placeholder="Email *"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
              />
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
              <View style={styles.formActions}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Créer le compte" loading={saving} onPress={save} />
                </View>
                <View style={{ flex: 1 }}>
                  <SecondaryButton label="Annuler" onPress={() => setShowForm(false)} />
                </View>
              </View>
            </SoftCard>
          )}

          {loading ? (
            <Loader />
          ) : filtered.length === 0 ? (
            <Text style={styles.empty}>Aucun employé pour ce filtre.</Text>
          ) : (
            filtered.map((e) => (
              <Pressable key={e.id} onPress={() => router.push(`/employee/${e.id}`)}>
                <Card style={styles.card}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{e.first_name[0]}{e.last_name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{e.first_name} {e.last_name}</Text>
                    <Text style={styles.meta}>{ROLE_LABELS[e.role] || e.role} · {e.email}</Text>
                    <Text style={styles.meta}>{e.missions_completed ?? 0} mission(s)</Text>
                  </View>
                  <View style={[styles.badge, e.is_active ? styles.active : styles.inactive]}>
                    <Text style={styles.badgeText}>{e.is_active ? 'Actif' : 'Inactif'}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Card>
              </Pressable>
            ))
          )}
        </>
      )}

      {pageTab === 'assignments' && (
        loading ? (
          <Loader />
        ) : assignments.length === 0 ? (
          <Text style={styles.empty}>Aucune affectation pour le moment.</Text>
        ) : (
          assignments.map((a) => (
            <Pressable key={a.id} onPress={() => a.mission && router.push(`/mission/${a.mission}`)}>
              <Card style={styles.assignCard}>
                <Text style={styles.name}>{a.mission_title || 'Mission'}</Text>
                <Text style={styles.meta}>Employé : {a.employee_name || '—'}</Text>
                <Text style={styles.meta}>
                  {assignmentStatusLabel(a.assignment_status)}
                  {a.assigned_at ? ` · ${new Date(a.assigned_at).toLocaleString('fr-FR')}` : ''}
                </Text>
                <Text style={styles.link}>Voir la mission ›</Text>
              </Card>
            </Pressable>
          ))
        )
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.text },
  filterTextActive: { color: colors.primary },
  form: { marginBottom: spacing.md, gap: spacing.sm },
  formTitle: { fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: 4 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  roleTextActive: { color: colors.primary },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  assignCard: { marginBottom: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800' },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  active: { backgroundColor: '#d1fae5' },
  inactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8, fontSize: 13 },
});
