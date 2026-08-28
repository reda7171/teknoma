import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - Spacing.four * 1.5;

// Composant d'animation shimmer (pulse) réutilisable
function ShimmerBox({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.4));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity.current, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity.current, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Animated.View
      style={[{ backgroundColor: colors.backgroundSelected, borderRadius: 8, opacity: opacity.current }, style]}
    />
  );
}

// Carte skeleton mimant le BookCard
export function SkeletonCard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ShimmerBox style={styles.image} />
      <View style={styles.info}>
        <ShimmerBox style={styles.line1} />
        <ShimmerBox style={styles.line2} />
        <ShimmerBox style={styles.line3} />
      </View>
    </View>
  );
}

// Grille de skeletons pour le catalogue
export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// Skeleton horizontal (packs)
export function SkeletonHorizontal({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { width: CARD_WIDTH, borderRadius: Spacing.three, overflow: 'hidden', marginBottom: Spacing.three },
  image:  { width: '100%', height: CARD_WIDTH * 1.4, borderRadius: 0 },
  info:   { padding: Spacing.two, gap: 8 },
  line1:  { height: 14, width: '90%' },
  line2:  { height: 12, width: '60%' },
  line3:  { height: 16, width: '40%' },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  row:    { flexDirection: 'row', gap: Spacing.three },
});
