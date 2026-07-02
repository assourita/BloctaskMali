import { Redirect } from 'expo-router';

/** Redirige vers l'onglet profil (section identité / vérification téléphone). */
export default function VerifyPhoneRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
