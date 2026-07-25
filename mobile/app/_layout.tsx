import '../src/dev/suppressKeepAwakeDevError';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { SidebarProvider } from '../src/context/SidebarContext';
import { FooterVisibilityProvider } from '../src/context/FooterVisibilityContext';
import { Sidebar } from '../src/components/layout/Sidebar';
import { AppFooter } from '../src/components/layout/AppFooter';
import { ApiError } from '../src/api/client';

LogBox.ignoreLogs([
  'ImageManipulator.manipulateAsync is not available',
  'Unable to resolve manifest assets',
]);

export default function RootLayout() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof ApiError) {
        event.preventDefault();
        if (__DEV__ && event.reason.status !== 401 && event.reason.status !== 403) {
          // eslint-disable-next-line no-console
          console.warn('[BlockTask API]', event.reason.status, event.reason.message);
        }
      }
    };
    // @ts-expect-error RN / Hermes
    globalThis.addEventListener?.('unhandledrejection', handler);
    return () => {
      // @ts-expect-error RN / Hermes
      globalThis.removeEventListener?.('unhandledrejection', handler);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SidebarProvider>
          <FooterVisibilityProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="home" />
              <Stack.Screen name="map" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile-completion" />
              <Stack.Screen name="mission/[id]" />
              <Stack.Screen name="mission/deposit/[id]" />
              <Stack.Screen name="create-mission" />
              <Stack.Screen name="payments" />
              <Stack.Screen name="solicitations" />
              <Stack.Screen name="providers" />
              <Stack.Screen name="tracking" />
              <Stack.Screen name="disputes/index" />
              <Stack.Screen name="help" />
              <Stack.Screen name="applications" />
              <Stack.Screen name="rate" />
              <Stack.Screen name="earnings" />
              <Stack.Screen name="deposit" />
              <Stack.Screen name="employees" />
              <Stack.Screen name="employee/[id]" />
              <Stack.Screen name="assignments" />
              <Stack.Screen name="enterprise-profile" />
              <Stack.Screen name="finances" />
              <Stack.Screen name="analytics" />
              <Stack.Screen name="reputation" />
              <Stack.Screen name="profile-edit" />
              <Stack.Screen name="kyc" />
              <Stack.Screen name="verify-phone" />
              <Stack.Screen name="disputes/new" />
              <Stack.Screen name="disputes/[id]" />
              <Stack.Screen name="tracking/[id]" />
              <Stack.Screen name="provider/[id]" />
              <Stack.Screen name="client/[id]" />
              <Stack.Screen name="teams" />
              <Stack.Screen name="enterprise-appels" />
              <Stack.Screen name="enterprise-invitations" />
              <Stack.Screen name="appels" />
              <Stack.Screen name="invitations" />
              <Stack.Screen name="my-enterprises" />
              <Stack.Screen name="my-enterprise/[id]" />
            </Stack>
            <Sidebar />
            <AppFooter />
          </FooterVisibilityProvider>
        </SidebarProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
