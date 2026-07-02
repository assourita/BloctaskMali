import { Redirect } from 'expo-router';

/** Redirige vers l'onglet profil (4 onglets) — ancien écran conservé pour compatibilité routes. */
export default function ProfileCompletionRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
