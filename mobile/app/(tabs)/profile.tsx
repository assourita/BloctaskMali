import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { changePassword, submitKyc, updateProfile, updateProviderProfile, toggleAvailability } from '../../src/api/profile';
import { getProviderProfile } from '../../src/api/deposits';
import { createPaymentMethod, getPaymentMethods } from '../../src/api/payments';
import { getStats } from '../../src/api/missions';
import { getCategories, type Category } from '../../src/api/categories';
import { PrimaryButton, SecondaryButton, Input, PasswordInput } from '../../src/components/buttons';
import { Badge, ChipGroup, FieldLabel, MultiChipGroup } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { SoftCard, TabBar } from '../../src/components/widgets';
import { DEFAULT_ID_LABEL, DEFAULT_PHONE_PREFIX, MOBILE_MONEY_OPERATORS, formatXOF } from '../../src/constants/africa';
import { PROVIDER_SKILL_OPTIONS, profileFieldLabel, KYC_FIELDS } from '../../src/constants/profileFields';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';
import { isAdminAccount, isEnterpriseAccount } from '../../src/utils/roles';
import type { MissionStats, UserRole } from '../../src/types';

type TabId = 'info' | 'identity' | 'provider' | 'security' | 'activity';
type PhotoSlot = 'idFront' | 'idBack' | 'selfie';

const OPERATOR_OPTIONS = MOBILE_MONEY_OPERATORS.map((o) => ({ id: o.id, label: o.name }));

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  provider: 'Prestataire',
  enterprise: 'Entreprise',
  admin: 'Administrateur',
};

