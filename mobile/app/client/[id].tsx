import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getClientPublicProfile, type PublicClientProfile } from '../../src/api/profile';
import { Badge, Card, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { colors, spacing } from '../../src/constants/theme';

export default function ClientPublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setProfile(await getClientPublicProfile(id));
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
      <AppLayout showBack title="Client">
        <Loader />
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout showBack title="Client">
        <Text style={styles.error}>Profil introuvable.</Text>
      </AppLayout>
    );
  }

  const displayName = profile.enterprise_name
    || `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <AppLayout showBack title="Client">
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{profile.first_name.charAt(0)}</Text>
      </View>
      <Text style={styles.name}>{displayName}</Text>
      {profile.user_type === 'enterprise' && profile.enterprise_name ? (
        <Text style={styles.subtitle}>
          {profile.first_name} {profile.last_name} · Entreprise
        </Text>
      ) : null}
      {profile.city ? <Text style={styles.city}>{profile.city}{profile.country ? `, ${profile.country}` : ''}</Text> : null}

      <View style={styles.badges}>
        {profile.identity_verified ? <Badge label="KYC vérifié" tone="success" /> : null}
        {profile.user_type === 'enterprise' ? <Badge label="Entreprise" tone="info" /> : null}
      </View>

      <Card>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.missions_posted ?? 0}</Text>
            <Text style={styles.statLabel}>Missions publiées</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.missions_completed ?? 0}</Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </View>
        </View>
      </Card>

      {profile.bio ? (
        <Card>
          <Text style={styles.section}>À propos</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </Card>
      ) : null}

      <Text style={styles.hint}>
        Coordonnées complètes visibles une fois la mission démarrée.
      </Text>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  error: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 28 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  city: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  section: { fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  bio: { color: colors.text, lineHeight: 21 },
  hint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
