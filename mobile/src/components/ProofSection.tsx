import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getChecklist,
  getProofs,
  PROOF_LABELS,
  uploadProof,
  type MissionProof,
  type ProofChecklist,
  type ProofType,
} from '../api/proofs';
import { Card } from './ui';
import { mediaUrl } from '../constants/config';
import { colors, radius, spacing } from '../constants/theme';
import { ApiError } from '../api/client';

const UPLOAD_TYPES: ProofType[] = ['photo_before', 'photo_during', 'photo_after', 'receipt'];

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'En attente', bg: colors.warningLight, fg: '#92400e' },
  verified: { label: 'Validée', bg: colors.successLight, fg: '#065f46' },
  approved: { label: 'Validée', bg: colors.successLight, fg: '#065f46' },
  rejected: { label: 'Rejetée', bg: '#fee2e2', fg: '#991b1b' },
};

interface Props {
  missionId: string;
  canUpload: boolean;
  onUpdated?: () => void;
}

export function ProofSection({ missionId, canUpload, onUpdated }: Props) {
  const [proofs, setProofs] = useState<MissionProof[]>([]);
  const [checklist, setChecklist] = useState<ProofChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<ProofType | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getProofs(missionId), getChecklist(missionId)]);
      setProofs(p);
      setChecklist(c);
    } catch {
      setProofs([]);
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doUpload = async (proofType: ProofType, asset: ImagePicker.ImagePickerAsset) => {
    setUploading(proofType);
    try {
      await uploadProof(
        missionId,
        proofType,
        asset.uri,
        asset.fileName || `${proofType}.jpg`,
        asset.mimeType || 'image/jpeg',
      );
      Alert.alert('OK', 'Preuve envoyée');
      await refresh();
      onUpdated?.();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Upload impossible');
    } finally {
      setUploading(null);
    }
  };

  const fromCamera = async (proofType: ProofType) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', "Autorisez l'accès à la caméra.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await doUpload(proofType, result.assets[0]);
  };

  const fromGallery = async (proofType: ProofType) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', "Autorisez l'accès aux photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await doUpload(proofType, result.assets[0]);
  };

  const chooseSource = (proofType: ProofType) => {
    Alert.alert(PROOF_LABELS[proofType], 'Choisir la source de la photo', [
      { text: 'Caméra', onPress: () => fromCamera(proofType) },
      { text: 'Galerie', onPress: () => fromGallery(proofType) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const pct = Math.round(checklist?.completion_percentage || 0);

  return (
    <Card>
      <Text style={styles.section}>Preuves d'exécution</Text>

      {checklist ? (
        <View style={styles.checklistWrap}>
          <Text style={styles.checklist}>Checklist : {pct}% complété</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <>
          {proofs.length === 0 ? (
            <Text style={styles.empty}>Aucune preuve pour l'instant</Text>
          ) : (
            <View style={styles.grid}>
              {proofs.map((p) => {
                const uri = mediaUrl(p.file);
                const st = STATUS_META[p.verification_status] || {
                  label: p.verification_status,
                  bg: colors.surfaceAlt,
                  fg: colors.textMuted,
                };
                return (
                  <View key={p.id} style={styles.thumb}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                        <Text style={styles.thumbPlaceholderText}>📄</Text>
                      </View>
                    )}
                    <Text style={styles.thumbType} numberOfLines={1}>
                      {PROOF_LABELS[p.proof_type as ProofType] || p.proof_type}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {canUpload && (
            <View style={styles.uploadGrid}>
              {UPLOAD_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={styles.uploadBtn}
                  onPress={() => chooseSource(type)}
                  disabled={!!uploading}
                >
                  {uploading === type ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={styles.uploadText}>📷 {PROOF_LABELS[type]}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  checklistWrap: { marginBottom: spacing.md },
  checklist: { color: colors.textMuted, marginBottom: 6, fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  empty: { color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  thumb: { width: '47%', flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  thumbImg: { width: '100%', height: 96, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 28 },
  thumbType: { fontSize: 12, fontWeight: '600', color: colors.text, paddingHorizontal: 8, paddingTop: 6 },
  statusPill: { alignSelf: 'flex-start', marginHorizontal: 8, marginVertical: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  uploadGrid: { marginTop: spacing.md, gap: 8 },
  uploadBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f0faf4',
  },
  uploadText: { color: colors.primary, fontWeight: '600', textAlign: 'center' },
});
