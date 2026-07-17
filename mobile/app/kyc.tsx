import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../src/context/AuthContext';
import { submitKyc } from '../src/api/profile';
import { Input, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { Card, FieldLabel } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { DEFAULT_ID_LABEL } from '../src/constants/africa';
import { colors, spacing } from '../src/constants/theme';
import { ApiError } from '../src/api/client';

type PhotoSlot = 'idFront' | 'idBack' | 'selfie';

export default function KycScreen() {
  const { user, refreshProfile } = useAuth();
  const [nina, setNina] = useState((user as { nina?: string })?.nina || '');
  const [photos, setPhotos] = useState<Record<PhotoSlot, { uri: string; name: string; type: string } | null>>({
    idFront: null,
    idBack: null,
    selfie: null,
  });
  const [loading, setLoading] = useState(false);

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Max width 1024px
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (e) {
      console.error('Image compression error:', e);
      return uri; // Fallback to original if compression fails
    }
  };

  const pickPhoto = async (slot: PhotoSlot, useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisez l\'accès à la caméra ou aux photos.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const compressedUri = await compressImage(asset.uri);
    setPhotos((p) => ({
      ...p,
      [slot]: {
        uri: compressedUri,
        name: asset.fileName || `${slot}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      },
    }));
  };

  const onSubmit = async () => {
    if (!nina.trim()) {
      Alert.alert('NINA requis', `Saisissez votre numéro ${DEFAULT_ID_LABEL}.`);
      return;
    }
    setLoading(true);
    try {
      await submitKyc({
        nina: nina.trim(),
        idFront: photos.idFront || undefined,
        idBack: photos.idBack || undefined,
        selfie: photos.selfie || undefined,
      });
      await refreshProfile();
      Alert.alert('Soumis', 'Votre dossier KYC est en cours de vérification.');
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Soumission impossible';
      const needsPhone = /téléphone|telephone|phone_verified/i.test(msg);
      if (needsPhone) {
        Alert.alert('Erreur', msg, [
          { text: 'Aller au profil', onPress: () => router.replace('/(tabs)/profile') },
          { text: 'OK', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSlot = (slot: PhotoSlot, label: string) => (
    <Card key={slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={styles.slotStatus}>{photos[slot] ? 'Photo ajoutée' : 'Aucune photo'}</Text>
      <SecondaryButton label="Prendre une photo" onPress={() => pickPhoto(slot, true)} />
      <SecondaryButton label="Choisir depuis la galerie" onPress={() => pickPhoto(slot, false)} />
    </Card>
  );

  return (
    <AppLayout showBack title="Vérification KYC" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Vérification KYC" subtitle={`Identité ${DEFAULT_ID_LABEL} — Mali`} />

        {user?.kyc_status === 'verified' ? (
          <Card style={styles.verified}>
            <Text style={styles.verifiedText}>Votre identité est vérifiée.</Text>
          </Card>
        ) : (
          <>
            <FieldLabel>Numéro {DEFAULT_ID_LABEL}</FieldLabel>
            <Input placeholder={`Ex. 1234567890123`} value={nina} onChangeText={setNina} />

            {renderSlot('idFront', 'Recto pièce d\'identité')}
            {renderSlot('idBack', 'Verso pièce d\'identité')}
            {renderSlot('selfie', 'Selfie de vérification')}

            <PrimaryButton label="Soumettre le dossier KYC" onPress={onSubmit} loading={loading} />
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  slotLabel: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  slotStatus: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13 },
  verified: { backgroundColor: '#ecfdf3', borderColor: colors.primary },
  verifiedText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
