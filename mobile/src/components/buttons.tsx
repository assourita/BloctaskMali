import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../constants/theme';

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.primary,
        compact && styles.primaryCompact,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.primaryText, compact && styles.primaryTextCompact]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  compact,
  danger,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.secondary,
        compact && styles.secondaryCompact,
        danger && styles.secondaryDanger,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.secondaryText,
          compact && styles.secondaryTextCompact,
          danger && styles.secondaryTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={colors.textMuted} />;
}

/** Champ mot de passe avec bouton afficher/masquer. */
export function PasswordInput(props: Omit<TextInputProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordWrap}>
      <TextInput
        {...props}
        style={[styles.input, styles.passwordInput, props.style]}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.eyeBtn} onPress={() => setVisible((v) => !v)} hitSlop={10}>
        <Text style={styles.eyeText}>{visible ? 'Masquer' : 'Afficher'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryCompact: {
    marginTop: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexGrow: 0,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  primaryTextCompact: { fontSize: 13 },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#fff',
  },
  secondaryCompact: {
    marginTop: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexGrow: 0,
  },
  secondaryDanger: { borderColor: colors.danger },
  secondaryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  secondaryTextCompact: { fontSize: 13 },
  secondaryTextDanger: { color: colors.danger },
  disabled: { opacity: 0.6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 78 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeText: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
});
