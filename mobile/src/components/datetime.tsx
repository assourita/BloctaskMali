import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../constants/theme';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Convertit une chaîne AAAA-MM-JJ en Date locale (midi pour éviter les décalages). */
function parseDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return new Date();
}

/** Convertit une chaîne HH:MM en Date locale (aujourd'hui). */
function parseTime(value: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  const d = new Date();
  if (m) {
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  }
  return d;
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDateLabel(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Sélecteur de date (calendrier natif). Valeur attendue/retournée : AAAA-MM-JJ. */
export function DateField({
  value,
  onChange,
  placeholder = 'Choisir une date',
  minimumDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(`${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`);
  };

  return (
    <View>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDateLabel(value) : placeholder}
        </Text>
        <Text style={styles.icon}>calendrier</Text>
      </Pressable>

      {open && (
        <>
          <DateTimePicker
            value={parseDate(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Valider</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/** Sélecteur d'heure (horloge native). Valeur attendue/retournée : HH:MM. */
export function TimeField({
  value,
  onChange,
  placeholder = 'Choisir une heure',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
  };

  return (
    <View>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Text style={styles.icon}>heure</Text>
      </Pressable>

      {open && (
        <>
          <DateTimePicker
            value={parseTime(value)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Valider</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  fieldText: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  icon: { fontSize: 11, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  doneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  doneText: { color: '#fff', fontWeight: '700' },
});
