import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Input, PasswordInput, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AuthLayout } from '../src/components/layout/AuthLayout';
import { FieldLabel } from '../src/components/ui';
import { GOOGLE_REDIRECT_URI, GOOGLE_WEB_CLIENT_ID, useGoogleAuth } from '../src/services/googleAuth';
import { loginWithGoogle } from '../src/api/auth';
import { registerDevicePushToken } from '../src/services/pushNotifications';
import { navigateAfterAuth } from '../src/utils/navigation';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';
import type { UserRole } from '../src/types';

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: 'client', label: 'Client', desc: 'Je délègue des missions' },
  { id: 'provider', label: 'Prestataire', desc: 'Je réalise des missions' },
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole>('client');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone_number: '+223',
    password: '',
    password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [, googleResponse, promptGoogle] = useGoogleAuth();

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'error') {
      Alert.alert(
        'Erreur Google',
        googleResponse.error?.message ||
          'Autorisation refusée. Vérifiez les utilisateurs test dans Google Cloud.',
      );
      return;
    }
    if (googleResponse.type !== 'success') return;
    const idToken =
      googleResponse.authentication?.idToken ||
      (googleResponse.params?.id_token as string | undefined);
    if (!idToken) {
      Alert.alert('Erreur', `Token Google introuvable. Redirect URI attendu : ${GOOGLE_REDIRECT_URI}`);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const profile = await loginWithGoogle(idToken, role);
        await registerDevicePushToken();
        navigateAfterAuth(profile);
      } catch (e) {
        Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Inscription Google impossible');
      } finally {
        setLoading(false);
      }
    })();
  }, [googleResponse, role]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name || !form.username) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      const res = await register({ ...form, user_type: role });
      router.replace({ pathname: '/verify-email', params: { email: res.email || form.email } });
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Inscription impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Rejoignez BlockTask"
      subtitle="Client ou prestataire — créez votre compte en quelques étapes."
    >
      <Text style={styles.formTitle}>Inscription</Text>
      <Text style={styles.formSubtitle}>Choisissez le profil qui vous correspond</Text>

      <View style={styles.roleGrid}>
        {ROLES.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.roleCard, role === r.id && styles.roleCardActive]}
            onPress={() => setRole(r.id)}
          >
            <Text style={[styles.roleLabel, role === r.id && styles.roleLabelActive]}>{r.label}</Text>
            <Text style={styles.roleDesc}>{r.desc}</Text>
          </Pressable>
        ))}
      </View>

      <FieldLabel>Prénom</FieldLabel>
      <Input placeholder="Prénom" value={form.first_name} onChangeText={(v) => update('first_name', v)} />
      <FieldLabel>Nom</FieldLabel>
      <Input placeholder="Nom" value={form.last_name} onChangeText={(v) => update('last_name', v)} />
      <FieldLabel>Email</FieldLabel>
      <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => update('email', v)} />
      <FieldLabel>Nom d'utilisateur</FieldLabel>
      <Input placeholder="Identifiant" autoCapitalize="none" value={form.username} onChangeText={(v) => update('username', v)} />
      <FieldLabel>Téléphone</FieldLabel>
      <Input placeholder="+223..." value={form.phone_number} onChangeText={(v) => update('phone_number', v)} />
      <FieldLabel>Mot de passe</FieldLabel>
      <PasswordInput placeholder="Mot de passe" value={form.password} onChangeText={(v) => update('password', v)} />
      <FieldLabel>Confirmation</FieldLabel>
      <PasswordInput placeholder="Confirmer" value={form.password_confirm} onChangeText={(v) => update('password_confirm', v)} />

      <PrimaryButton label="Créer mon compte" onPress={onSubmit} loading={loading} />

      {GOOGLE_WEB_CLIENT_ID ? (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
          <SecondaryButton label="Continuer avec Google" onPress={() => promptGoogle()} />
        </>
      ) : null}

      <Link href="/login" asChild>
        <Pressable style={styles.footer}>
          <Text style={styles.footerText}>
            Déjà un compte ? <Text style={styles.linkText}>Se connecter</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  formSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, marginTop: 4 },
  roleGrid: { gap: spacing.sm, marginBottom: spacing.md },
  roleCard: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: { fontWeight: '700', fontSize: 15, color: colors.text },
  roleLabelActive: { color: colors.primary },
  roleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  linkText: { color: colors.primary, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
});
