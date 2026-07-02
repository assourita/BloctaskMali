import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getProviderPublicProfile, type PublicProviderProfile } from '../../src/api/profile';
import { REPUTATION_LEVEL_LABELS } from '../../src/api/reputation';
import { Badge, Card, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { colors, spacing } from '../../src/constants/theme';

export default function ProviderPublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setProfile(await getProviderPublicProfile(id));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AppLayout showBack title="Prestataire">
        <Loader />
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout showBack title="Prestataire">
        <Text style={styles.error}>Profil introuvable.</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Prestataire">
      <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.first_name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
        {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}

        <View style={styles.badges}>
          {profile.level ? (
            <Badge label={REPUTATION_LEVEL_LABELS[profile.level] || profile.level} tone="info" />
          ) : null}
          {profile.identity_verified ? <Badge label="KYC vérifié" tone="success" /> : null}
          {profile.is_available ? <Badge label="Disponible" tone="success" /> : null}
        </View>

        <Card>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.round(profile.reputation_score ?? 50)}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.total_missions_completed ?? 0}</Text>
              <Text style={styles.statLabel}>Missions</Text>
            </View>
          </View>
        </Card>

        {profile.bio ? (
          <Card>
            <Text style={styles.section}>À propos</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </Card>
        ) : null}

        {profile.skills && profile.skills.length > 0 ? (
          <Card>
            <Text style={styles.section}>Compétences</Text>
            <View style={styles.skills}>
              {profile.skills.map((s) => (
                <View key={s} style={styles.skill}>
                  <Text style={styles.skillText}>{s}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  city: { color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.accent },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  section: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  bio: { color: colors.text, lineHeight: 22 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skill: { backgroundColor: '#f0faf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  skillText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  error: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
