import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { updateProfile } from '../src/api/profile';
import { Input, PrimaryButton } from '../src/components/buttons';
import { ChipGroup, FieldLabel } from '../src/components/ui';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader } from '../src/components/widgets';
import { MALI_CITIES } from '../src/constants/africa';
import { ApiError } from '../src/api/client';

const CITY_OPTIONS = MALI_CITIES.map((c) => ({ id: c, label: c }));

export default function ProfileEditScreen() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '+223',
    bio: (user as { bio?: string })?.bio || '',
    address: (user as { address?: string })?.address || '',
    city: (user as { city?: string })?.city || 'Bamako',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert('Champs requis', 'Prénom et nom sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        bio: form.bio.trim(),
        address: form.address.trim(),
        city: form.city,
        country: 'Mali',
      });
      await refreshProfile();
      Alert.alert('Enregistré', 'Profil mis à jour.');
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Mise à jour impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout showBack title="Modifier le profil" scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <PageHeader title="Modifier le profil" subtitle="Vos informations personnelles" />

          <FieldLabel>Prénom</FieldLabel>
          <Input value={form.first_name} onChangeText={(v) => update('first_name', v)} />
          <FieldLabel>Nom</FieldLabel>
          <Input value={form.last_name} onChangeText={(v) => update('last_name', v)} />
          <FieldLabel>Téléphone</FieldLabel>
          <Input keyboardType="phone-pad" value={form.phone_number} onChangeText={(v) => update('phone_number', v)} />
          <FieldLabel>Ville</FieldLabel>
          <ChipGroup options={CITY_OPTIONS} value={form.city} onChange={(v) => update('city', v)} />
          <FieldLabel>Adresse</FieldLabel>
          <Input value={form.address} onChangeText={(v) => update('address', v)} />
          <FieldLabel>Bio</FieldLabel>
          <Input
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            value={form.bio}
            onChangeText={(v) => update('bio', v)}
          />

          <PrimaryButton label="Enregistrer" onPress={onSubmit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}
