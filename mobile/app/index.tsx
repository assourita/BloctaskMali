import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { getLandingData } from '../src/api/landing';
import { Input, PrimaryButton } from '../src/components/buttons';
import { colors, radius, spacing } from '../src/constants/theme';

export default function Index() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ providers: 0, open: 0, done: 0 });
  const [popular, setPopular] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLandingData()
      .then((d) => {
        setStats({
          providers: d.stats?.total_providers ?? 0,
          open: d.stats?.open_missions ?? 0,
          done: d.stats?.completed_missions ?? 0,
        });
        setPopular(d.popular_categories || ['Réparation', 'Ménage', 'Livraison', 'Déménagement']);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user) {
    return <Redirect href={user.can_access_platform === false ? '/(tabs)/profile' : '/home'} />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.nav}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>BlockTask</Text>
        </View>
        <View style={styles.navRight}>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.navLink}>Connexion</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push('/register')}>
            <Text style={styles.navBtnText}>S'inscrire</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.heroBox}>
        <Text style={styles.hero}>Tout faire, sans bouger</Text>
        <Text style={styles.heroSub}>
          Trouvez des prestataires de confiance. Paiement sécurisé, suivi GPS, escrow blockchain.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.providers}</Text>
          <Text style={styles.statLbl}>Prestataires</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.open}</Text>
          <Text style={styles.statLbl}>Missions ouvertes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.done}</Text>
          <Text style={styles.statLbl}>Réalisées</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchTitle}>De quoi avez-vous besoin ?</Text>
        <Input
          placeholder="Ex. livraison, ménage, réparation..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <PrimaryButton label="Commencer gratuitement" onPress={() => router.push('/register')} />
      </View>

      {popular.length > 0 && (
        <View style={styles.popularSection}>
          <Text style={styles.sectionTitle}>Catégories populaires</Text>
          <View style={styles.popular}>
            {popular.map((cat) => (
              <Pressable key={cat} style={styles.chip} onPress={() => router.push('/register')}>
                <Text style={styles.popularLink}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.stepsSection}>
        <Text style={styles.sectionTitle}>Comment ça marche</Text>
        {[
          { n: '1', t: 'Publiez votre mission', d: 'Décrivez votre besoin et fixez votre budget.' },
          { n: '2', t: 'Choisissez un prestataire', d: 'Comparez les profils et les candidatures.' },
          { n: '3', t: 'Suivez en temps réel', d: 'GPS, preuves et paiement Mobile Money sécurisé.' },
        ].map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.n}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.t}</Text>
              <Text style={styles.stepDesc}>{s.d}</Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton label="Créer un compte" onPress={() => router.push('/register')} />
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  root: { paddingHorizontal: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navLink: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  navBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  hero: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center', marginTop: spacing.sm, lineHeight: 19 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.primary },
  statLbl: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  searchBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  searchTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  searchInput: { marginBottom: spacing.sm },
  popularSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  popular: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  popularLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  stepsSection: { marginBottom: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '800' },
  stepTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  stepDesc: { color: colors.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 18 },
});
