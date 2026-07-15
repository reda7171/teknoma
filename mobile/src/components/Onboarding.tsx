import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Animated,
} from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '📚',
    title: 'Bienvenue sur Riwaya',
    subtitle: 'La meilleure librairie en ligne au Maroc. Des livres pour tous les goûts, livrés chez vous.',
    bg: '#0274DF',
    accent: '#FFFFFF',
  },
  {
    id: '2',
    icon: '🔥',
    title: 'Packs & Promotions',
    subtitle: 'Économisez plus avec nos packs exclusifs — jusqu\'à 30% de réduction sur une sélection de livres.',
    bg: '#1A1A2E',
    accent: '#0274DF',
  },
  {
    id: '3',
    icon: '🚚',
    title: 'Paiement à la livraison',
    subtitle: 'Commandez maintenant, payez à la réception. Aucune carte bancaire nécessaire.',
    bg: '#064E3B',
    accent: '#10B981',
  },
];

export function Onboarding() {
  const setDone = useAppStore((s) => s.setOnboardingDone);
  const [currentIdx, setCurrentIdx] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const goNext = () => {
    if (currentIdx < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIdx + 1 });
      setCurrentIdx(currentIdx + 1);
    } else {
      setDone();
    }
  };

  const skip = () => setDone();

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIdx(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg, width }]}>
            <Text style={styles.slideIcon}>{item.icon}</Text>
            <Text style={[styles.slideTitle, { color: '#FFFFFF' }]}>{item.title}</Text>
            <Text style={[styles.slideSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
              {item.subtitle}
            </Text>
            {/* Bouton accent */}
            <View style={[styles.accentBar, { backgroundColor: item.accent }]} />
          </View>
        )}
      />

      {/* Indicateurs de pagination */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
          return (
            <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
          );
        })}
      </View>

      {/* Boutons navigation */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {currentIdx === SLIDES.length - 1 ? 'Commencer' : 'Suivant →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  slide:        { height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 20 },
  slideIcon:    { fontSize: 80, marginBottom: 16 },
  slideTitle:   { fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
  slideSubtitle:{ fontSize: 16, textAlign: 'center', lineHeight: 24 },
  accentBar:    { width: 60, height: 4, borderRadius: 2, marginTop: 8 },
  dotsRow:      { position: 'absolute', bottom: 130, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:          { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  footer:       { position: 'absolute', bottom: 56, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn:      { padding: 12 },
  skipText:     { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  nextBtn:      { backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50 },
  nextText:     { color: '#000000', fontSize: 16, fontWeight: '800' },
});
