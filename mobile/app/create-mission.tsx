import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { createMissionWithPayment } from '../src/api/missions';
import { confirmPayment } from '../src/api/payments';
import {
  getCategories,
  getDepositPreview,
  getCategorySchema,
  type Category,
  type CategoryRules,
  type CategorySchema,
} from '../src/api/categories';
import { resolveCategoryConfig } from '../src/constants/categoryConfig';
import { useAuth } from '../src/context/AuthContext';
import { EnterpriseMissionsNav } from '../src/components/EnterpriseMissionsNav';
import { AppLayout } from '../src/components/layout/AppLayout';
import { ProgressStepper, SoftCard } from '../src/components/widgets';
import { Input, PrimaryButton, SecondaryButton } from '../src/components/buttons';
import { ChipGroup, FieldLabel } from '../src/components/ui';
import { DateField, TimeField } from '../src/components/datetime';
import { calculateFees, DEFAULT_PHONE_PREFIX, formatXOF, MOBILE_MONEY_OPERATORS } from '../src/constants/africa';
import { colors, radius, spacing } from '../src/constants/theme';
import { DynamicFormField } from '../src/components/DynamicFormField';
import { NetworkBanner } from '../src/components/NetworkBanner';
import { ApiError } from '../src/api/client';

const OPERATOR_OPTIONS = MOBILE_MONEY_OPERATORS.map((o) => ({ id: o.id, label: o.name, color: o.color }));
const STEPS = ['Détails', 'Adresses', 'Options', 'Paiement'];

interface FormState {
  title: string;
  description: string;
  budget: string;
  merchandise_value: string;
  pickup_address: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  service_location: string;
  date: string;
  start_time: string;
  end_time: string;
  special_instructions: string;
  phone: string;
  otp: '1234' | string;
  custom_data: Record<string, any>;
}

const INITIAL: FormState = {
  title: '',
  description: '',
  budget: '',
  merchandise_value: '',
  pickup_address: '',
  pickup_contact_name: '',
  pickup_contact_phone: '',
  delivery_address: '',
  delivery_contact_name: '',
  delivery_contact_phone: '',
  service_location: '',
  date: '',
  start_time: '09:00',
  end_time: '',
  special_instructions: '',
  phone: '',
  otp: '1234',
  custom_data: {},
};

function configFromRules(rules: CategoryRules | undefined, fallback: ReturnType<typeof resolveCategoryConfig>) {
  if (!rules) return fallback;
  return {
    type: rules.mission_type as 'delivery' | 'home_service' | 'other',
    requiresPickup: rules.requires_pickup,
    requiresDelivery: rules.requires_delivery,
    showContacts: rules.mission_type === 'delivery',
    locationLabel: rules.location_label || fallback.locationLabel,
    requirements: rules.requirement_labels || [],
    dateLabel: rules.date_label || fallback.dateLabel,
    showTimeRange: rules.show_time_range,
  };
}

