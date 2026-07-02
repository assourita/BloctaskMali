import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getEmployees, type EnterpriseEmployee } from '../api/enterprise';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Loader } from './ui';
import { colors, radius, spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  missionId: string;
  missionTitle?: string;
  onClose: () => void;
  onAssigned: () => void;
  onAssign: (employeeId: string) => Promise<void>;
}

export function AssignEmployeeModal({
  visible,
  missionId,
  missionTitle,
  onClose,
  onAssigned,
  onAssign,
}: Props) {
  const [employees, setEmployees] = useState<EnterpriseEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelected(null);
    getEmployees()
      .then((list) => setEmployees(list.filter((e) => e.is_active)))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, [visible, missionId]);

  const submit = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      await onAssign(selected);
      Alert.alert('Succès', 'Employé assigné à la mission.');
      onAssigned();
      onClose();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Assigner un employé</Text>
          {missionTitle ? <Text style={styles.subtitle}>{missionTitle}</Text> : null}

          {loading ? (
            <Loader />
          ) : employees.length === 0 ? (
            <Text style={styles.empty}>Aucun employé actif — créez-en un dans Employés.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {employees.map((e) => {
                const active = selected === e.id;
                return (
                  <Pressable
                    key={e.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => setSelected(e.id)}
                  >
                    <Text style={styles.rowName}>{e.first_name} {e.last_name}</Text>
                    <Text style={styles.rowMeta}>{e.position || e.role}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Confirmer"
                loading={assigning}
                disabled={!selected}
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
    maxHeight: '80%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  list: { maxHeight: 280, marginBottom: spacing.md },
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
  actions: { flexDirection: 'row', gap: spacing.sm },
});
