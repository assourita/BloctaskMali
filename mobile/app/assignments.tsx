import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  createAssignment,
  getAssignments,
  getEmployees,
  type EmployeeAssignment,
  type EnterpriseEmployee,
} from '../src/api/enterprise';
import { getMyMissions } from '../src/api/missions';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { Card, Loader } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { Mission } from '../src/types';

export default function AssignmentsScreen() {
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [employees, setEmployees] = useState<EnterpriseEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [missionId, setMissionId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, m, e] = await Promise.all([
        getAssignments(),
        getMyMissions('enterprise', 'received'),
        getEmployees(),
      ]);
      setAssignments(a);
      setMissions(m.filter((x) => x.deposit_paid && ['accepted', 'in_progress'].includes(x.status)));
      setEmployees(e.filter((x) => x.is_active));
    } catch {
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

  const submit = async () => {
    if (!missionId || !employeeId) {
      Alert.alert('Sélection', 'Choisissez une mission et un employé.');
      return;
    }
    setSaving(true);
    try {
      await createAssignment({ mission: missionId, employee: employeeId });
      Alert.alert('Succès', 'Employé affecté à la mission.');
      setShowForm(false);
      setMissionId('');
      setEmployeeId('');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Affectation impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="Affectations"
      showBack
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <PageHeader
        title="Affectations"
        subtitle="Liez un employé à une mission reçue (caution déposée)"
        action={<PrimaryButton label={showForm ? 'Fermer' : '+ Affecter'} onPress={() => setShowForm((v) => !v)} />}
      />

      {showForm && (
        <SoftCard style={styles.form}>
          <Text style={styles.label}>Mission</Text>
          {missions.length === 0 ? (
            <Text style={styles.hint}>Aucune mission prête — déposez la caution d'abord.</Text>
          ) : (
            missions.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.pick, missionId === m.id && styles.pickActive]}
                onPress={() => setMissionId(m.id)}
              >
                <Text style={styles.pickText}>{m.title}</Text>
              </Pressable>
            ))
          )}
          <Text style={styles.label}>Employé</Text>
          {employees.map((e) => (
            <Pressable
              key={e.id}
              style={[styles.pick, employeeId === e.id && styles.pickActive]}
              onPress={() => setEmployeeId(e.id)}
            >
              <Text style={styles.pickText}>{e.first_name} {e.last_name}</Text>
            </Pressable>
          ))}
          <PrimaryButton label="Confirmer l'affectation" loading={saving} onPress={submit} />
        </SoftCard>
      )}

      {loading ? (
        <Loader />
      ) : assignments.length === 0 ? (
        <Text style={styles.empty}>Aucune affectation enregistrée.</Text>
      ) : (
        assignments.map((a) => (
          <Card key={a.id} style={styles.card}>
            <Text style={styles.title}>{a.mission_title || 'Mission'}</Text>
            <Text style={styles.meta}>{a.employee_name || 'Employé'}</Text>
            <Text style={styles.meta}>{new Date(a.assigned_at).toLocaleString('fr-FR')}</Text>
            <Pressable onPress={() => a.mission && router.push(`/mission/${a.mission}`)}>
              <Text style={styles.link}>Voir la mission</Text>
            </Pressable>
          </Card>
        ))
      )}

      <SecondaryButton label="Gérer les employés" onPress={() => router.push('/employees')} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: spacing.md, gap: spacing.sm },
  label: { fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 13 },
  pick: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 6 },
  pickActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pickText: { color: colors.text, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  card: { marginBottom: spacing.sm },
  title: { fontWeight: '700', fontSize: 15, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8 },
});
