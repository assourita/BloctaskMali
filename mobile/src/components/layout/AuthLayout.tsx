import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Layout connexion / inscription — panneau vert + carte formulaire, adapté mobile. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandPanel}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>BlockTask</Text>
          </View>
          <Text style={styles.brandTitle}>{title}</Text>
          {subtitle ? <Text style={styles.brandSubtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.card}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md },
  brandPanel: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  logoDot: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#fff' },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  brandTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  brandSubtitle: { color: '#eafff3', fontSize: 14, marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