export default function ProfileScreen() {
  const { user, activeRole, logout, switchRole, refreshProfile } = useAuth();
  const isProvider = activeRole === 'provider';
  const isEnterprise = activeRole === 'enterprise' || isEnterpriseAccount(user);
  const isAdmin = activeRole === 'admin' || isAdminAccount(user);
  const missing = user?.profile_missing_fields || [];
  const blocked = user?.can_access_platform === false;

  const [tab, setTab] = useState<TabId>('info');
  const [stats, setStats] = useState<MissionStats | null>(null);

  // ── Onglet infos ──
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || DEFAULT_PHONE_PREFIX);
  const [country, setCountry] = useState(user?.country || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Prestataire (skills / catégories / paiement) ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<string[]>(user?.provider_profile?.skills || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user?.provider_profile?.categories || []);
  const [operator, setOperator] = useState('orange');
  const [payPhone, setPayPhone] = useState('');
  const [hasPaymentMethod, setHasPaymentMethod] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [depositBalance, setDepositBalance] = useState(0);
  const [depositLocked, setDepositLocked] = useState(0);
  const [savingProvider, setSavingProvider] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  // ── Onglet identité (KYC) ──
  const [nina, setNina] = useState(user?.nina || '');
  const [photos, setPhotos] = useState<Record<PhotoSlot, { uri: string; name: string; type: string } | null>>({
    idFront: null,
    idBack: null,
    selfie: null,
  });
  const [savingKyc, setSavingKyc] = useState(false);

  // ── Onglet sécurité ──
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  // "Vérifié" uniquement si le profil est complet ET validé par l'admin (KYC vérifié + accès plateforme).
  const kycVerified = ['verified', 'approved'].includes((user?.kyc_status || '').toLowerCase());
  const verified = kycVerified && user?.can_access_platform === true;

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats(activeRole));
    } catch {
      setStats(null);
    }
  }, [activeRole]);

  useEffect(() => {
    loadStats();
    if (isProvider) {
      getCategories().then(setCategories).catch(() => {});
      getPaymentMethods().then((m) => setHasPaymentMethod(m.length > 0)).catch(() => {});
      getProviderProfile().then((p) => {
        if (p) {
          setIsAvailable(p.is_available !== false);
          setDepositBalance(Number(p.deposit_balance ?? 0));
          setDepositLocked(Number(p.deposit_locked ?? 0));
        }
      }).catch(() => {});
    }
  }, [loadStats, isProvider]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const focusFirstMissing = () => {
    if (missing.some((f) => ['phone_number', 'city', 'address'].includes(f))) {
      setTab('info');
    } else if (missing.some((f) => ['skills', 'categories', 'payment_method'].includes(f))) {
      setTab('provider');
    } else if (missing.some((f) => KYC_FIELDS.includes(f))) {
      setTab('identity');
    } else {
      setTab('info');
    }
  };

  // ── Sauvegarde infos perso (+ prestataire) ──
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
      });
      const updated = await refreshProfile();
      Alert.alert('Enregistré', updated.can_access_platform
        ? 'Profil complété. Vous avez accès à la plateforme.'
        : 'Informations mises à jour.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSavingInfo(false);
    }
  };

  const saveProvider = async () => {
    setSavingProvider(true);
    try {
      if (skills.length > 0 || selectedCategories.length > 0) {
        await updateProviderProfile({ skills, categories: selectedCategories });
      }
      if (!hasPaymentMethod && payPhone.trim()) {
        const digits = payPhone.replace(/\s/g, '');
        await createPaymentMethod({
          type: 'mobile_money',
          operator,
          phone_number: digits.startsWith('+') ? digits : `${DEFAULT_PHONE_PREFIX}${digits}`,
          is_default: true,
        });
        setHasPaymentMethod(true);
      }
      const updated = await refreshProfile();
      Alert.alert('Enregistré', updated.can_access_platform
        ? 'Profil prestataire mis à jour.'
        : 'Informations mises à jour.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleToggleAvail = async () => {
    setTogglingAvail(true);
    try {
      const res = await toggleAvailability() as { is_available?: boolean };
      setIsAvailable(res.is_available ?? !isAvailable);
      await refreshProfile();
    } catch {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité');
    } finally {
      setTogglingAvail(false);
    }
  };

  // ── KYC ──
  const pickPhoto = async (slot: PhotoSlot, useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', "Autorisez l'accès à la caméra ou aux photos.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setPhotos((p) => ({ ...p, [slot]: { uri: a.uri, name: a.fileName || `${slot}.jpg`, type: a.mimeType || 'image/jpeg' } }));
  };

  const submitKycForm = async () => {
    if (!nina.trim()) {
      Alert.alert('NINA requis', `Saisissez votre numéro ${DEFAULT_ID_LABEL}.`);
      return;
    }
    setSavingKyc(true);
    try {
      await submitKyc({
        nina: nina.trim(),
        idFront: photos.idFront || undefined,
        idBack: photos.idBack || undefined,
        selfie: photos.selfie || undefined,
      });
      await refreshProfile();
      Alert.alert('Soumis', 'Votre dossier KYC est en cours de vérification.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Soumission impossible');
    } finally {
      setSavingKyc(false);
    }
  };

  // ── Mot de passe ──
  const submitPassword = async () => {
    if (newPwd.length < 8) {
      Alert.alert('Mot de passe', 'Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Mot de passe', 'La confirmation ne correspond pas.');
      return;
    }
    setSavingPwd(true);
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd, new_password_confirm: confirmPwd });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      Alert.alert('Succès', 'Mot de passe modifié.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Modification impossible');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleSwitch = async (role: UserRole) => {
    try {
      await switchRole(role);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Erreur', 'Changement de rôle impossible');
    }
  };

  const isFieldMissing = (f: string) => missing.includes(f);

  const primaryRole = (user?.user_type as UserRole) ?? 'client';
  const secondaryRole = (user?.secondary_role as UserRole | undefined) ?? null;
  const targetRole: UserRole | null = secondaryRole
    ? activeRole === secondaryRole
      ? primaryRole
      : secondaryRole
    : null;

  const initials = (user?.first_name?.[0] || '') + (user?.last_name?.[0] || '');

  return (
    <AppLayout
      scroll
      footer={
        blocked ? (
          <View style={styles.bar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barTitle}>Profil incomplet — accès restreint</Text>
              <Text style={styles.barText} numberOfLines={3}>
                {user?.kyc_block_message ||
                  "Complétez votre profil pour accéder à la plateforme."}
                {missing.length > 0 && user?.kyc_access_status === 'incomplete'
                  ? ` Manquant : ${missing.map(profileFieldLabel).join(', ')}.`
                  : ''}
              </Text>
            </View>
            <Pressable style={styles.barBtn} onPress={focusFirstMissing}>
              <Text style={styles.barBtnText}>Compléter</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {/* En-tête identité */}
      <View style={styles.banner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Badge label={isAdmin ? 'ADMINISTRATEUR' : isEnterprise ? 'ENTREPRISE' : isProvider ? 'PRESTATAIRE' : 'CLIENT'} tone="success" />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>{user?.phone_number || 'Tél. non renseigné'}</Text>
          <Text style={styles.meta}>{(user?.city || 'Ville')}, {(user?.country || 'Pays')}</Text>
        </View>
        <View style={styles.pills}>
          <View style={[styles.pill, verified ? styles.pillOk : styles.pillWarn]}>
            <Text style={[styles.pillText, verified ? styles.pillTextOk : styles.pillTextWarn]}>
              {verified
                ? 'Identité vérifiée'
                : user?.kyc_access_status === 'pending_review'
                  ? 'En attente de validation'
                  : user?.kyc_access_status === 'rejected'
                    ? 'KYC rejeté'
                    : 'Profil à compléter'}
            </Text>
          </View>
        </View>
      </View>

      <TabBar
        tabs={[
          { id: 'info', label: isEnterprise ? 'Informations entreprise' : 'Informations personnelles' },
          { id: 'identity', label: 'Vérification identité' },
          ...(isProvider ? [{ id: 'provider', label: 'Profil prestataire' }] : []),
          { id: 'security', label: isEnterprise ? 'Compte administrateur' : 'Sécurité' },
          { id: 'activity', label: 'Activité' },
        ]}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {/* ─────────── Onglet 1 : Informations personnelles ─────────── */}
      {tab === 'info' && (
        <SoftCard>
          <Row>
            <Field label="Prénom" required missing={isFieldMissing('first_name')}>
              <Input placeholder="Votre prénom" value={firstName} onChangeText={setFirstName} />
            </Field>
            <Field label="Nom" required missing={isFieldMissing('last_name')}>
              <Input placeholder="Votre nom" value={lastName} onChangeText={setLastName} />
            </Field>
          </Row>
          <Field label="Téléphone" required missing={isFieldMissing('phone_number')}>
            <Input placeholder="+223 ..." keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </Field>
          <Row>
            <Field label="Pays" missing={isFieldMissing('country')}>
              <Input placeholder="Pays" value={country} onChangeText={setCountry} />
            </Field>
            <Field label="Ville" required missing={isFieldMissing('city')}>
              <Input placeholder="Ville" value={city} onChangeText={setCity} />
            </Field>
          </Row>
          <Field label="Adresse" required missing={isFieldMissing('address')}>
            <Input placeholder="Quartier, rue, repère..." value={address} onChangeText={setAddress} />
          </Field>

          <PrimaryButton label="Enregistrer" onPress={saveInfo} loading={savingInfo} />
        </SoftCard>
      )}

      {/* ─────────── Onglet Profil prestataire ─────────── */}
      {tab === 'provider' && isProvider && (
        <SoftCard>
          <Text style={styles.section}>Compétences & missions</Text>
          <Field label="Compétences" required missing={isFieldMissing('skills')}>
            <MultiChipGroup
              options={PROVIDER_SKILL_OPTIONS.map((s) => ({ id: s.value, label: s.label }))}
              values={skills}
              onToggle={(id) => toggle(skills, setSkills, id)}
            />
          </Field>
          <Field label="Catégories de missions" required missing={isFieldMissing('categories')}>
            <MultiChipGroup
              options={categories.map((c) => ({ id: c.slug || c.id, label: c.name }))}
              values={selectedCategories}
              onToggle={(id) => toggle(selectedCategories, setSelectedCategories, id)}
            />
          </Field>

          {!hasPaymentMethod && (
            <Field label="Méthode de paiement (Mobile Money)" required missing={isFieldMissing('payment_method')}>
              <ChipGroup options={OPERATOR_OPTIONS} value={operator} onChange={setOperator} />
              <Input placeholder="Numéro Mobile Money" keyboardType="phone-pad" value={payPhone} onChangeText={setPayPhone} />
            </Field>
          )}

          <View style={styles.sep} />
          <Text style={styles.section}>Disponibilité</Text>
          <View style={styles.availRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.availTitle}>Accepter de nouvelles missions</Text>
              <Text style={styles.availDesc}>Désactivez temporairement si vous n'êtes pas disponible.</Text>
            </View>
            <Pressable
              style={[styles.availBtn, isAvailable ? styles.availOn : styles.availOff, togglingAvail && { opacity: 0.6 }]}
              onPress={handleToggleAvail}
              disabled={togglingAvail}
            >
              <Text style={[styles.availBtnText, isAvailable && styles.availBtnTextOn]}>
                {isAvailable ? 'Disponible' : 'Indisponible'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.sep} />
          <Text style={styles.section}>Caution</Text>
          <View style={styles.depositRow}>
            <View style={[styles.depositCard, styles.depositAvail]}>
              <Text style={styles.depositValue}>{formatXOF(depositBalance)}</Text>
              <Text style={styles.depositLabel}>Solde caution</Text>
            </View>
            <View style={[styles.depositCard, styles.depositLock]}>
              <Text style={styles.depositValue}>{formatXOF(depositLocked)}</Text>
              <Text style={styles.depositLabel}>Caution bloquée</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/deposit')}>
            <Text style={styles.depositLink}>Gérer ma caution ›</Text>
          </Pressable>

          <PrimaryButton label="Enregistrer le profil" onPress={saveProvider} loading={savingProvider} />
        </SoftCard>
      )}

      {/* ─────────── Onglet 2 : Vérification identité ─────────── */}
      {tab === 'identity' && (
        <SoftCard>
          <Text style={styles.tabIntro}>
            La vérification d'identité est obligatoire pour débloquer la plateforme. Votre {DEFAULT_ID_LABEL},
            votre téléphone et vos documents seront vérifiés.
          </Text>

          {kycVerified ? (
            <View style={[styles.pill, styles.pillOk, { alignSelf: 'flex-start', marginBottom: spacing.md }]}>
              <Text style={[styles.pillText, styles.pillTextOk]}>Identité vérifiée par l'équipe BlockTask</Text>
            </View>
          ) : user?.kyc_access_status === 'pending_review' ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>Votre dossier est en cours de validation par l'équipe BlockTask.</Text>
            </View>
          ) : (
            <>
              {user?.kyc_access_status === 'rejected' && user?.kyc_block_message ? (
                <View style={styles.rejectBox}>
                  <Text style={styles.rejectText}>{user.kyc_block_message}</Text>
                </View>
              ) : null}

              <FieldLabel>Numéro {DEFAULT_ID_LABEL}</FieldLabel>
              <Input placeholder="Ex. ML1234567890" value={nina} onChangeText={setNina} />

              {(['idFront', 'idBack', 'selfie'] as PhotoSlot[]).map((slot) => (
                <View key={slot} style={styles.slot}>
                  <Text style={styles.slotLabel}>
                    {slot === 'idFront' ? "Pièce d'identité (recto)" : slot === 'idBack' ? "Pièce d'identité (verso)" : 'Selfie de vérification'}
                  </Text>
                  <Text style={styles.slotStatus}>{photos[slot] ? 'Photo ajoutée' : 'Aucune photo'}</Text>
                  <View style={styles.slotBtns}>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton label="Photo" onPress={() => pickPhoto(slot, true)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton label="Galerie" onPress={() => pickPhoto(slot, false)} />
                    </View>
                  </View>
                </View>
              ))}

              <PrimaryButton label="Soumettre le dossier KYC" onPress={submitKycForm} loading={savingKyc} />
            </>
          )}
        </SoftCard>
      )}

      {/* ─────────── Onglet 3 : Sécurité ─────────── */}
      {tab === 'security' && (
        <SoftCard>
          <Text style={styles.section}>Changer le mot de passe</Text>
          <FieldLabel>Mot de passe actuel</FieldLabel>
          <PasswordInput placeholder="••••••••" value={oldPwd} onChangeText={setOldPwd} />
          <FieldLabel>Nouveau mot de passe</FieldLabel>
          <PasswordInput placeholder="••••••••" value={newPwd} onChangeText={setNewPwd} />
          <FieldLabel>Confirmer le nouveau mot de passe</FieldLabel>
          <PasswordInput placeholder="••••••••" value={confirmPwd} onChangeText={setConfirmPwd} />
          <PrimaryButton label="Modifier le mot de passe" onPress={submitPassword} loading={savingPwd} />
        </SoftCard>
      )}

      {/* ─────────── Onglet 4 : Activité ─────────── */}
      {tab === 'activity' && (
        <>
          <View style={styles.statsGrid}>
            <StatCard value={stats?.active_missions ?? 0} label={isProvider ? 'Missions actives' : 'Missions en cours'} tint={colors.info} />
            <StatCard value={stats?.completed_missions ?? 0} label="Terminées" tint={colors.success} />
            <StatCard value={stats?.pending_missions ?? 0} label="En attente" tint={colors.warning} />
            <StatCard
              value={`${((isProvider ? stats?.total_earned : stats?.total_spent) ?? 0).toLocaleString('fr-FR')}`}
              label={isProvider ? 'Gagné (FCFA)' : 'Dépensé (FCFA)'}
              tint={colors.accent}
            />
          </View>

          <SoftCard>
            <Text style={styles.section}>Informations du compte</Text>
            <InfoLine label="Membre depuis" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            <InfoLine label="Email vérifié" ok={!!user?.email_verified} />
            <InfoLine label="Téléphone vérifié" ok={!!user?.phone_verified} />
            <InfoLine label="Statut KYC" value={user?.kyc_status || '—'} />
          </SoftCard>
        </>
      )}

      {/* Raccourcis & espace */}
      <SoftCard>
        <Text style={styles.section}>Raccourcis</Text>
        {isProvider ? (
          <>
            <ShortcutRow label="Mes revenus" onPress={() => router.push('/earnings')} />
            <ShortcutRow label="Ma caution" onPress={() => router.push('/deposit')} />
          </>
        ) : isEnterprise ? (
          <>
            <ShortcutRow label="Mon entreprise" onPress={() => router.push('/enterprise-profile')} />
            <ShortcutRow label="Employés" onPress={() => router.push('/employees')} />
            <ShortcutRow label="Finances" onPress={() => router.push('/finances')} />
            <ShortcutRow label="Caution entreprise" onPress={() => router.push('/deposit')} />
          </>
        ) : (
          <ShortcutRow label="Paiements" onPress={() => router.push('/payments')} />
        )}
        {isProvider && <ShortcutRow label="Réputation" onPress={() => router.push('/reputation')} />}
        <ShortcutRow label="Sollicitations" onPress={() => router.push('/solicitations')} />
        <ShortcutRow label="Litiges" onPress={() => router.push('/disputes')} />
      </SoftCard>

      {targetRole ? (
        <SoftCard>
          <Text style={styles.section}>Espace</Text>
          <View style={styles.spaceCurrent}>
            <Text style={styles.spaceCurrentLabel}>Espace actuel</Text>
            <View style={styles.spaceCurrentPill}>
              <Text style={styles.spaceCurrentPillText}>{ROLE_LABELS[activeRole] || activeRole}</Text>
            </View>
          </View>
          <SecondaryButton
            label={`Passer en espace ${ROLE_LABELS[targetRole] || targetRole}`}
            onPress={() => handleSwitch(targetRole)}
          />
        </SoftCard>
      ) : null}

      <PrimaryButton label="Déconnexion" onPress={handleLogout} />
      <View style={{ height: blocked ? 96 : spacing.md }} />
    </AppLayout>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Field({
  label,
  children,
  required,
  missing,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  missing?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
        {missing ? <Text style={styles.missingTag}>  À compléter</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function StatCard({ value, label, tint }: { value: number | string; label: string; tint: string }) {
  return (
    <View style={[styles.statCard, shadow]}>
      <View style={[styles.statAccent, { backgroundColor: tint }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoLine({ label, value, ok }: { label: string; value?: string; ok?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      {ok === undefined ? (
        <Text style={styles.infoValue}>{value}</Text>
      ) : (
        <Text style={[styles.infoValue, { color: ok ? colors.success : colors.danger }]}>{ok ? 'Oui' : 'Non'}</Text>
      )}
    </View>
  );
}

function ShortcutRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.shortcut} onPress={onPress}>
      <Text style={styles.shortcutLabel}>{label}</Text>
      <Text style={styles.shortcutArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1a1a2e',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 24 },
  name: { fontSize: 19, fontWeight: '800', color: '#fff', marginBottom: 6 },
  metaRow: { alignItems: 'center', marginTop: spacing.sm, gap: 2 },
  meta: { color: '#cbd5e1', fontSize: 12.5 },
  pills: { flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillOk: { backgroundColor: 'rgba(34,197,94,0.18)' },
  pillWarn: { backgroundColor: 'rgba(245,158,11,0.18)' },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextOk: { color: '#4ade80' },
  pillTextWarn: { color: '#fbbf24' },

  section: { fontWeight: '700', marginBottom: spacing.sm, color: colors.text, fontSize: 15 },
  tabIntro: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, marginBottom: spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  req: { color: colors.danger },
  missingTag: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  availRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  availTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  availDesc: { color: colors.textMuted, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  availBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5 },
  availOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  availOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  availBtnText: { fontWeight: '700', fontSize: 12, color: colors.textMuted },
  availBtnTextOn: { color: '#fff' },

  depositRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  depositCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  depositAvail: { backgroundColor: '#f0faf4' },
  depositLock: { backgroundColor: '#fef3c7' },
  depositValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  depositLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  depositLink: { color: colors.primary, fontWeight: '700', marginBottom: spacing.md },

  slot: { marginTop: spacing.sm, marginBottom: 4 },
  slotLabel: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  slotStatus: { color: colors.textMuted, fontSize: 12.5, marginBottom: 6 },
  slotBtns: { flexDirection: 'row', gap: spacing.sm },

  infoBox: { backgroundColor: colors.infoLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  infoBoxText: { color: '#1e40af', fontSize: 13.5, lineHeight: 19 },
  rejectBox: { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  rejectText: { color: '#991b1b', fontSize: 13.5, lineHeight: 19 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  statAccent: { width: 28, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  infoLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.textMuted, fontSize: 14 },
  infoValue: { color: colors.text, fontWeight: '700', fontSize: 14 },

  spaceCurrent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  spaceCurrentLabel: { color: colors.textMuted, fontSize: 14 },
  spaceCurrentPill: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  spaceCurrentPillText: { color: colors.primary, fontWeight: '800', fontSize: 13 },

  shortcut: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  shortcutLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  shortcutArrow: { color: colors.textMuted, fontSize: 20 },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  barTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  barText: { color: '#dbeafe', fontSize: 12, marginTop: 3, lineHeight: 17 },
  barBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  barBtnText: { color: '#1e3a5f', fontWeight: '800', fontSize: 13 },
});
