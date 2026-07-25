import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getEmployees,
  getTeams,
  removeTeamMember,
  setTeamManager,
  type EnterpriseEmployee,
  type EnterpriseTeam,
  type EnterpriseTeamMember,
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, radius, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useEnterpriseGuard } from '../src/hooks/useEnterpriseGuard';
import { ApiError } from '../src/api/client';

function personName(first?: string | null, last?: string | null): string {
  return [first, last]
    .map((p) => (p || '').replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim() || 'Sans nom';
}

function memberEmployeeId(m: EnterpriseTeamMember): string {
  return String(m.employee_id || '').trim();
}

export default function TeamsScreen() {
  const { redirect: guardRedirect } = useEnterpriseGuard();
  const [teams, setTeams] = useState<EnterpriseTeam[]>([]);
  const [employees, setEmployees] = useState<EnterpriseEmployee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, e] = await Promise.all([
      getTeams().catch(() => [] as EnterpriseTeam[]),
      getEmployees().catch(() => [] as EnterpriseEmployee[]),
    ]);
    setTeams(t);
    setEmployees(e.filter((x) => x.is_active));
  }, []);

  const { loading, refreshing, refresh } = useScreenLoad(load, [load]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setCategories((c) => {
          const next = { ...c };
          delete next[id];
          return next;
        });
        if (managerId === id) setManagerId('');
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setDescription('');
    setManagerId('');
    setSelectedIds([]);
    setCategories({});
  };

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', "Donnez un nom à l'équipe.");
      return;
    }
    if (!selectedIds.length && !managerId) {
      Alert.alert('Membres', 'Ajoutez au moins un membre ou un chef.');
      return;
    }
    setSaving(true);
    try {
      const members_payload = selectedIds.map((employee_id) => ({
        employee_id,
        category: (categories[employee_id] || '').trim(),
      }));
      if (managerId && !members_payload.some((m) => m.employee_id === managerId)) {
        members_payload.push({ employee_id: managerId, category: '' });
      }
      await createTeam({
        name: name.trim(),
        description: description.trim(),
        manager: managerId || null,
        members_payload,
      });
      resetForm();
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  };

  const remove = (team: EnterpriseTeam) => {
    Alert.alert('Supprimer', `Supprimer « ${team.name} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          setBusyKey(`del-${team.id}`);
          try {
            await deleteTeam(team.id);
            if (expandedId === team.id) setExpandedId(null);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Suppression impossible');
          } finally {
            setBusyKey(null);
          }
        },
      },
    ]);
  };

  const makeChef = async (team: EnterpriseTeam, m: EnterpriseTeamMember) => {
    const empId = memberEmployeeId(m);
    if (!empId) {
      Alert.alert('Erreur', 'Identifiant employé manquant.');
      return;
    }
    setBusyKey(`chef-${m.id}`);
    try {
      await setTeamManager(team.id, empId);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Impossible de définir le chef');
    } finally {
      setBusyKey(null);
    }
  };

  const retireMember = async (team: EnterpriseTeam, m: EnterpriseTeamMember) => {
    const empId = memberEmployeeId(m);
    if (!empId) {
      Alert.alert('Erreur', 'Identifiant employé manquant.');
      return;
    }
    Alert.alert('Retirer', `Retirer ${personName(m.first_name, m.last_name)} de l'équipe ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          setBusyKey(`rm-${m.id}`);
          try {
            await removeTeamMember(team.id, empId);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Retrait impossible');
          } finally {
            setBusyKey(null);
          }
        },
      },
    ]);
  };

  const addMember = async (team: EnterpriseTeam, employee: EnterpriseEmployee) => {
    setBusyKey(`add-${team.id}-${employee.id}`);
    try {
      await addTeamMember(team.id, employee.id);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Ajout impossible');
    } finally {
      setBusyKey(null);
    }
  };

  if (guardRedirect) return null;

  return (
    <AppLayout title="Équipes" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Gestion des équipes"
        subtitle="Équipes réutilisables à affecter aux missions"
      />

      <PrimaryButton
        label={showForm ? 'Masquer le formulaire' : 'Nouvelle équipe'}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <SoftCard style={styles.form}>
          <Text style={styles.sectionLabel}>Nouvelle équipe</Text>
          <TextInput style={styles.input} placeholder="Nom *" value={name} onChangeText={setName} />
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Description (optionnel)"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.label}>Chef d'équipe (optionnel)</Text>
          {employees.map((e) => (
            <Pressable
              key={`mgr-${e.id}`}
              style={[styles.pick, managerId === e.id && styles.pickActive]}
              onPress={() => setManagerId(managerId === e.id ? '' : e.id)}
            >
              <Text style={styles.pickText}>
                {managerId === e.id ? '✓ ' : ''}
                {personName(e.first_name, e.last_name)}
              </Text>
            </Pressable>
          ))}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Membres</Text>
          <Text style={styles.hint}>Cochez les employés. Catégorie optionnelle.</Text>
          {employees.map((e) => {
            const selected = selectedIds.includes(e.id);
            return (
              <View key={`mem-${e.id}`} style={styles.memberPick}>
                <Pressable
                  style={[styles.pick, selected && styles.pickActive]}
                  onPress={() => toggleMember(e.id)}
                >
                  <Text style={styles.pickText}>
                    {selected ? '✓ ' : ''}
                    {personName(e.first_name, e.last_name)}
                  </Text>
                </Pressable>
                {selected ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Catégorie (optionnel)"
                    value={categories[e.id] || ''}
                    onChangeText={(v) => setCategories((c) => ({ ...c, [e.id]: v }))}
                  />
                ) : null}
              </View>
            );
          })}
          <PrimaryButton label={saving ? 'Création…' : 'Créer l\'équipe'} onPress={create} disabled={saving} />
        </SoftCard>
      ) : null}

      {loading ? (
        <Loader />
      ) : teams.length === 0 ? (
        <Text style={styles.empty}>Aucune équipe pour le moment.</Text>
      ) : (
        teams.map((team) => {
          const memberIds = new Set(
            (team.members || []).map((m) => memberEmployeeId(m)).filter(Boolean),
          );
          const available = employees.filter((e) => !memberIds.has(e.id));
          const expanded = expandedId === team.id;
          return (
            <SoftCard key={team.id} style={styles.card}>
              <Text style={styles.title}>{team.name}</Text>
              <Text style={styles.meta}>
                {team.members_count || team.members?.length || 0} membre(s)
                {team.manager_name
                  ? ` · chef ${String(team.manager_name).replace(/[-–—]+$/g, '').trim()}`
                  : ''}
              </Text>
              {!!team.description?.trim() && (
                <Text style={styles.desc}>{team.description.trim()}</Text>
              )}

              <View style={styles.actions}>
                <SecondaryButton
                  compact
                  label={expanded ? 'Masquer' : 'Membres'}
                  onPress={() => setExpandedId(expanded ? null : team.id)}
                />
                <SecondaryButton
                  compact
                  danger
                  label={busyKey === `del-${team.id}` ? '…' : 'Supprimer'}
                  onPress={() => remove(team)}
                />
              </View>

              {expanded ? (
                <View style={styles.members}>
                  <Text style={styles.sectionLabel}>Membres de l'équipe</Text>
                  {(team.members || []).length === 0 ? (
                    <Text style={styles.hint}>Aucun membre pour l'instant.</Text>
                  ) : (
                    (team.members || []).map((m) => {
                      const isChef = !!(m.is_manager || team.manager === memberEmployeeId(m));
                      return (
                        <View key={m.id} style={styles.memberRow}>
                          <View style={styles.memberHead}>
                            <Text style={styles.memberName}>
                              {personName(m.first_name, m.last_name)}
                            </Text>
                            {isChef ? (
                              <View style={styles.chefBadge}>
                                <Text style={styles.chefBadgeText}>Chef</Text>
                              </View>
                            ) : null}
                          </View>
                          {!!m.category && (
                            <Text style={styles.meta}>Catégorie : {m.category}</Text>
                          )}
                          <View style={styles.actions}>
                            {!isChef ? (
                              <SecondaryButton
                                compact
                                label={busyKey === `chef-${m.id}` ? '…' : 'Nommer chef'}
                                onPress={() => makeChef(team, m)}
                              />
                            ) : null}
                            <SecondaryButton
                              compact
                              danger
                              label={busyKey === `rm-${m.id}` ? '…' : 'Retirer'}
                              onPress={() => retireMember(team, m)}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}

                  {available.length ? (
                    <View style={styles.addBlock}>
                      <Text style={styles.sectionLabel}>Ajouter un membre</Text>
                      {available.map((e) => (
                        <View key={e.id} style={styles.addRow}>
                          <Text style={styles.addName} numberOfLines={1}>
                            {personName(e.first_name, e.last_name)}
                          </Text>
                          <PrimaryButton
                            compact
                            label={busyKey === `add-${team.id}-${e.id}` ? '…' : '+ Ajouter'}
                            onPress={() => addMember(team, e)}
                            disabled={!!busyKey}
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.hint}>Tous les employés actifs sont déjà dans l'équipe.</Text>
                  )}
                </View>
              ) : null}
            </SoftCard>
          );
        })
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.md, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  area: { minHeight: 64, textAlignVertical: 'top' },
  sectionLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: { fontWeight: '600', marginBottom: 6, color: colors.text },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 18 },
  pick: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  pickActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pickText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  memberPick: { marginBottom: 4 },
  card: { marginTop: spacing.md },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  desc: { color: colors.textMuted, marginTop: 8, fontSize: 13, lineHeight: 19 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  members: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  memberRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: { fontWeight: '700', color: colors.text, fontSize: 15, flexShrink: 1 },
  chefBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chefBadgeText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  addBlock: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addName: { flex: 1, fontWeight: '600', color: colors.text, fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
});
