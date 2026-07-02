import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../constants/config';
import { colors, radius, spacing } from '../constants/theme';

interface NetworkBannerProps {
  message: string;
  onRetry?: () => void;
}

export function NetworkBanner({ message, onRetry }: NetworkBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Connexion impossible</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>
        Backend : {API_URL.replace('/api', '')} — lancez{' '}
        <Text style={styles.code}>python manage.py runserver 0.0.0.0:8000</Text>
      </Text>
      {onRetry ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontWeight: '800', color: '#9a3412', fontSize: 15, marginBottom: 4 },
  message: { color: '#7c2d12', fontSize: 13, lineHeight: 18 },
  hint: { color: '#9a3412', fontSize: 12, marginTop: 8, lineHeight: 17 },
  code: { fontFamily: 'monospace', fontWeight: '700' },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
