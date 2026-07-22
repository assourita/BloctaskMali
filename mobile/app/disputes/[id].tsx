import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  addDisputeEvidence,
  DISPUTE_REASONS,
  DISPUTE_STATUS_LABELS,
  getDispute,
} from '../../src/api/disputes';
import { Input, PrimaryButton } from '../../src/components/buttons';
import { Badge, Card, ChipGroup, FieldLabel, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { formatXOF } from '../../src/constants/africa';
import { colors, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';
import type { Dispute } from '../../src/types';

const EVIDENCE_TYPES = [
  { id: 'photo', label: 'Photo' },
  { id: 'document', label: 'Document' },
  { id: 'chat_log', label: 'Conversation' },
  { id: 'witness', label: 'Témoignage' },
  { id: 'gps_data', label: 'GPS' },
];

function reasonLabel(id: string) {
  return DISPUTE_REASONS.find((r) => r.id === id)?.label || id;
}

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [evType, setEvType] = useState('photo');
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evFile, setEvFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDispute(await getDispute(id));
    } catch {
      Alert.alert('Erreur', 'Litige introuvable');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pickEvidenceFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setEvFile({
      uri: asset.uri,
      name: asset.fileName || `preuve_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const submitEvidence = async () => {
    if (!id) return;
    if (!evTitle.trim()) {
      Alert.alert('Titre requis', 'Donnez un titre à votre preuve.');
      return;
    }
    setSaving(true);
    try {
      await addDisputeEvidence(id, {
        evidence_type: evType,
        title: evTitle.trim(),
        description: evDesc.trim(),
        file: evFile || undefined,
      });
      setEvTitle('');
      setEvDesc('');
      setEvFile(null);
      Alert.alert('OK', 'Preuve ajoutée.');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Ajout impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !dispute) {
    return (
      <AppLayout showBack title="Détail litige">
        <Loader />
      </AppLayout>
    );
  }

  const isResolved = ['resolved', 'closed'].includes(dispute.status);

  return (
    <AppLayout showBack title="Détail litige" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{dispute.mission_title}</Text>
        <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone={isResolved ? 'success' : 'warning'} />

        <Card>
          <FieldLabel>Motif</FieldLabel>
          <Text style={styles.value}>{reasonLabel(dispute.reason)}</Text>
          <FieldLabel>Description</FieldLabel>
          <Text style={styles.value}>{dispute.description}</Text>
          {dispute.requested_resolution ? (
            <>
              <FieldLabel>Résolution souhaitée</FieldLabel>
              <Text style={styles.value}>{dispute.requested_resolution}</Text>
            </>
          ) : null}
          {dispute.mission_budget ? (
            <Text style={styles.budget}>Montant : {formatXOF(dispute.mission_budget)}</Text>
          ) : null}
        </Card>

        {isResolved && dispute.decision_reason ? (
          <Card style={styles.decision}>
            <FieldLabel>Décision du médiateur</FieldLabel>
            <Text style={styles.value}>{dispute.decision_reason}</Text>
          </Card>
        ) : null}

        <Text style={styles.section}>Preuves ({dispute.evidence?.length ?? 0})</Text>
        {dispute.evidence && dispute.evidence.length > 0 ? (
          dispute.evidence.map((e) => (
            <Card key={e.id} style={styles.evItem}>
              <Text style={styles.evTitle}>{e.title || e.evidence_type}</Text>
              {e.description ? <Text style={styles.value}>{e.description}</Text> : null}
              <Text style={styles.evMeta}>
                {e.submitted_by ? `${e.submitted_by.first_name} • ` : ''}
                {new Date(e.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </Card>
          ))
        ) : (
          <Text style={styles.muted}>Aucune preuve soumise.</Text>
        )}

        {!isResolved && (
          <Card>
            <FieldLabel>Ajouter une preuve</FieldLabel>
            <ChipGroup options={EVIDENCE_TYPES} value={evType} onChange={setEvType} />
            <Input placeholder="Titre" value={evTitle} onChangeText={setEvTitle} />
            <Input
              placeholder="Description (optionnel)"
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              value={evDesc}
              onChangeText={setEvDesc}
            />
            <PrimaryButton
              label={evFile ? `Fichier : ${evFile.name}` : 'Joindre image / fichier'}
              onPress={pickEvidenceFile}
            />
            <PrimaryButton label="Ajouter la preuve" onPress={submitEvidence} loading={saving} />
          </Card>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  value: { color: colors.text, lineHeight: 20 },
  budget: { marginTop: spacing.sm, fontWeight: '700', color: colors.accent },
  decision: { backgroundColor: '#ecfdf3', borderColor: colors.primary },
  section: { fontWeight: '700', fontSize: 16, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  evItem: { paddingVertical: spacing.sm },
  evTitle: { fontWeight: '700', color: colors.text },
  evMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  muted: { color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
});
