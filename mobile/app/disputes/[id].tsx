import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  addDisputeEvidence,
  DISPUTE_DECISION_LABELS,
  DISPUTE_REASONS,
  DISPUTE_STATUS_LABELS,
  getDispute,
  submitDisputeDefense,
} from '../../src/api/disputes';
import { Input, PrimaryButton } from '../../src/components/buttons';
import { Badge, Card, ChipGroup, FieldLabel, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/context/AuthContext';
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
  const { user } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [evType, setEvType] = useState('photo');
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evFile, setEvFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [defenseText, setDefenseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingDefense, setSavingDefense] = useState(false);

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

  const isResolved = !!dispute && ['resolved', 'closed'].includes(dispute.status);
  const isDefendant = useMemo(() => {
    if (!dispute?.defendant || !user) return false;
    return String(dispute.defendant.id) === String(user.id);
  }, [dispute, user]);
  const canDefend = isDefendant && !isResolved;

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

  const submitDefense = async () => {
    if (!id) return;
    if (defenseText.trim().length < 20) {
      Alert.alert('Réponse trop courte', 'Expliquez votre version en au moins 20 caractères.');
      return;
    }
    setSavingDefense(true);
    try {
      const updated = await submitDisputeDefense(id, defenseText.trim());
      setDispute(updated);
      setDefenseText('');
      Alert.alert('OK', 'Votre défense a été enregistrée.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Envoi impossible');
    } finally {
      setSavingDefense(false);
    }
  };

  if (loading || !dispute) {
    return (
      <AppLayout showBack title="Détail litige">
        <Loader />
      </AppLayout>
    );
  }

  const decisionLabel =
    dispute.decision && dispute.decision !== 'pending'
      ? DISPUTE_DECISION_LABELS[dispute.decision] || dispute.decision
      : null;

  return (
    <AppLayout showBack title="Détail litige" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{dispute.mission_title}</Text>
        <Badge label={DISPUTE_STATUS_LABELS[dispute.status] || dispute.status} tone={isResolved ? 'success' : 'warning'} />

        <Card>
          <FieldLabel>Motif (plainte)</FieldLabel>
          <Text style={styles.value}>{reasonLabel(dispute.reason)}</Text>
          <FieldLabel>Description du plaignant</FieldLabel>
          <Text style={styles.value}>{dispute.description}</Text>
          {dispute.requested_resolution ? (
            <>
              <FieldLabel>Résolution souhaitée par le plaignant</FieldLabel>
              <Text style={styles.value}>{dispute.requested_resolution}</Text>
            </>
          ) : null}
          {dispute.mission_budget ? (
            <Text style={styles.budget}>Montant : {formatXOF(dispute.mission_budget)}</Text>
          ) : null}
        </Card>

        {(dispute.defendant_response || canDefend) && (
          <Card style={styles.defenseCard}>
            <FieldLabel>Défense du défendeur</FieldLabel>
            {dispute.defendant_response ? (
              <Text style={styles.value}>{dispute.defendant_response}</Text>
            ) : (
              <Text style={styles.muted}>Aucune réponse pour le moment.</Text>
            )}
            {canDefend ? (
              <>
                <Input
                  placeholder="Votre version des faits (obligatoire avant décision admin)…"
                  multiline
                  numberOfLines={5}
                  style={{ minHeight: 100, textAlignVertical: 'top', marginTop: spacing.sm }}
                  value={defenseText}
                  onChangeText={setDefenseText}
                />
                <PrimaryButton
                  label={dispute.defendant_response ? 'Mettre à jour ma défense' : 'Soumettre ma défense'}
                  onPress={submitDefense}
                  loading={savingDefense}
                />
              </>
            ) : null}
          </Card>
        )}

        {isResolved && (decisionLabel || dispute.decision_reason) ? (
          <Card style={styles.decision}>
            <FieldLabel>Verdict du médiateur</FieldLabel>
            {decisionLabel ? <Text style={styles.verdict}>{decisionLabel}</Text> : null}
            {dispute.decision_reason ? (
              <>
                <FieldLabel>Justification</FieldLabel>
                <Text style={styles.value}>{dispute.decision_reason}</Text>
              </>
            ) : null}
            {(Number(dispute.client_refund_amount) > 0 || Number(dispute.provider_payment_amount) > 0) && (
              <View style={{ marginTop: spacing.sm }}>
                {Number(dispute.client_refund_amount) > 0 ? (
                  <Text style={styles.budget}>
                    Remboursement client : {formatXOF(dispute.client_refund_amount!)}
                  </Text>
                ) : null}
                {Number(dispute.provider_payment_amount) > 0 ? (
                  <Text style={styles.budget}>
                    Paiement prestataire : {formatXOF(dispute.provider_payment_amount!)}
                  </Text>
                ) : null}
              </View>
            )}
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
  verdict: { color: colors.primary, fontWeight: '800', fontSize: 16, marginBottom: spacing.sm },
  budget: { marginTop: spacing.sm, fontWeight: '700', color: colors.accent },
  decision: { backgroundColor: '#ecfdf3', borderColor: colors.primary },
  defenseCard: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  section: { fontWeight: '700', fontSize: 16, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  evItem: { paddingVertical: spacing.sm },
  evTitle: { fontWeight: '700', color: colors.text },
  evMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  muted: { color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
});
