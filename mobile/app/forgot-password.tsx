import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { requestPasswordReset } from '../src/api/profile';
import { Input, PrimaryButton } from '../src/components/buttons';
import { AuthLayout } from '../src/components/layout/AuthLayout';
import { FieldLabel } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Saisissez votre adresse email.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Recevez un lien de réinitialisation par email."
      showBack
    >
      {sent ? (
        <Text style={styles.success}>
          Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
        </Text>
      ) : (
        <>
          <FieldLabel>Adresse email</FieldLabel>
          <Input
            placeholder="vous@exemple.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton label="Envoyer le lien" onPress={onSubmit} loading={loading} />
        </>
      )}

      <Link href="/login" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Retour à la connexion</Text>
        </Pressable>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  success: { color: colors.primary, lineHeight: 22, fontSize: 14 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
});
