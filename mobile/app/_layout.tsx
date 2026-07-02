import '../src/dev/suppressKeepAwakeDevError';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { SidebarProvider } from '../src/context/SidebarContext';
import { Sidebar } from '../src/components/layout/Sidebar';
import { AppFooter } from '../src/components/layout/AppFooter';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
      <SidebarProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile-completion" />
          <Stack.Screen name="mission/[id]" />
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
          <Stack.Screen name="disputes/new" />
          <Stack.Screen name="disputes/[id]" />
          <Stack.Screen name="tracking/[id]" />
          <Stack.Screen name="provider/[id]" />
        </Stack>
        <Sidebar />
        <AppFooter />
      </SidebarProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
