import { ReactNode, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { AppHeader } from './AppHeader';
import { useAuth } from '../../context/AuthContext';
import { useFooterVisibility } from '../../context/FooterVisibilityContext';
import { guardPlatformAccess } from '../../utils/navigation';
import { colors, spacing } from '../../constants/theme';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  showBack?: boolean;
  footer?: ReactNode;
}

export function AppLayout({
  children,
  title,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  showBack,
  footer,
}: AppLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { contentInset } = useFooterVisibility();

  useEffect(() => {
    guardPlatformAccess(pathname, user);
  }, [pathname, user]);

  const contentPad = [styles.content, { paddingBottom: spacing.xl + contentInset }, contentStyle];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title={title} />
      {showBack && (
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      )}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentPad}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, ...contentPad]}>{children}</View>
      )}
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backRow: { paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
