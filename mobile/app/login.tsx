import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Input, PasswordInput, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { AuthLayout } from '../src/components/layout/AuthLayout';
import { FieldLabel } from '../src/components/ui';
import { navigateAfterAuth } from '../src/utils/navigation';
import { GOOGLE_REDIRECT_URI, GOOGLE_WEB_CLIENT_ID, useGoogleAuth } from '../src/services/googleAuth';
import { loginWithGoogle } from '../src/api/auth';
import { registerDevicePushToken } from '../src/services/pushNotifications';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const profile = await loginWithGoogle(idToken);
        await registerDevicePushToken();
        navigateAfterAuth(profile);
      } catch (e) {
        Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Connexion Google impossible');
      } finally {
        setLoading(false);
      }
    })();
  }, [googleResponse]);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      const profile = await login({ email: email.trim(), password });
      navigateAfterAuth(profile);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        const data = e.data as { code?: string; email?: string; detail?: string } | undefined;
        if (data?.code === 'email_not_verified') {
          router.replace({
            pathname: '/verify-email',
            params: { email: data.email || email.trim() },
          });
          return;
        }
      }
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bienvenue"
      subtitle="Connectez-vous pour gérer vos missions et sécuriser vos paiements en FCFA."
    >
      <Text style={styles.formTitle}>Connexion</Text>
      <Text style={styles.formSubtitle}>Accédez à votre espace BlockTask</Text>

      <FieldLabel>Adresse email</FieldLabel>
      <Input placeholder="vous@exemple.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

      <FieldLabel>Mot de passe</FieldLabel>
      <PasswordInput placeholder="••••••••" value={password} onChangeText={setPassword} />

      <Link href="/forgot-password" asChild>
        <Pressable style={styles.forgot}>
          <Text style={styles.linkText}>Mot de passe oublié ?</Text>
        </Pressable>
      </Link>

      <PrimaryButton label="Se connecter" onPress={onSubmit} loading={loading} />

      {GOOGLE_WEB_CLIENT_ID ? (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
          <SecondaryButton
            label="Continuer avec Google"
            onPress={() => promptGoogle()}
          />
        </>
      ) : null}

      <Link href="/register" asChild>
        <Pressable style={styles.footer}>
          <Text style={styles.footerText}>
            Pas encore de compte ? <Text style={styles.linkText}>Créer un compte</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  formSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, marginTop: 4 },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
});
