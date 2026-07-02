import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from './buttons';
import { colors, spacing } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  description: string;
  accent: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    emoji: '🌍',
    title: 'Bienvenue sur BlockTask',
    description:
      'La plateforme qui connecte clients, prestataires et entreprises pour réaliser vos missions en toute confiance.',
    accent: colors.primary,
  },
  {
    id: 'missions',
    emoji: '📋',
    title: 'Publiez ou postulez',
    description:
      'Les clients créent des missions. Les prestataires et entreprises candidatent tant que la mission n\'est pas assignée.',
    accent: colors.accent,
  },
  {
    id: 'payment',
    emoji: '🔒',
    title: 'Paiement sécurisé',
    description:
      'Fonds bloqués en escrow, Mobile Money (Orange, MTN, Moov) et traçabilité blockchain pour protéger chaque transaction.',
    accent: '#0ea5e9',
  },
  {
    id: 'tracking',
    emoji: '📍',
    title: 'Suivi en temps réel',
    description:
      'GPS live, preuves photo, validation QR et notifications pour suivre votre mission du début à la fin.',
    accent: '#f59e0b',
  },
  {
    id: 'start',
    emoji: '🚀',
    title: 'Prêt à commencer ?',
    description:
      'Créez votre compte en quelques minutes ou connectez-vous pour accéder à votre tableau de bord.',
    accent: colors.primary,
  },
];

export function OnboardingCarousel() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i >= 0 && i < SLIDES.length) setIndex(i);
  }, []);

  const goNext = () => {
    if (isLast) return;
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const goPrev = () => {
    if (isFirst) return;
    listRef.current?.scrollToIndex({ index: index - 1, animated: true });
  };

  const renderItem: ListRenderItem<OnboardingSlide> = ({ item }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${item.accent}18` }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>BlockTask</Text>
        </View>
        {!isLast ? (
          <Pressable onPress={() => listRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true })} hitSlop={12}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.id}
              style={[styles.dot, i === index && styles.dotActive, i === index && { backgroundColor: SLIDES[index].accent }]}
            />
          ))}
        </View>

        {isLast ? (
          <>
            <View style={styles.navRow}>
              <View style={styles.navSide}>
                <SecondaryButton label="Précédent" onPress={goPrev} />
              </View>
              <View style={styles.navSide} />
            </View>
            <View style={styles.ctaGroup}>
              <PrimaryButton label="Se connecter" onPress={() => router.push('/login')} />
              <SecondaryButton label="Créer un compte" onPress={() => router.push('/register')} />
            </View>
          </>
        ) : (
          <View style={styles.navRow}>
            <View style={styles.navSide}>
              {!isFirst ? (
                <SecondaryButton label="Précédent" onPress={goPrev} />
              ) : null}
            </View>
            <View style={styles.navSide}>
              <PrimaryButton label="Continuer" onPress={goNext} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  skip: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  list: { flex: 1 },
  listContent: { flexGrow: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emoji: { fontSize: 52 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  navSide: {
    flex: 1,
  },
  ctaGroup: { gap: spacing.sm },
});
