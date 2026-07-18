import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Input, PrimaryButton } from '../src/components/buttons';
import { AuthLayout } from '../src/components/layout/AuthLayout';
import { FieldLabel } from '../src/components/ui';
import { verifyEmail, resendVerificationEmail } from '../src/api/notifications';
import { ApiError } from '../src/api/client';
import { colors, spacing } from '../src/constants/theme';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; uid?: string; token?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.uid && params.token) {
      confirm(String(params.uid), String(params.token));
    }
  }, [params.uid, params.token]);

  const confirm = async (uid: string, token: string) => {
    setLoading(true);
    try {
      const res = await verifyEmail(uid, token);
      setVerified(true);
      Alert.alert('Succès', res.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Indiquez votre adresse email');
      return;
    }
    setLoading(true);
    try {
      const res = await resendVerificationEmail(email.trim());
      Alert.alert('Email envoyé', res.message);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <AuthLayout title="Email confirmé" subtitle="Votre compte est activé.">
        <Text style={styles.okTitle}>✓ Adresse vérifiée</Text>
        <Text style={styles.okText}>Vous pouvez maintenant vous connecter à BlockTask.</Text>
        <PrimaryButton label="Se connecter" onPress={() => router.replace('/login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Vérifiez votre email"
      subtitle="Un lien de confirmation a été envoyé à votre adresse."
    >
      <Text style={styles.formTitle}>Confirmez votre compte</Text>
      <Text style={styles.formSubtitle}>
        Ouvrez l'email BlockTask et cliquez sur le lien. Vérifiez aussi vos spams.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FieldLabel>Renvoyer l'email à</FieldLabel>
      <Input
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <PrimaryButton label="Renvoyer l'email" onPress={resend} loading={loading} />

      <Link href="/login" asChild>
        <Pressable>
          <Text style={styles.link}>Retour à la connexion</Text>
        </Pressable>
      </Link>

      <Link href={{ pathname: '/register', params: { email: email } }} asChild>
        <Pressable>
          <Text style={styles.link}>Modifier mes informations d'inscription</Text>
        </Pressable>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  formSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, marginTop: 4, lineHeight: 20 },
  okTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  okText: { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 22 },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
});
