import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getEmployees,
  getTeams,
  type EnterpriseEmployee,
  type EnterpriseTeam,
} from '../api/enterprise';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Loader } from './ui';
import { colors, radius, spacing } from '../constants/theme';

export type AssignPayload =
  | { mode: 'employee'; employeeId: string }
  | { mode: 'team'; teamId: string; leadEmployeeId?: string };

interface Props {
  visible: boolean;
  missionId: string;
  missionTitle?: string;
  onClose: () => void;
  onAssigned: () => void;
  onAssign: (payload: AssignPayload) => Promise<void>;
}

export function AssignEmployeeModal({
  visible,
  missionId,
  missionTitle,
  onClose,
  onAssigned,
  onAssign,
}: Props) {
  const [mode, setMode] = useState<'employee' | 'team'>('employee');
  const [employees, setEmployees] = useState<EnterpriseEmployee[]>([]);
  const [teams, setTeams] = useState<EnterpriseTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelectedEmployee(null);
    setSelectedTeam(null);
    setSelectedLead(null);
    setMode('employee');
    Promise.all([getEmployees(), getTeams()])
      .then(([emps, tms]) => {
        setEmployees(emps.filter((e) => e.is_active));
        setTeams(tms.filter((t) => t.is_active !== false));
      })
      .catch(() => {
        setEmployees([]);
        setTeams([]);
      })
      .finally(() => setLoading(false));
  }, [visible, missionId]);

  const teamMembers = teams.find((t) => t.id === selectedTeam)?.members || [];

  const submit = async () => {
    setAssigning(true);
    try {
      if (mode === 'employee') {
        if (!selectedEmployee) return;
        await onAssign({ mode: 'employee', employeeId: selectedEmployee });
      } else {
        if (!selectedTeam) return;
        await onAssign({
          mode: 'team',
          teamId: selectedTeam,
          leadEmployeeId: selectedLead || undefined,
        });
      }
      Alert.alert('Succès', mode === 'team' ? 'Équipe affectée.' : 'Employé assigné.');
      onAssigned();
      onClose();
    } finally {
      setAssigning(false);
    }
  };

  const canSubmit = mode === 'employee' ? !!selectedEmployee : !!selectedTeam;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Affecter employé / équipe</Text>
          {missionTitle ? <Text style={styles.subtitle}>{missionTitle}</Text> : null}

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'employee' && styles.tabActive]}
              onPress={() => setMode('employee')}
            >
              <Text style={[styles.tabText, mode === 'employee' && styles.tabTextActive]}>Employé</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'team' && styles.tabActive]}
              onPress={() => setMode('team')}
            >
              <Text style={[styles.tabText, mode === 'team' && styles.tabTextActive]}>Équipe</Text>
            </Pressable>
          </View>

          {loading ? (
            <Loader />
          ) : mode === 'employee' ? (
            employees.length === 0 ? (
              <Text style={styles.empty}>Aucun employé actif.</Text>
            ) : (
              <ScrollView style={styles.list}>
                {employees.map((e) => {
                  const active = selectedEmployee === e.id;
                  return (
                    <Pressable
                      key={e.id}
                      style={[styles.row, active && styles.rowActive]}
                      onPress={() => setSelectedEmployee(e.id)}
                    >
                      <Text style={styles.rowName}>{e.first_name} {e.last_name}</Text>
                      <Text style={styles.rowMeta}>{e.position || e.role}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )
          ) : teams.length === 0 ? (
            <Text style={styles.empty}>Aucune équipe — créez-en une dans Équipes.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {teams.map((t) => {
                const active = selectedTeam === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      setSelectedTeam(t.id);
                      setSelectedLead(t.manager ? String(t.manager) : null);
                    }}
                  >
                    <Text style={styles.rowName}>{t.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t.members_count || t.members?.length || 0} membre(s)
                      {t.manager_name ? ` · chef ${t.manager_name}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
              {selectedTeam && teamMembers.length > 0 ? (
                <View style={styles.leadBlock}>
                  <Text style={styles.leadTitle}>Chef pour cette mission</Text>
                  {teamMembers.map((m) => {
                    const active = selectedLead === m.employee_id;
                    return (
                      <Pressable
                        key={m.employee_id}
                        style={[styles.row, active && styles.rowActive]}
                        onPress={() => setSelectedLead(m.employee_id)}
                      >
                        <Text style={styles.rowName}>{m.first_name} {m.last_name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Confirmer"
                loading={assigning}
                disabled={!canSubmit}
                onPress={submit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Annuler" onPress={onClose} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  list: { maxHeight: 320, marginBottom: spacing.md },
  row: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowName: { fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  leadBlock: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  leadTitle: { fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
