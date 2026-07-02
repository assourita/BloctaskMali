import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { submitRating } from '../src/api/ratings';
import { Input, PrimaryButton } from '../src/components/buttons';
import { Card, StarRating } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';

const LABELS = ['', 'Médiocre', 'Passable', 'Bien', 'Très bien', 'Excellent'];

export default function RateScreen() {
  const { missionId, ratedUserId, ratedUserName, ratedUserType, missionTitle } =
    useLocalSearchParams<{
      missionId: string;
      ratedUserId?: string;
      ratedUserName?: string;
      ratedUserType?: string;
      missionTitle?: string;
    }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const target = ratedUserType === 'client' ? 'le client' : 'le prestataire';

  const onSubmit = async () => {
    if (!missionId) return;
    if (rating === 0) {
      Alert.alert('Note requise', 'Sélectionnez au moins une étoile.');
      return;
    }
    setLoading(true);
    try {
      await submitRating({
        mission_id: missionId,
        rated_user_id: ratedUserId,
        rating,
        comment: comment.trim(),
      });
      Alert.alert('Merci', 'Votre évaluation a été enregistrée.');
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Évaluation" showBack>
      <PageHeader title={`Noter ${target}`} subtitle={missionTitle || 'Mission terminée'} />

        <Card>
          {ratedUserName ? <Text style={styles.name}>{ratedUserName}</Text> : null}
          <Text style={styles.label}>Note globale</Text>
          <StarRating value={rating} onChange={setRating} size={44} />
          <Text style={styles.ratingLabel}>{LABELS[rating]}</Text>
        </Card>

        <Input
          placeholder="Votre commentaire (optionnel)"
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
          value={comment}
          onChangeText={setComment}
        />

        <PrimaryButton label="Envoyer l'évaluation" onPress={onSubmit} loading={loading} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  label: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  ratingLabel: { textAlign: 'center', marginTop: spacing.sm, fontWeight: '700', color: colors.text, minHeight: 20 },
});
