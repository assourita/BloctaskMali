import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { colors, radius, spacing } from '../../constants/theme';

interface NavItem {
  label: string;
  href: string;
  match: string;
  exact?: boolean;
}

const CLIENT_NAV: NavItem[] = [
  { label: 'Mes missions créées', href: '/(tabs)/missions', match: '/missions' },
  { label: 'Nouvelle mission', href: '/create-mission', match: '/create-mission' },
  { label: 'Attribuer une mission', href: '/providers', match: '/providers' },
  { label: 'Sollicitations envoyées', href: '/solicitations', match: '/solicitations' },
  { label: 'Suivi en temps réel', href: '/tracking', match: '/tracking' },
  { label: 'Paiements', href: '/payments', match: '/payments' },
  { label: 'Litiges', href: '/disputes', match: '/disputes' },
  { label: 'Mon profil', href: '/(tabs)/profile', match: '/profile' },
];

const PROVIDER_NAV: NavItem[] = [
  { label: 'Mes missions assignées', href: '/(tabs)/missions', match: '/missions' },
  { label: 'Mes sollicitations', href: '/solicitations', match: '/solicitations' },
  { label: 'Missions disponibles', href: '/(tabs)/available', match: '/available' },
  { label: 'Suivi GPS', href: '/tracking', match: '/tracking' },
  { label: 'Mes revenus', href: '/earnings', match: '/earnings' },
  { label: 'Réputation', href: '/reputation', match: '/reputation' },
  { label: 'Caution', href: '/deposit', match: '/deposit' },
  { label: 'Litiges', href: '/disputes', match: '/disputes' },
  { label: 'Mon profil', href: '/(tabs)/profile', match: '/profile' },
];

const ENTERPRISE_NAV: NavItem[] = [
  { label: 'Missions', href: '/(tabs)/missions', match: '/missions' },
  { label: 'Sollicitations reçues', href: '/solicitations', match: '/solicitations' },
  { label: 'Employés', href: '/employees', match: '/employees' },
  { label: 'Suivi en temps réel', href: '/tracking', match: '/tracking' },
  { label: 'Finances', href: '/finances', match: '/finances' },
  { label: 'Analytics', href: '/analytics', match: '/analytics' },
  { label: 'Caution', href: '/deposit', match: '/deposit' },
  { label: 'Mon entreprise', href: '/enterprise-profile', match: '/enterprise-profile' },
  { label: 'Paiements', href: '/payments', match: '/payments' },
  { label: 'Litiges', href: '/disputes', match: '/disputes' },
  { label: 'Mon profil', href: '/(tabs)/profile', match: '/profile' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Mon profil', href: '/(tabs)/profile', match: '/profile' },
  { label: 'Litiges', href: '/disputes', match: '/disputes' },
];

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  provider: 'Prestataire',
  enterprise: 'Entreprise',
  admin: 'Administrateur',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.round(SCREEN_WIDTH * 0.5);

export function Sidebar() {
  const insets = useSafeAreaInsets();
  const { isOpen, close } = useSidebar();
  const { user, activeRole } = useAuth();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -PANEL_WIDTH,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: isOpen ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, translateX, backdrop]);

  if (!user) return null;

  const navItems = activeRole === 'admin'
    ? ADMIN_NAV
    : activeRole === 'provider'
      ? PROVIDER_NAV
      : activeRole === 'enterprise'
        ? ENTERPRISE_NAV
        : CLIENT_NAV;

  const isActive = (item: NavItem) => {
    if (item.match === '/missions' && (pathname === '/create-mission' || pathname.includes('create-mission'))) {
      return true;
    }
    if (item.match === '/employees' && (pathname.includes('/employees') || pathname.includes('/employee/'))) {
      return true;
    }
    return item.exact ? pathname === item.match : pathname === item.match || pathname.startsWith(`${item.match}/`);
  };

  const go = (href: string) => {
    close();
    setTimeout(() => router.push(href as never), 60);
  };

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View style={[styles.panel, { width: PANEL_WIDTH, transform: [{ translateX }], paddingTop: insets.top }]}>
          <View style={styles.panelHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={styles.userType}>{ROLE_LABELS[activeRole] || activeRole}</Text>
              </View>
            </View>
            <Pressable onPress={close} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Fermer le menu">
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <ScrollView style={styles.nav} contentContainerStyle={{ paddingVertical: spacing.sm }}>
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => go(item.href)}
                  style={[styles.navItem, active && styles.navItemActive]}
                >
                  <View style={[styles.navAccent, active && styles.navAccentActive]} />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  panel: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    maxWidth: '50%',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    marginRight: spacing.xs,
  },
  closeBtnText: { fontSize: 18, color: colors.textMuted, fontWeight: '600', lineHeight: 20 },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  userName: { fontWeight: '700', color: colors.text, fontSize: 15 },
  userType: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border },
  nav: { flex: 1, paddingHorizontal: spacing.sm },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginVertical: 2,
  },
  navItemActive: { backgroundColor: colors.primary },
  navAccent: { width: 4, height: 18, borderRadius: 2, backgroundColor: 'transparent' },
  navAccentActive: { backgroundColor: '#fff' },
  navLabel: { color: colors.text, fontWeight: '600', fontSize: 14.5, flex: 1 },
  navLabelActive: { color: '#fff', fontWeight: '700' },
});
