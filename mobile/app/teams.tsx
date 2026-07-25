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
} from '../src/api/enterprise';
import { PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { Loader } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { useEnterpriseGuard } from '../src/hooks/useEnterpriseGuard';
import { ApiError } from '../src/api/client';

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
  const [pickMember, setPickMember] = useState<Record<string, string>>({});
  const [pickCategory, setPickCategory] = useState<Record<string, string>>({});

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
          try {
            await deleteTeam(team.id);
            await load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Suppression impossible');
          }
        },
      },
    ]);
  };

  if (guardRedirect) return null;

  return (
    <AppLayout title="Équipes" showBack refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Gestion des équipes"
        subtitle="Équipes réutilisables à affecter aux missions"
      />

      <PrimaryButton
        label={showForm ? 'Masquer' : 'Nouvelle équipe'}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <SoftCard style={styles.form}>
          <TextInput style={styles.input} placeholder="Nom *" value={name} onChangeText={setName} />
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Description"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.label}>Chef (optionnel)</Text>
          {employees.map((e) => (
            <Pressable
              key={`mgr-${e.id}`}
              style={[styles.pick, managerId === e.id && styles.pickActive]}
              onPress={() => setManagerId(managerId === e.id ? '' : e.id)}
            >
              <Text>{e.first_name} {e.last_name}</Text>
            </Pressable>
          ))}
          <Text style={[styles.label, { marginTop: 8 }]}>Membres</Text>
          <Text style={styles.hint}>Cochez les employés. Catégorie optionnelle.</Text>
          {employees.map((e) => {
            const selected = selectedIds.includes(e.id);
            return (
              <View key={`mem-${e.id}`} style={styles.memberPick}>
                <Pressable
                  style={[styles.pick, selected && styles.pickActive]}
                  onPress={() => toggleMember(e.id)}
                >
                  <Text>{selected ? '✓ ' : ''}{e.first_name} {e.last_name}</Text>
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
          <PrimaryButton label={saving ? '…' : 'Créer'} onPress={create} disabled={saving} />
        </SoftCard>
      ) : null}

      {loading ? (
        <Loader />
      ) : teams.length === 0 ? (
        <Text style={styles.empty}>Aucune équipe pour le moment.</Text>
      ) : (
        teams.map((team) => {
          const memberIds = new Set((team.members || []).map((m) => m.employee_id));
          const available = employees.filter((e) => !memberIds.has(e.id));
          return (
            <SoftCard key={team.id} style={styles.card}>
              <Text style={styles.title}>{team.name}</Text>
              <Text style={styles.meta}>
                {team.members_count || team.members?.length || 0} membre(s)
                {team.manager_name ? ` · chef ${team.manager_name}` : ''}
              </Text>
              {!!team.description && <Text style={styles.desc}>{team.description}</Text>}
              <View style={styles.actions}>
                <SecondaryButton
                  label={expandedId === team.id ? 'Masquer' : 'Membres'}
                  onPress={() => setExpandedId(expandedId === team.id ? null : team.id)}
                />
                <SecondaryButton label="Supprimer" onPress={() => remove(team)} />
              </View>
              {expandedId === team.id ? (
                <View style={styles.members}>
                  {(team.members || []).map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Text style={styles.memberName}>
                        {m.first_name} {m.last_name}
                        {(m.is_manager || team.manager === m.employee_id) ? ' · Chef' : ''}
                      </Text>
                      {!!m.category && <Text style={styles.meta}>Catégorie : {m.category}</Text>}
                      <View style={styles.actions}>
                        {team.manager !== m.employee_id ? (
                          <SecondaryButton
                            label="Chef"
                            onPress={async () => {
                              await setTeamManager(team.id, m.employee_id);
                              await load();
                            }}
                          />
                        ) : null}
                        <SecondaryButton
                          label="Retirer"
                          onPress={async () => {
                            await removeTeamMember(team.id, m.employee_id);
                            await load();
                          }}
                        />
                      </View>
                    </View>
                  ))}
                  {available.length ? (
                    <View style={styles.addBlock}>
                      <Text style={styles.label}>Ajouter</Text>
                      {available.map((e) => (
                        <Pressable
                          key={e.id}
                          style={[styles.pick, pickMember[team.id] === e.id && styles.pickActive]}
                          onPress={() => setPickMember((p) => ({ ...p, [team.id]: e.id }))}
                        >
                          <Text>{e.first_name} {e.last_name}</Text>
                        </Pressable>
                      ))}
                      <TextInput
                        style={styles.input}
                        placeholder="Catégorie (optionnel)"
                        value={pickCategory[team.id] || ''}
                        onChangeText={(v) => setPickCategory((p) => ({ ...p, [team.id]: v }))}
                      />
                      <PrimaryButton
                        label="Ajouter le membre"
                        onPress={async () => {
                          const id = pickMember[team.id];
                          if (!id) return;
                          await addTeamMember(team.id, id, pickCategory[team.id]);
                          setPickMember((p) => ({ ...p, [team.id]: '' }));
                          setPickCategory((p) => ({ ...p, [team.id]: '' }));
                          await load();
                        }}
                      />
                    </View>
                  ) : null}
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
  form: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
  },
  area: { minHeight: 64, textAlignVertical: 'top' },
  label: { fontWeight: '600', marginBottom: 6, color: colors.text },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  pick: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 6,
  },
  pickActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  memberPick: { marginBottom: 4 },
  card: { marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 2 },
  desc: { color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  members: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  memberRow: { marginBottom: 10 },
  memberName: { fontWeight: '600', color: colors.text },
  addBlock: { marginTop: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
});