export default function CreateMissionScreen() {
  const { activeRole } = useAuth();
  const isEnterprise = activeRole === 'enterprise';
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [operator, setOperator] = useState('orange');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [estimatedDeposit, setEstimatedDeposit] = useState(0);
  const [categorySchema, setCategorySchema] = useState<CategorySchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [requirements, setRequirements] = useState({
    requires_vehicle: false,
    requires_photo: true,
    requires_signature: false,
    requires_id_verification: false,
  });

  const update = (key: keyof FormState, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const updateCustomData = (key: string, value: any) => {
    setForm((f) => ({
      ...f,
      custom_data: { ...f.custom_data, [key]: value },
    }));
  };

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const list = await getCategories();
      setCategories(list);
    } catch (e) {
      setCategories([]);
      setCategoriesError(e instanceof ApiError ? e.message : 'Impossible de charger les catégories');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadCategorySchema = useCallback(async (slug: string) => {
    if (!slug) return;
    setSchemaLoading(true);
    try {
      const schema = await getCategorySchema(slug);
      setCategorySchema(schema);
      // Reset custom_data when category changes
      setForm((f) => ({ ...f, custom_data: {} }));
    } catch (e) {
      console.error('Failed to load category schema:', e);
      setCategorySchema(null);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId],
  );

  const apiRules = selectedCategory?.rules;

  // Load category schema when category changes
  useEffect(() => {
    if (selectedCategory?.slug) {
      loadCategorySchema(selectedCategory.slug);
    }
  }, [selectedCategory?.slug, loadCategorySchema]);

  const config = useMemo(
    () => configFromRules(apiRules, resolveCategoryConfig(selectedCategory)),
    [apiRules, selectedCategory],
  );

  const applyApiRules = useCallback((rules?: CategoryRules) => {
    if (!rules) return;
    setRequirements({
      requires_vehicle: rules.requires_vehicle,
      requires_photo: rules.requires_photo,
      requires_signature: rules.requires_signature,
      requires_id_verification: rules.requires_id_verification,
    });
  }, []);

  const refreshDepositPreview = useCallback(async () => {
    const budget = parseFloat(form.budget);
    if (!selectedCategory?.slug || !Number.isFinite(budget) || budget <= 0) {
      setEstimatedDeposit(0);
      return;
    }
    const mv = parseFloat(form.merchandise_value);
    try {
      const preview = await getDepositPreview(
        selectedCategory.slug,
        budget,
        Number.isFinite(mv) && mv > 0 ? mv : undefined,
      );
      setEstimatedDeposit(preview.estimated_deposit || 0);
    } catch {
      setEstimatedDeposit(0);
    }
  }, [form.budget, form.merchandise_value, selectedCategory?.slug]);

  useEffect(() => {
    applyApiRules(apiRules);
  }, [apiRules, applyApiRules]);

  useEffect(() => {
    refreshDepositPreview();
  }, [refreshDepositPreview]);

  const fees = useMemo(() => {
    const budget = parseFloat(form.budget);
    if (!Number.isFinite(budget) || budget <= 0) return null;
    return calculateFees(budget);
  }, [form.budget]);

  const requiresMerchandiseValue = !!apiRules?.requires_merchandise_value;

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (form.title.trim().length < 5) return 'Le titre doit faire au moins 5 caractères.';
      if (!form.description.trim()) return 'La description est requise.';
      if (!categoryId) return 'Choisissez une catégorie.';
      const b = Number(form.budget);
      if (!Number.isFinite(b) || b < 5000) return 'Le budget minimum est de 5 000 FCFA.';
    }
    if (s === 1) {
      if (config.type === 'home_service') {
        if (!form.service_location.trim()) return "Le lieu d'intervention est requis.";
      } else {
        if (config.requiresPickup && !form.pickup_address.trim()) return "L'adresse de départ est requise.";
        if (config.requiresDelivery && !form.delivery_address.trim()) return "L'adresse d'arrivée est requise.";
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return 'Date invalide (format AAAA-MM-JJ).';
      if (!/^\d{2}:\d{2}$/.test(form.start_time)) return 'Heure invalide (format HH:MM).';
    }
    if (s === 2) {
      if (requiresMerchandiseValue) {
        const mv = Number(form.merchandise_value);
        if (!Number.isFinite(mv) || mv < 1000) {
          return 'Indiquez la valeur de la marchandise (min. 1 000 XOF).';
        }
      }
    }
    if (s === 3) {
      if (!form.phone.replace(/\s/g, '')) return 'Saisissez votre numéro Mobile Money.';
      if (!form.otp.trim()) return 'Saisissez le code de confirmation.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      Alert.alert('Champs requis', err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const computedDuration = useMemo(() => {
    if (!config.showTimeRange || !form.end_time) return 60;
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? diff : 60;
  }, [config.showTimeRange, form.start_time, form.end_time]);

  const onSubmit = async () => {
    for (let s = 0; s <= 3; s += 1) {
      const err = validateStep(s);
      if (err) {
        Alert.alert('Champs requis', err);
        setStep(s);
        return;
      }
    }
    const budget = Number(form.budget);
    const computed = calculateFees(budget);
    const deadlineIso = new Date(`${form.date}T${form.start_time}:00`).toISOString();
    const phoneDigits = form.phone.replace(/\s/g, '');
    const merchandiseValue = Number(form.merchandise_value);

    let locations: Record<string, string> = {};
    if (config.type === 'home_service') {
      locations = { delivery_address: form.service_location.trim() };
    } else {
      locations = {
        pickup_address: form.pickup_address.trim(),
        delivery_address: form.delivery_address.trim(),
        pickup_contact_name: form.pickup_contact_name.trim(),
        pickup_contact_phone: form.pickup_contact_phone.trim(),
        delivery_contact_name: form.delivery_contact_name.trim(),
        delivery_contact_phone: form.delivery_contact_phone.trim(),
      };
    }

    setLoading(true);
    try {
      const mission = await createMissionWithPayment({
        title: form.title.trim(),
        description: form.description.trim(),
        category: categoryId,
        budget,
        deadline: deadlineIso,
        ...locations,
        requires_vehicle: requirements.requires_vehicle,
        requires_photo: requirements.requires_photo,
        requires_signature: requirements.requires_signature,
        requires_id_verification: requirements.requires_id_verification,
        merchandise_value: Number.isFinite(merchandiseValue) && merchandiseValue > 0 ? merchandiseValue : undefined,
        special_instructions: form.special_instructions.trim(),
        estimated_duration: computedDuration,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        payment_method: 'mobile_money',
        operator,
        phone_number: phoneDigits.startsWith('+') ? phoneDigits : `${DEFAULT_PHONE_PREFIX}${phoneDigits}`,
        escrow_amount: computed.escrowAmount,
        platform_fee: computed.platformFee,
        custom_data: form.custom_data,
      });

      const goToMission = () => {
        router.replace('/(tabs)/missions');
        setTimeout(() => router.push(`/mission/${mission.id}`), 80);
      };

      if (!mission.payment_id) {
        Alert.alert('Mission créée', 'Paiement introuvable, à financer plus tard.', [
          { text: 'Voir mes missions', onPress: () => router.replace('/(tabs)/missions') },
          { text: 'Voir la mission', onPress: goToMission },
        ]);
        return;
      }
      await confirmPayment(mission.payment_id, form.otp.trim());
      Alert.alert('Succès', 'Mission créée et financée (fonds bloqués en escrow).', [
        { text: 'Voir mes missions', onPress: () => router.replace('/(tabs)/missions') },
        { text: 'Voir la mission', onPress: goToMission },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Création / paiement impossible');
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setPickerOpen(false);
  };

  return (
    <AppLayout>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isEnterprise ? <EnterpriseMissionsNav active="create" /> : null}
        <Text style={styles.h1}>Nouvelle mission</Text>

        <View style={styles.stepperWrap}>
          <ProgressStepper steps={STEPS} current={step} />
        </View>

        {categoriesError ? (
          <NetworkBanner message={categoriesError} onRetry={loadCategories} />
        ) : null}

        {step === 0 && (
          <SoftCard>
            <FieldLabel>Titre de la mission *</FieldLabel>
            <Input placeholder="Ex : Livraison de colis à Bamako" value={form.title} onChangeText={(v) => update('title', v)} />

            <FieldLabel>Description *</FieldLabel>
            <Input
              placeholder="Décrivez la mission..."
              multiline
              style={{ minHeight: 90, textAlignVertical: 'top' }}
              value={form.description}
              onChangeText={(v) => update('description', v)}
            />

            <FieldLabel>Catégorie *</FieldLabel>
            <Pressable
              style={[styles.select, categoriesLoading && styles.selectDisabled]}
              onPress={() => !categoriesLoading && categories.length && setPickerOpen(true)}
              disabled={categoriesLoading || !categories.length}
            >
              <Text style={[styles.selectText, !selectedCategory && { color: colors.textMuted }]}>
                {categoriesLoading
                  ? 'Chargement des catégories…'
                  : selectedCategory
                    ? selectedCategory.name
                    : categories.length
                      ? 'Choisir une catégorie'
                      : 'Aucune catégorie disponible'}
              </Text>
              <Text style={styles.selectChevron}>▾</Text>
            </Pressable>

            {apiRules?.deposit_reason ? (
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>Règles de cette catégorie</Text>
                <Text style={styles.rulesText}>{apiRules.deposit_reason}</Text>
                {apiRules.requirement_labels?.length ? (
                  <Text style={styles.rulesTags}>{apiRules.requirement_labels.join(' · ')}</Text>
                ) : null}
              </View>
            ) : null}

            <FieldLabel>Budget (FCFA) *</FieldLabel>
            <Input placeholder="Ex : 15000" keyboardType="numeric" value={form.budget} onChangeText={(v) => update('budget', v)} />
            <Text style={styles.hint}>Minimum 5 000 FCFA</Text>
          </SoftCard>
        )}

        {step === 1 && (
          <SoftCard>
            <Text style={styles.stepTitle}>{config.locationLabel}</Text>

            {config.type === 'home_service' ? (
              <>
                <FieldLabel>{config.locationLabel} *</FieldLabel>
                <Input
                  placeholder="Adresse où le prestataire intervient"
                  value={form.service_location}
                  onChangeText={(v) => update('service_location', v)}
                />
              </>
            ) : (
              <>
                <FieldLabel>Adresse de départ *</FieldLabel>
                <Input placeholder="Point de retrait" value={form.pickup_address} onChangeText={(v) => update('pickup_address', v)} />
                {config.showContacts && (
                  <>
                    <Input placeholder="Contact départ (nom)" value={form.pickup_contact_name} onChangeText={(v) => update('pickup_contact_name', v)} />
                    <Input placeholder="Contact départ (téléphone)" keyboardType="phone-pad" value={form.pickup_contact_phone} onChangeText={(v) => update('pickup_contact_phone', v)} />
                  </>
                )}
                <FieldLabel>Adresse d'arrivée *</FieldLabel>
                <Input placeholder="Point de livraison" value={form.delivery_address} onChangeText={(v) => update('delivery_address', v)} />
                {config.showContacts && (
                  <>
                    <Input placeholder="Contact arrivée (nom)" value={form.delivery_contact_name} onChangeText={(v) => update('delivery_contact_name', v)} />
                    <Input placeholder="Contact arrivée (téléphone)" keyboardType="phone-pad" value={form.delivery_contact_phone} onChangeText={(v) => update('delivery_contact_phone', v)} />
                  </>
                )}
              </>
            )}

            <FieldLabel>{config.dateLabel} *</FieldLabel>
            <DateField
              value={form.date}
              onChange={(v) => update('date', v)}
              placeholder="Choisir une date"
              minimumDate={new Date()}
            />
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel>{config.showTimeRange ? 'Heure de début' : 'Heure'}</FieldLabel>
                <TimeField value={form.start_time} onChange={(v) => update('start_time', v)} placeholder="Choisir l'heure" />
              </View>
              {config.showTimeRange && (
                <View style={{ flex: 1 }}>
                  <FieldLabel>Heure de fin</FieldLabel>
                  <TimeField value={form.end_time} onChange={(v) => update('end_time', v)} placeholder="Choisir l'heure" />
                </View>
              )}
            </View>
          </SoftCard>
        )}

        {step === 2 && (
          <SoftCard>
            <Text style={styles.stepTitle}>Options — {selectedCategory?.name || 'catégorie'}</Text>

            {requiresMerchandiseValue ? (
              <>
                <FieldLabel>Valeur de la marchandise (XOF) *</FieldLabel>
                <Input
                  placeholder="Ex : 50000"
                  keyboardType="numeric"
                  value={form.merchandise_value}
                  onChangeText={(v) => update('merchandise_value', v)}
                />
                <Text style={styles.hint}>La caution prestataire sera basée sur cette valeur.</Text>
              </>
            ) : null}

            {requiresMerchandiseValue && (!form.merchandise_value || Number(form.merchandise_value) < 1000) ? (
              <Text style={styles.hint}>Saisissez la valeur de la marchandise pour calculer la caution prestataire.</Text>
            ) : null}

            {estimatedDeposit > 0 ? (
              <View style={styles.depositPreview}>
                <Text style={styles.depositPreviewLabel}>Caution prestataire estimée</Text>
                <Text style={styles.depositPreviewValue}>{formatXOF(estimatedDeposit)}</Text>
              </View>
            ) : null}

            {/* Render custom fields from category schema */}
            {categorySchema?.custom_fields.map((field) => (
              <DynamicFormField
                key={field.name}
                field={field}
                value={form.custom_data[field.name]}
                onChange={(value) => updateCustomData(field.name, value)}
              />
            ))}

            <CheckRow
              label="Véhicule requis"
              value={requirements.requires_vehicle}
              locked={!!apiRules?.requires_vehicle}
              onToggle={() => setRequirements((r) => ({ ...r, requires_vehicle: !r.requires_vehicle }))}
            />
            <CheckRow
              label="Photo de preuve requise"
              value={requirements.requires_photo}
              locked={!!apiRules?.requires_photo}
              onToggle={() => setRequirements((r) => ({ ...r, requires_photo: !r.requires_photo }))}
            />
            <CheckRow
              label="Signature requise"
              value={requirements.requires_signature}
              locked={!!apiRules?.requires_signature}
              onToggle={() => setRequirements((r) => ({ ...r, requires_signature: !r.requires_signature }))}
            />
            <CheckRow
              label="Vérification d'identité requise"
              value={requirements.requires_id_verification}
              locked={!!apiRules?.requires_id_verification}
              onToggle={() => setRequirements((r) => ({ ...r, requires_id_verification: !r.requires_id_verification }))}
            />

            <FieldLabel>Instructions spéciales</FieldLabel>
            <Input
              placeholder="Précisions pour le prestataire..."
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              value={form.special_instructions}
              onChangeText={(v) => update('special_instructions', v)}
            />

            <View style={styles.recap}>
              <Text style={styles.recapTitle}>Récapitulatif</Text>
              <RecapRow label="Catégorie" value={selectedCategory?.name || '-'} />
              <RecapRow label="Budget" value={form.budget ? formatXOF(form.budget) : '-'} />
              {requiresMerchandiseValue && form.merchandise_value ? (
                <RecapRow label="Valeur marchandise" value={formatXOF(form.merchandise_value)} />
              ) : null}
              {estimatedDeposit > 0 ? (
                <RecapRow label="Caution estimée" value={formatXOF(estimatedDeposit)} />
              ) : null}
              <RecapRow label={config.dateLabel} value={form.date || '-'} />
            </View>
          </SoftCard>
        )}

        {step === 3 && (
          <SoftCard>
            <Text style={styles.stepTitle}>Paiement sécurisé</Text>
            <Text style={styles.hint}>Les fonds restent bloqués en escrow jusqu'à validation.</Text>

            {fees && (
              <View style={styles.feeBox}>
                <Text style={styles.feeRow}>Montant mission : {formatXOF(fees.escrowAmount)}</Text>
                <Text style={styles.feeMuted}>Frais plateforme (5%) : {formatXOF(fees.platformFee)}</Text>
                <Text style={styles.feeMuted}>Reversé au prestataire : {formatXOF(fees.providerAmount)}</Text>
                {estimatedDeposit > 0 ? (
                  <Text style={styles.feeMuted}>
                    Caution prestataire (à déposer par le prestataire) : {formatXOF(estimatedDeposit)}
                  </Text>
                ) : null}
              </View>
            )}

            <FieldLabel>Opérateur Mobile Money</FieldLabel>
            <ChipGroup options={OPERATOR_OPTIONS} value={operator} onChange={setOperator} />
            <FieldLabel>Numéro Mobile Money</FieldLabel>
            <Input placeholder="70 XX XX XX" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => update('phone', v)} />
            <FieldLabel>Code de confirmation (test : 1234)</FieldLabel>
            <Input placeholder="1234" keyboardType="number-pad" value={form.otp} onChangeText={(v) => update('otp', v)} />
          </SoftCard>
        )}

        <View style={styles.navRow}>
          {step > 0 && (
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Précédent" onPress={prev} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {step < STEPS.length - 1 ? (
              <PrimaryButton label="Suivant" onPress={next} />
            ) : (
              <PrimaryButton
                label={fees ? `Payer ${formatXOF(fees.escrowAmount)}` : 'Publier'}
                onPress={onSubmit}
                loading={loading}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choisir une catégorie</Text>
            {categories.length === 0 ? (
              <Text style={styles.emptyCats}>
                {categoriesError || 'Aucune catégorie. Vérifiez la connexion au serveur.'}
              </Text>
            ) : (
            <View style={styles.catGrid}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.catItem, categoryId === c.id && styles.catItemActive]}
                  onPress={() => selectCategory(c.id)}
                >
                  <Text style={[styles.catLabel, categoryId === c.id && { color: colors.primary, fontWeight: '700' }]}>
                    {c.name}
                  </Text>
                  {c.rules?.requires_merchandise_value ? (
                    <Text style={styles.catHint}>Valeur marchandise requise</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </AppLayout>
  );
}

function CheckRow({
  label,
  value,
  locked,
  onToggle,
}: {
  label: string;
  value: boolean;
  locked?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={[styles.checkRow, locked && styles.checkRowLocked]} onPress={locked ? undefined : onToggle}>
      <View style={[styles.checkbox, value && styles.checkboxOn, locked && styles.checkboxLocked]}>
        {value ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.checkLabel, locked && styles.checkLabelLocked]}>{label}{locked ? ' (obligatoire)' : ''}</Text>
    </Pressable>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  stepperWrap: { marginBottom: spacing.md },
  stepTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: spacing.sm },
  rulesBox: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rulesTitle: { fontWeight: '700', color: '#0c4a6e', fontSize: 13, marginBottom: 4 },
  rulesText: { color: '#0369a1', fontSize: 12, lineHeight: 18 },
  rulesTags: { color: '#0284c7', fontSize: 11, marginTop: 6, fontWeight: '600' },
  depositPreview: {
    backgroundColor: '#fef3c7',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  depositPreviewLabel: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  depositPreviewValue: { fontSize: 18, fontWeight: '800', color: '#b45309', marginTop: 4 },
  select: {
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
  selectText: { fontSize: 15, color: colors.text },
  selectDisabled: { opacity: 0.65 },
  selectChevron: { color: colors.textMuted, fontSize: 14 },
  emptyCats: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  checkRowLocked: { opacity: 0.85 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLocked: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 14.5, color: colors.text, flex: 1 },
  checkLabelLocked: { color: colors.textMuted },
  recap: { marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md },
  recapTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  recapLabel: { color: colors.textMuted, fontSize: 13 },
  recapValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  feeBox: { backgroundColor: '#f0faf4', borderColor: colors.primary, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, marginVertical: spacing.sm },
  feeRow: { fontWeight: '700', color: colors.text, fontSize: 15 },
  feeMuted: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  navRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '76%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catItem: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catLabel: { fontSize: 13.5, color: colors.text },
  catHint: { fontSize: 10, color: colors.primary, marginTop: 4, fontWeight: '600' },
});
