import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createDispute, DISPUTE_REASONS } from '../../src/api/disputes';
import { Input, PrimaryButton } from '../../src/components/buttons';
import { ChipGroup, FieldLabel } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/widgets';
import { colors, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';

const REASON_OPTIONS = DISPUTE_REASONS.map((r) => ({ id: r.id, label: r.label }));

export default function NewDisputeScreen() {
  const { missionId, missionTitle } = useLocalSearchParams<{ missionId: string; missionTitle?: string }>();
  const [reason, setReason] = useState('non_delivery');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!missionId) return;
    if (!description.trim()) {
      Alert.alert('Description requise', 'Décrivez le problème rencontré.');
      return;
    }
    setLoading(true);
    try {
      const dispute = await createDispute({
        mission_id: missionId,
        reason,
        description: description.trim(),
        requested_resolution: resolution.trim(),
      });
      Alert.alert('Litige ouvert', 'Votre réclamation a été transmise.');
      router.replace(`/disputes/${dispute.id}`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Ouverture impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout showBack title="Nouveau litige" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Ouvrir un litige" subtitle={missionTitle || 'Signalez un problème sur la mission'} />

        <FieldLabel>Motif</FieldLabel>
        <ChipGroup options={REASON_OPTIONS} value={reason} onChange={setReason} />

        <FieldLabel>Description du problème *</FieldLabel>
        <Input
          placeholder="Expliquez ce qui s'est passé…"
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
          value={description}
          onChangeText={setDescription}
        />

        <FieldLabel>Résolution souhaitée</FieldLabel>
        <Input
          placeholder="Ce que vous attendez (remboursement, reprise…)"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          value={resolution}
          onChangeText={setResolution}
        />

        <PrimaryButton label="Soumettre le litige" onPress={onSubmit} loading={loading} />
        <Text style={styles.note}>
          Un médiateur examinera votre dossier. Les fonds en escrow restent bloqués jusqu'à la résolution.
        </Text>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
});
