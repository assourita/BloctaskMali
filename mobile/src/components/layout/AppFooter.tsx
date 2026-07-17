import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { GridIcon, HelpIcon, MapPinIcon } from '../icons';
import { colors, radius, shadow, spacing } from '../../constants/theme';

/** Hauteur utile pour le padding du contenu (hors safe area bas). */
export const APP_FOOTER_CONTENT_INSET = 78;

const HIDDEN_PREFIXES = ['/', '/login', '/register', '/forgot-password'];

function isHiddenRoute(pathname: string, hasUser: boolean, user: any) {
  if (!hasUser) return true;
  if (pathname === '/' || pathname === '') return true;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  
  // Hide footer if profile is not complete or not verified by admin
  const isProfileComplete = user?.first_name && user?.last_name && user?.phone_number;
  const isVerified = user?.kyc_status === 'verified' || user?.identity_verified === true;
  
  if (!isProfileComplete || !isVerified) return true;
  
  return false;
}

function isDashboardRoute(pathname: string, segments: string[]) {
  if (pathname === '/' || pathname === '/(tabs)') return true;
  return segments[0] === '(tabs)' && (!segments[1] || segments[1] === 'index');
}

type TabKey = 'dashboard' | 'map' | 'help';

export function AppFooter() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const { user } = useAuth();

  if (isHiddenRoute(pathname, !!user, user)) return null;

  const active: TabKey | null =
    pathname === '/map' || pathname.startsWith('/map/')
      ? 'map'
      : pathname === '/help' || pathname.startsWith('/help/')
        ? 'help'
        : isDashboardRoute(pathname, segments)
          ? 'dashboard'
          : null;

  const go = (href: string) => router.push(href as never);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.bar}>
        <View style={styles.accentLine} pointerEvents="none" />

        <Pressable
          style={({ pressed }) => [styles.sideTab, pressed && styles.pressed]}
          onPress={() => go('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Tableau de bord"
        >
          <View style={[styles.iconWrap, active === 'dashboard' && styles.iconWrapActive]}>
            <GridIcon size={20} color={active === 'dashboard' ? colors.primary : colors.textMuted} />
          </View>
          <Text style={[styles.label, active === 'dashboard' && styles.labelActive]}>Dashboard</Text>
          {active === 'dashboard' && <View style={styles.dot} />}
        </Pressable>

        <View style={styles.centerSlot} />

        <Pressable
          style={({ pressed }) => [styles.sideTab, pressed && styles.pressed]}
          onPress={() => go('/help')}
          accessibilityRole="button"
          accessibilityLabel="Aide et support"
        >
          <View style={[styles.iconWrap, active === 'help' && styles.iconWrapActive]}>
            <HelpIcon size={20} color={active === 'help' ? colors.primary : colors.textMuted} />
          </View>
          <Text style={[styles.label, active === 'help' && styles.labelActive]}>Aide</Text>
          {active === 'help' && <View style={styles.dot} />}
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.homeFab, pressed && styles.homeFabPressed, active === 'map' && styles.homeFabActive]}
        onPress={() => go('/map')}
        accessibilityRole="button"
        accessibilityLabel="Carte BlockTask"
      >
        <View style={styles.homeFabInner}>
          <MapPinIcon size={26} color="#fff" />
        </View>
        <Text style={[styles.homeLabel, active === 'map' && styles.homeLabelActive]}>Carte</Text>
      </Pressable>
    </View>
  );
}

const FAB_SIZE = 58;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 90,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    opacity: 0.07,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(233,236,239,0.9)',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 64,
    ...shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'visible',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  pressed: { opacity: 0.75 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
  centerSlot: {
    width: FAB_SIZE + spacing.md,
  },
  homeFab: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 5,
  },
  homeFabPressed: { transform: [{ scale: 0.96 }] },
  homeFabActive: {},
  homeFabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  homeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  homeLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
