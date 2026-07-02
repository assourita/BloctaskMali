import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  getAllEnterprises,
  getAllProviders,
  type LandingEnterprise,
  type LandingProvider,
} from '../src/api/landing';
import { getMyMissions, solicitEnterprise, solicitProvider } from '../src/api/missions';
import { useScreenLoad } from '../src/utils/useScreenLoad';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard, TabBar } from '../src/components/widgets';
import { Input } from '../src/components/buttons';
import { Loader } from '../src/components/ui';
import { colors, radius, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { Mission } from '../src/types';

const ASSIGNABLE = ['funded', 'published', 'pending'];
type Tab = 'providers' | 'enterprises';

export default function ProvidersScreen() {
  const params = useLocalSearchParams<{ missionId?: string }>();
  const preselectedMissionId = params.missionId ? String(params.missionId) : '';
  const { activeRole } = useAuth();
  const missionRole = activeRole === 'enterprise' ? 'enterprise' : 'client';
  const [tab, setTab] = useState<Tab>('providers');
  const [providers, setProviders] = useState<LandingProvider[]>([]);
  const [enterprises, setEnterprises] = useState<LandingEnterprise[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [query, setQuery] = useState('');
  const [targetProvider, setTargetProvider] = useState<LandingProvider | null>(null);
  const [targetEnterprise, setTargetEnterprise] = useState<LandingEnterprise | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingEnterprises, setLoadingEnterprises] = useState(false);

  const loadData = useCallback(async () => {
    const [p, m, e] = await Promise.all([
      getAllProviders(),
      getMyMissions(missionRole),
      getAllEnterprises().catch(() => [] as LandingEnterprise[]),
    ]);
    setProviders(p);
    setMissions(m);
    setEnterprises(e);
  }, [missionRole]);

  const { loading, refreshing, refresh } = useScreenLoad(loadData, [loadData]);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
      (p) =>
        `${p.first_name} ${p.last_name} ${p.city}`.toLowerCase().includes(q) ||
        (p.skills || []).some((s) => s.toLowerCase().includes(q)),
    );
  }, [providers, query]);

  const filteredEnterprises = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enterprises;
    return enterprises.filter(
      (e) => `${e.company_name} ${e.city}`.toLowerCase().includes(q),
    );
  }, [enterprises, query]);

  const assignable = useMemo(
    () => missions.filter((m) => ASSIGNABLE.includes(m.status) && !m.provider && !m.assigned_enterprise_id),
    [missions],
  );

  const sendToProvider = async (mission: Mission) => {
    if (!targetProvider) return;
    setSending(true);
    try {
      await solicitProvider(mission.id, targetProvider.id, 'Je souhaite vous confier cette mission.');
      Alert.alert('Sollicitation envoyée', `${targetProvider.first_name} a été sollicité.`);
      setTargetProvider(null);
      if (preselectedMissionId) router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  const sendToEnterprise = async (mission: Mission) => {
    if (!targetEnterprise) return;
    setSending(true);
    try {
      await solicitEnterprise(mission.id, targetEnterprise.id, 'Je souhaite confier cette mission à votre entreprise.');
      Alert.alert('Sollicitation envoyée', `${targetEnterprise.company_name} a été sollicitée.`);
      setTargetEnterprise(null);
      if (preselectedMissionId) router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  const modalMissions = useMemo(() => {
    if (!preselectedMissionId) return assignable;
    const match = assignable.filter((m) => m.id === preselectedMissionId);
    return match.length ? match : assignable;
  }, [assignable, preselectedMissionId]);

  const modalTarget = targetProvider || targetEnterprise;
  const closeModal = () => {
    setTargetProvider(null);
    setTargetEnterprise(null);
  };

  return (
    <AppLayout refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Attribuer une mission"
        subtitle="Sollicitez un prestataire ou une entreprise"
        action={
          <Pressable style={styles.headerBtn} onPress={() => router.push('/solicitations')}>
            <Text style={styles.headerBtnText}>Envoyées</Text>
          </Pressable>
        }
      />

      {preselectedMissionId ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Mission sélectionnée — choisissez un prestataire ou une entreprise à solliciter.
          </Text>
        </View>
      ) : null}

      <TabBar
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'providers', label: 'Prestataires', count: providers.length },
          { id: 'enterprises', label: 'Entreprises', count: enterprises.length },
        ]}
      />

      <Input placeholder="Rechercher..." value={query} onChangeText={setQuery} />

      {loading ? (
        <Loader />
      ) : tab === 'providers' ? (
        filteredProviders.length === 0 ? (
          <Text style={styles.empty}>Aucun prestataire trouvé.</Text>
        ) : (
          filteredProviders.map((p) => (
            <SoftCard key={p.id}>
              <Text style={styles.name}>{p.first_name} {p.last_name}</Text>
              <Text style={styles.meta}>{p.city} · {p.completed_missions} missions</Text>
              <View style={styles.actions}>
                <Pressable style={styles.secondary} onPress={() => router.push(`/provider/${p.id}`)}>
                  <Text style={styles.secondaryText}>Profil</Text>
                </Pressable>
                <Pressable style={styles.primary} onPress={() => setTargetProvider(p)}>
                  <Text style={styles.primaryText}>Solliciter</Text>
                </Pressable>
              </View>
            </SoftCard>
          ))
        )
      ) : tab === 'enterprises' && loading ? (
        <Loader />
      ) : filteredEnterprises.length === 0 ? (
        <Text style={styles.empty}>Aucune entreprise trouvée.</Text>
      ) : (
        filteredEnterprises.map((e) => (
          <SoftCard key={e.id}>
            <Text style={styles.name}>{e.company_name}</Text>
            <Text style={styles.meta}>{e.city} · {e.total_employees ?? 0} employé(s)</Text>
            <Pressable style={[styles.primary, { marginTop: spacing.sm }]} onPress={() => setTargetEnterprise(e)}>
              <Text style={styles.primaryText}>Solliciter l'entreprise</Text>
            </Pressable>
          </SoftCard>
        ))
      )}

      <Modal visible={!!modalTarget} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {targetProvider
                ? `Attribuer à ${targetProvider.first_name} ${targetProvider.last_name}`
                : `Solliciter ${targetEnterprise?.company_name}`}
            </Text>
            {modalMissions.length === 0 ? (
              <Text style={styles.empty}>Aucune mission financée disponible.</Text>
            ) : (
              modalMissions.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.missionOpt}
                  disabled={sending}
                  onPress={() => (targetProvider ? sendToProvider(m) : sendToEnterprise(m))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={styles.meta}>{Number(m.budget).toLocaleString('fr-FR')} XOF</Text>
                  </View>
                  <Text style={styles.send}>Envoyer ›</Text>
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  headerBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  headerBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  banner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  bannerText: { color: '#065f46', fontSize: 13, lineHeight: 18 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondary: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  primary: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  missionOpt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  missionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  send: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
