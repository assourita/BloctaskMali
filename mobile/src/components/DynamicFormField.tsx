import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { FieldDefinition } from '../api/categorySchema';
import { Input } from './buttons';
import { ChipGroup } from './ui';
import { DateField, TimeField } from './datetime';
import { colors, radius, spacing } from '../constants/theme';

interface DynamicFormFieldProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function DynamicFormField({ field, value, onChange, error }: DynamicFormFieldProps) {
  switch (field.type) {
    case 'text':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <Input
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChangeText={onChange}
            style={error && styles.inputError}
          />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'textarea':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChangeText={onChange}
            multiline
            style={[styles.textarea, error && styles.inputError]}
            textAlignVertical="top"
          />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'number':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <Input
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : '')}
            keyboardType="numeric"
            style={error && styles.inputError}
          />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'boolean':
      return (
        <Pressable
          style={[styles.booleanRow, error && styles.inputError]}
          onPress={() => onChange(!value)}
        >
          <View style={[styles.checkbox, value && styles.checkboxOn]}>
            {value && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.booleanLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
        </Pressable>
      );

    case 'select':
      const options = field.options?.map((opt) => ({ id: opt, label: opt })) || [];
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <ChipGroup options={options} value={value || ''} onChange={onChange} />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'date':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <DateField
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || 'Choisir une date'}
            minimumDate={new Date()}
          />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'time':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TimeField
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || 'Choisir l\'heure'}
          />
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'file':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <Pressable
            style={[styles.fileButton, error && styles.inputError]}
            onPress={handleFilePick}
          >
            <Text style={styles.fileButtonText}>
              {value ? 'Fichier sélectionné' : 'Choisir un fichier'}
            </Text>
          </Pressable>
          {value && <Text style={styles.fileSelected}>✓ Fichier sélectionné</Text>}
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    case 'gps':
      return (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <Pressable
            style={[styles.gpsButton, error && styles.inputError]}
            onPress={handleGPS}
          >
            <Text style={styles.gpsButtonText}>
              {value ? 'Coordonnées capturées' : 'Capturer ma position GPS'}
            </Text>
          </Pressable>
          {value && <Text style={styles.gpsValue}>{value}</Text>}
          {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );

    default:
      return null;
  }

  async function handleFilePick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        onChange(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  }

  function handleGPS() {
    // TODO: Implement GPS capture
    Alert.alert('GPS', 'Fonctionnalité GPS à implémenter');
  }
}

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  helpText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  inputError: {
    borderColor: colors.error,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minHeight: 80,
    fontSize: 15,
    color: colors.text,
  },
  booleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  booleanLabel: {
    fontSize: 14.5,
    color: colors.text,
    flex: 1,
  },
  fileButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  fileButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  fileSelected: {
    fontSize: 13,
    color: colors.success,
    marginTop: 4,
  },
  gpsButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  gpsButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  gpsValue: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
});
