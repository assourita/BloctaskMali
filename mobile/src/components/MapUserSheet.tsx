import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MapUser } from '../api/map';
import { openMapsAt, openNavigationTo } from '../utils/mapNavigation';
import { colors, radius, spacing } from '../constants/theme';

const TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  provider: 'Prestataire',
  enterprise: 'Entreprise',
};

interface MapUserSheetProps {
  user: MapUser | null;
  myLocation?: { lat: number; lng: number } | null;
  onClose: () => void;
  onFocus: (user: MapUser) => void;
}

export function MapUserSheet({ user, myLocation, onClose, onFocus }: MapUserSheetProps) {
  if (!user) return null;

  const link = user.mission_link;
  const linked = !!link;
  const exact = user.location_precision === 'exact';
  const typeLabel = TYPE_LABELS[user.user_type] || user.user_type;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: avatarColor(user.user_type) }]}>
              <Text style={styles.avatarText}>{(user.name || '?').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>{typeLabel}{user.city ? ` · ${user.city}` : ''}</Text>
              <Text style={[styles.precision, exact ? styles.precisionExact : styles.precisionApprox]}>
                {exact ? '📍 Position exacte (mission en cours)' : 'Zone approximative'}
              </Text>
            </View>
          </View>

          {linked && link ? (
            <View style={styles.missionBox}>
              <Text style={styles.missionLabel}>Mission en cours</Text>
              <Text style={styles.missionTitle}>{link.mission_title}</Text>
              {link.mission_count > 1 ? (
                <Text style={styles.missionExtra}>+ {link.mission_count - 1} autre(s) mission(s) active(s)</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                Itinéraire et contact disponibles uniquement si vous partagez une mission en cours.
              </Text>
            </View>
          )}

          <View style={styles.coords}>
            <Text style={styles.coordsLabel}>Coordonnées</Text>
            <Text style={styles.coordsValue}>
              {user.latitude.toFixed(5)}, {user.longitude.toFixed(5)}
            </Text>
          </View>

          <View style={styles.actions}>
            <ActionBtn
              label="Voir sur la carte"
              icon="🎯"
              onPress={() => { onFocus(user); onClose(); }}
            />

            {linked && link?.can_navigate ? (
              <ActionBtn
                label="Lancer l'itinéraire"
                icon="🧭"
                primary
                onPress={() => {
                  openNavigationTo(user.latitude, user.longitude, user.name, myLocation);
                  onClose();
                }}
              />
            ) : null}

            {linked && link?.can_navigate && exact ? (
              <ActionBtn
                label="Ouvrir dans Maps"
                icon="🗺️"
                onPress={() => {
                  openMapsAt(user.latitude, user.longitude, user.name);
                  onClose();
                }}
              />
            ) : null}

            {linked && link?.can_contact ? (
              <ActionBtn
                label="Contacter (chat mission)"
                icon="💬"
                primary
                onPress={() => {
                  onClose();
                  router.push(`/mission/${link.mission_id}`);
                }}
              />
            ) : linked ? (
              <Text style={styles.contactHint}>
                Le chat s'ouvre lorsque la mission est démarrée (statut : {link?.mission_status}).
              </Text>
            ) : null}

            {user.user_type === 'provider' ? (
              <ActionBtn
                label="Voir le profil"
                icon="👤"
                onPress={() => {
                  onClose();
                  router.push(`/provider/${user.id}`);
                }}
              />
            ) : null}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionBtn({
  label, icon, onPress, primary,
}: { label: string; icon: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      style={[styles.actionBtn, primary && styles.actionBtnPrimary]}
      onPress={onPress}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

function avatarColor(type: string): string {
  if (type === 'client') return '#2563eb';
  if (type === 'enterprise') return '#7c3aed';
  return '#047857';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  header: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  precision: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  precisionExact: { color: '#047857' },
  precisionApprox: { color: colors.textMuted },
  missionBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  missionLabel: { fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase' },
  missionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 4 },
  missionExtra: { fontSize: 12, color: '#047857', marginTop: 4 },
  hintBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  hintText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  coords: { marginBottom: spacing.md },
  coordsLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  coordsValue: { fontSize: 14, color: colors.text, fontFamily: 'monospace', marginTop: 4 },
  actions: { gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionLabelPrimary: { color: '#fff' },
  contactHint: { fontSize: 12, color: colors.warning, paddingVertical: 8, textAlign: 'center' },
  closeBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 10 },
  closeText: { color: colors.textMuted, fontWeight: '600' },
});
