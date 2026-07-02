import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppLayout } from '../src/components/layout/AppLayout';
import { PageHeader, SoftCard } from '../src/components/widgets';
import { colors, spacing } from '../src/constants/theme';

const FAQ = [
  { q: 'Comment créer une mission ?', a: "Allez dans « Nouvelle mission », remplissez les détails, les adresses, les options puis financez via Mobile Money." },
  { q: 'Comment sont protégés mes fonds ?', a: 'Les fonds sont bloqués en escrow et ne sont versés au prestataire qu\'après validation de la mission.' },
  { q: 'Comment attribuer une mission à un prestataire ?', a: 'Dans « Attribuer une mission », recherchez un prestataire puis envoyez-lui une sollicitation pour une mission financée.' },
  { q: 'Que faire en cas de problème ?', a: 'Ouvrez un litige depuis la mission concernée. Notre équipe arbitre avec les preuves fournies.' },
];

export default function HelpScreen() {
  return (
    <AppLayout>
      <PageHeader title="Aide & Support" subtitle="Questions fréquentes et contact" />

      {FAQ.map((item) => (
        <SoftCard key={item.q}>
          <Text style={styles.q}>{item.q}</Text>
          <Text style={styles.a}>{item.a}</Text>
        </SoftCard>
      ))}

      <SoftCard>
        <Text style={styles.contactTitle}>Nous contacter</Text>
        <Pressable style={styles.contactRow} onPress={() => Linking.openURL('mailto:support@blocktask.ml')}>
          <Text style={styles.contactLabel}>Email</Text>
          <Text style={styles.contactText}>support@blocktask.ml</Text>
        </Pressable>
        <Pressable style={styles.contactRow} onPress={() => Linking.openURL('tel:+22300000000')}>
          <Text style={styles.contactLabel}>Téléphone</Text>
          <Text style={styles.contactText}>+223 00 00 00 00</Text>
        </Pressable>
      </SoftCard>

      <Pressable style={styles.backBtn} onPress={() => router.push('/(tabs)')}>
        <Text style={styles.backText}>Retour au tableau de bord</Text>
      </Pressable>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  q: { fontSize: 15, fontWeight: '700', color: colors.text },
  a: { fontSize: 13.5, color: colors.textMuted, marginTop: 6, lineHeight: 19 },
  contactTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  contactLabel: { fontSize: 13, color: colors.textMuted },
  contactText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: spacing.md },
  backText: { color: colors.textMuted, fontWeight: '600' },
});
