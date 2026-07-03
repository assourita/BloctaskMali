import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user) return null;

  // La barre d'onglets est masquée : la navigation se fait via le sidebar (comme le web).
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="missions" />
      <Tabs.Screen name="available" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
