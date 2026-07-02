import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLandingData, type LandingProvider } from '../src/api/landing';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Input, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { colors, radius, shadow, spacing } from '../src/constants/theme';

export default function HomeScreen() {
  const { user, activeRole } = useAuth();
  const isProvider = activeRole === 'provider';
  const [stats, setStats] = useState({ providers: 0, open: 0, done: 0 });
  const [providers, setProviders] = useState<LandingProvider[]>([]);
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
        setProviders(d.featured_providers || []);
        setPopular(d.popular_categories || ['Réparation', 'Ménage', 'Livraison', 'Déménagement']);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Tout faire, sans bouger</Text>
        <Text style={styles.heroSub}>
          Trouvez des prestataires de confiance près de chez vous. Paiement sécurisé, suivi en temps réel.
        </Text>
        <View style={styles.heroStats}>
          <HeroStat value={stats.providers} label="Prestataires" />
          <HeroStat value={stats.open} label="Missions ouvertes" />
          <HeroStat value={stats.done} label="Réalisées" />
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>De quoi avez-vous besoin ?</Text>
        <Input
          placeholder="Ex. livraison, ménage, réparation..."
          value={search}
          onChangeText={setSearch}
        />
        {!isProvider ? (
          <PrimaryButton
            label="Créer une mission"
            onPress={() => router.push('/create-mission')}
          />
        ) : (
          <PrimaryButton
            label="Voir les missions disponibles"
            onPress={() => router.push('/(tabs)/available')}
          />
        )}
      </View>

      {/* Catégories populaires */}
      {popular.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories populaires</Text>
          <View style={styles.chips}>
            {popular.map((cat) => (
              <Pressable
                key={cat}
                style={styles.chip}
                onPress={() => !isProvider && router.push('/create-mission')}
              >
                <Text style={styles.chipText}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Prestataires */}
      {providers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Prestataires recommandés</Text>
            <Pressable onPress={() => router.push('/providers')}>
              <Text style={styles.link}>Voir tout</Text>
            </Pressable>
          </View>
          {providers.slice(0, 6).map((p) => (
            <Pressable
              key={p.id}
              style={[styles.providerCard, shadow]}
              onPress={() => router.push(`/provider/${p.id}`)}
            >
              <View style={styles.providerAvatar}>
                <Text style={styles.providerInitials}>
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.first_name} {p.last_name}</Text>
                <Text style={styles.providerMeta}>{p.city} · {p.completed_missions} missions</Text>
                {p.skills?.length ? (
                  <Text style={styles.providerSkills} numberOfLines={1}>
                    {p.skills.slice(0, 3).join(' · ')}
                  </Text>
                ) : null}
              </View>
              {p.identity_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Vérifié</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Comment ça marche */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comment ça marche</Text>
        {[
          { step: '1', title: 'Publiez votre mission', desc: 'Décrivez votre besoin et fixez votre budget.' },
          { step: '2', title: 'Choisissez un prestataire', desc: 'Comparez les profils et les candidatures.' },
          { step: '3', title: 'Suivez en temps réel', desc: 'GPS, preuves photo et paiement sécurisé.' },
        ].map((item) => (
          <View key={item.step} style={styles.stepCard}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{item.step}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>
          Bonjour {user?.first_name || ''}, prêt à commencer ?
        </Text>
        <PrimaryButton
          label="Mon tableau de bord"
          onPress={() => router.push('/(tabs)')}
        />
        <SecondaryButton label="Aide & Support" onPress={() => router.push('/help')} />
      </View>

      {loading && <Text style={styles.loading}>Chargement...</Text>}
    </AppLayout>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatNum}>{value}</Text>
      <Text style={styles.heroStatLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#1a1a2e',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13.5, color: '#cbd5e1', textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.lg },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontSize: 26, fontWeight: '800', color: colors.primary },
  heroStatLbl: { fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm, fontSize: 15 },

  section: { marginBottom: spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  providerInitials: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  providerName: { fontWeight: '700', color: colors.text, fontSize: 15 },
  providerMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  providerSkills: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
  verifiedBadge: { backgroundColor: '#ecfdf3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  verifiedText: { color: colors.primary, fontSize: 10, fontWeight: '700' },

  stepCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stepTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  stepDesc: { color: colors.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 18 },

  cta: { marginBottom: spacing.lg },
  ctaTitle: { fontWeight: '700', color: colors.text, fontSize: 16, marginBottom: spacing.sm, textAlign: 'center' },
  loading: { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.md },
});
