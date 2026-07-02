import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { getUnreadCount } from '../../api/notifications';
import { BellIcon } from '../icons';
import { colors, shadow, spacing } from '../../constants/theme';
import type { UserRole } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  provider: 'Prestataire',
  enterprise: 'Entreprise',
  admin: 'Administrateur',
};

export function AppHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const { open } = useSidebar();
  const { user, activeRole, switchRole, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [switching, setSwitching] = useState(false);
  const pathname = usePathname();
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const fetchUnread = () => {
      if (Date.now() - lastFetch.current < 25_000) return;
      lastFetch.current = Date.now();
      getUnreadCount()
        .then((c) => active && setUnread(c))
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 90_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  // Rafraîchir le compteur en quittant l'écran notifications (pas à chaque navigation).
  useEffect(() => {
    if (!pathname.includes('notifications')) return;
    return () => {
      lastFetch.current = 0;
    };
  }, [pathname]);

  const primaryRole: UserRole = (user?.user_type as UserRole) ?? 'client';
  const secondaryRole: UserRole | null = user?.secondary_role ?? null;
  // L'espace vers lequel on peut basculer = celui qui n'est pas actif.
  const targetRole: UserRole | null = secondaryRole
    ? activeRole === secondaryRole
      ? primaryRole
      : secondaryRole
    : null;

  const handleSwitch = async (role: UserRole) => {
    setMenuOpen(false);
    if (role === activeRole) return;
    setSwitching(true);
    try {
      await switchRole(role);
      router.replace('/(tabs)');
    } catch {
      /* noop */
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace('/login');
  };

  const initials = (user?.first_name?.[0] || '') + (user?.last_name?.[0] || '');

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
      <View style={styles.left}>
        <Pressable onPress={open} hitSlop={12} style={styles.iconBtn}>
          <Text style={styles.hamburger}>☰</Text>
        </Pressable>
        <Pressable style={styles.logo} onPress={() => router.push(user ? '/home' : '/')}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>BlockTask</Text>
        </Pressable>
      </View>

      <View style={styles.right}>
        <View style={styles.spacePill}>
          <Text style={styles.spacePillText} numberOfLines={1}>{ROLE_LABELS[activeRole] || activeRole}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/notifications')} hitSlop={10} style={styles.notifBtn}>
          <View style={styles.notifIcon}>
            <BellIcon size={20} color={colors.text} />
          </View>
          {unread > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { marginTop: insets.top + 52 }]}>
            <View style={styles.menuHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuName} numberOfLines={1}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text style={styles.menuSpace} numberOfLines={1}>
                  ESPACE {(ROLE_LABELS[activeRole] || activeRole).toUpperCase()}
                </Text>
                <Text style={styles.menuEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <MenuRow label="Mon profil" onPress={() => { setMenuOpen(false); router.push('/(tabs)/profile'); }} />
            <MenuRow label="Tableau de bord" onPress={() => { setMenuOpen(false); router.push('/(tabs)'); }} />

            {targetRole && (
              <>
                <Text style={styles.menuSection}>CHANGER D'ESPACE</Text>
                <Pressable
                  style={styles.menuRow}
                  onPress={() => handleSwitch(targetRole)}
                  disabled={switching}
                >
                  <Text style={styles.switchLabel}>
                    Espace {ROLE_LABELS[targetRole] || targetRole}
                  </Text>
                  <View style={styles.switchBadge}>
                    <Text style={styles.switchBadgeText}>
                      {targetRole === primaryRole ? 'Principal' : 'Secondaire'}
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            <View style={styles.menuDivider} />
            <MenuRow label="Déconnexion" danger onPress={handleLogout} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: { padding: 4 },
  hamburger: { fontSize: 23, color: colors.text },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.text, maxWidth: 120 },
  spacePill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 110,
  },
  spacePillText: { color: colors.primary, fontWeight: '800', fontSize: 11.5 },
  notifBtn: { padding: 2 },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.25)', paddingRight: spacing.md, alignItems: 'flex-end' },
  menu: {
    width: 250,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    ...shadow,
    shadowOpacity: 0.15,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuName: { fontWeight: '700', color: colors.text, fontSize: 14 },
  menuSpace: { color: colors.primary, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  menuEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  switchLabel: { fontSize: 14.5, color: colors.text, fontWeight: '600', flex: 1 },
  switchBadge: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  switchBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  menuSection: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 2,
  },
  menuRow: { paddingVertical: 13, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuLabel: { fontSize: 14.5, color: colors.text, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
