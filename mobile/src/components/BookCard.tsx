import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { Product } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { playFavoriteSound } from '@/utils/sounds';

interface BookCardProps {
  product: Product;
  showWishlist?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - Spacing.four * 1.5;

export const BookCard = ({ product, showWishlist = true }: BookCardProps) => {
  const router = useRouter();
  const scheme = useColorScheme();
  // Applique le bon thème dynamiquement
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const toggle = useWishlistStore((state) => state.toggle);
  const items = useWishlistStore((state) => state.items);
  const liked = items.some((p) => p.id === product.id);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/book/${product.id}`)}
      >
        <Animated.View sharedTransitionTag={`book-image-${product.id}`} style={styles.imageContainer}>
          <Image
            source={product.image}
            style={[styles.image, { backgroundColor: colors.backgroundSelected }]}
            contentFit="cover"
            transition={300}
          />
        </Animated.View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {product.title}
          </Text>
          {product.author && (
            <TouchableOpacity onPress={() => router.push(`/author/${encodeURIComponent(product.author)}`)}>
              <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
                {product.author}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.price}>{product.price.toFixed(2)} MAD</Text>
        </View>
      </TouchableOpacity>

      {showWishlist && (
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => {
            if (!liked) playFavoriteSound();
            toggle(product);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.heart, liked && styles.heartActive]}>
            {liked ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      )}
      {product.type === 'PACK' && (
        <View style={styles.packBadge}>
          <Text style={styles.packBadgeText}>PACK</Text>
        </View>
      )}
      {product.language && (
        <View style={[styles.langBadge, product.type === 'PACK' ? { top: 32 } : {}]}>
          <Text style={styles.langBadgeText}>{product.language.toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    marginBottom: Spacing.six,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart:       { fontSize: 18, color: '#CBD5E1' },
  heartActive: { color: '#EF4444' },
  packBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0274DF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  packBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  langBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  infoContainer: { padding: Spacing.two },
  title:  { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  author: { fontSize: 12, marginBottom: 8 },
  price:  { fontSize: 16, fontWeight: 'bold', color: '#0274DF' },
});
