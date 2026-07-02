import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

/** Ancienne page d'accueil connectée — redirige vers le tableau de bord. */
export default function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/" />;
  return (
    <Redirect
      href={user.can_access_platform === false ? '/(tabs)/profile' : '/(tabs)'}
    />
  );
}
