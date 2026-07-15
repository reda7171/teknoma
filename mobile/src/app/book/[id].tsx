import React, { useState, useEffect } from 'react';
import { Share, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { getBooks, getPacks, getReviews, getSimilarBooks, postReview } from '@/services/api';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useRecentStore } from '@/store/useRecentStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BookCard } from '@/components/BookCard';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme, Modal, TextInput, Alert } from 'react-native';

/* Composant étoiles */
const Stars = ({ rating }: { rating: number }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: 14, color: s <= Math.round(rating) ? '#F59E0B' : '#CBD5E1' }}>★</Text>
      ))}
    </View>
  );
};

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const addItem = useCartStore((state) => state.addItem);
  const { toggle, isInWishlist } = useWishlistStore();
  const addRecent = useRecentStore((state) => state.addRecent);
  const { isLoggedIn, customer } = useAuthStore();
  const liked = isInWishlist(id as string);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Partage natif du livre
  const handleShare = async () => {
    if (!product) return;
    await Share.share({
      title: product.title,
      message: `Découvrez "${product.title}"${product.author ? ` par ${product.author}` : ''} sur Riwaya — ${product.price.toFixed(2)} MAD\nhttps://riwaya.ma/books/${product.id}`,
    });
  };

  const { data: books, isLoading: loadingBooks } = useQuery({ queryKey: ['books'], queryFn: () => getBooks() });
  const { data: packs, isLoading: loadingPacks } = useQuery({ queryKey: ['packs'], queryFn: () => getPacks() });

  const allProducts = [...(books || []), ...(packs || [])];
  const product = allProducts.find((p) => p.id === id);

  // Ajout à l'historique quand le produit est chargé
  React.useEffect(() => {
    if (product) addRecent(product);
  }, [product, addRecent]);

  // Avis (seulement pour les livres)
  const { data: reviewData, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => getReviews(id as string),
    enabled: !!id && product?.type === 'BOOK',
  });

  // Livres similaires (seulement pour les livres)
  const { data: similarData } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => getSimilarBooks(id as string),
    enabled: !!id && product?.type === 'BOOK',
  });

  if (loadingBooks || loadingPacks) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#0274DF" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Produit introuvable.</Text>
      </View>
    );
  }

  const reviews = reviewData?.reviews || [];
  const avgRating = reviewData?.avgRating || 0;
  const similarBooks = similarData?.books || [];

  const handleAddToCart = () => {
    addItem(product);
    alert('Produit ajouté au panier !');
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire.');
      return;
    }
    setSubmittingReview(true);
    try {
      await postReview(product.id, {
        fullName: customer?.fullName || 'Client',
        rating: reviewRating,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      refetchReviews();
      Alert.alert('Succès', 'Votre avis a été publié !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header avec retour + wishlist + share */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.wishlistBtn, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggle(product)}
              style={[styles.wishlistBtn, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.wishlistIcon, liked && styles.wishlistIconActive]}>
                {liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image avec Shared Transition */}
        <Animated.View sharedTransitionTag={`book-image-${product.id}`} style={styles.imageContainer}>
          <Image source={product.image} style={styles.image} contentFit="contain" transition={300} />
        </Animated.View>

        {/* Infos produit */}
        <View style={styles.detailsContainer}>
          {product.type === 'PACK' && (
            <View style={styles.packChip}>
              <Text style={styles.packChipText}>PACK</Text>
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{product.title}</Text>
          {product.author && <Text style={styles.author}>Par {product.author}</Text>}

          {/* Note moyenne */}
          {avgRating > 0 && (
            <View style={styles.ratingRow}>
              <Stars rating={avgRating} />
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                {avgRating.toFixed(1)} ({reviewData?.total} avis)
              </Text>
            </View>
          )}

          <Text style={styles.price}>{product.price.toFixed(2)} MAD</Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {product.type === 'PACK'
              ? 'Ce pack exclusif comprend une sélection de livres conçue pour vous faire économiser.'
              : 'Découvrez ce chef-d\'œuvre qui vous tiendra en haleine du début à la fin. Un incontournable pour votre collection.'}
          </Text>
        </View>

        {/* Section Avis */}
        {product.type === 'BOOK' && (
          <View style={styles.section}>
            <View style={styles.reviewSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Avis clients</Text>
              <TouchableOpacity onPress={() => {
                if (!isLoggedIn) {
                  Alert.alert('Connexion requise', 'Vous devez être connecté pour laisser un avis.', [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Se connecter', onPress: () => router.push('/login') }
                  ]);
                } else {
                  setShowReviewModal(true);
                }
              }}>
                <Text style={styles.addReviewBtnText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>Aucun avis pour l'instant. Soyez le premier !</Text>
            ) : (
              reviews.map((r: any) => (
                <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewName, { color: colors.text }]}>{r.fullName}</Text>
                    {r.city && <Text style={[styles.reviewCity, { color: colors.textSecondary }]}>{r.city}</Text>}
                  </View>
                  <Stars rating={r.rating} />
                  <Text style={[styles.reviewComment, { color: colors.text }]}>{r.comment}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Section Livres similaires */}
        {similarBooks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vous aimerez aussi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
              {similarBooks.map((b: any) => (
                <View key={b.id} style={{ width: 160 }}>
                  <BookCard product={b} showWishlist={false} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Bouton Ajouter au panier */}
      <View style={[styles.bottomBar, { borderTopColor: colors.backgroundSelected }]}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Ajouter au panier</Text>
        </TouchableOpacity>
      </View>

      {/* Modal d'ajout d'avis */}
      <Modal visible={showReviewModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Laisser un avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={{ fontSize: 24, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ marginVertical: Spacing.four, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Votre note</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                    <Text style={{ fontSize: 32, color: s <= reviewRating ? '#F59E0B' : '#CBD5E1' }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={[styles.reviewInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Écrivez votre commentaire ici..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <TouchableOpacity 
              style={[styles.applyBtn, submittingReview && { opacity: 0.7 }]} 
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? <ActivityIndicator color="#FFF" /> : <Text style={styles.applyBtnText}>Publier</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:        { padding: Spacing.four, paddingBottom: 100 },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four },
  shareIcon:        { fontSize: 20, color: '#0274DF', fontWeight: '800' },
  backText:         { fontSize: 16, color: '#0274DF', fontWeight: '600' },
  wishlistBtn:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  wishlistIcon:     { fontSize: 22, color: '#CBD5E1' },
  wishlistIconActive:{ color: '#EF4444' },
  imageContainer:   { width: '100%', height: 320, marginBottom: Spacing.four },
  image:            { width: '100%', height: '100%', borderRadius: Spacing.three },
  detailsContainer: { gap: Spacing.two, marginBottom: Spacing.four },
  packChip:         { alignSelf: 'flex-start', backgroundColor: '#0274DF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  packChipText:     { color: '#FFF', fontSize: 11, fontWeight: '800' },
  title:            { fontSize: 24, fontWeight: 'bold' },
  author:           { fontSize: 16, color: Colors.light.textSecondary },
  ratingRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingText:       { fontSize: 13 },
  price:            { fontSize: 24, fontWeight: '800', color: '#0274DF', marginTop: 4 },
  description:      { fontSize: 15, lineHeight: 23, marginTop: 4 },
  section:          { marginBottom: Spacing.five },
  sectionTitle:     { fontSize: 18, fontWeight: '700', marginBottom: Spacing.three },
  reviewCard:       { borderRadius: 12, padding: Spacing.three, marginBottom: Spacing.two, gap: 6 },
  reviewHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName:       { fontSize: 14, fontWeight: '700' },
  reviewCity:       { fontSize: 12 },
  reviewComment:    { fontSize: 14, lineHeight: 20, marginTop: 4 },
  reviewSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  addReviewBtnText: { color: '#0274DF', fontWeight: '700' },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.four, borderTopWidth: 1, backgroundColor: 'rgba(255,255,255,0.95)' },
  addToCartButton:  { backgroundColor: '#0274DF', paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  addToCartText:    { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.four },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:       { fontSize: 20, fontWeight: 'bold' },
  reviewInput:      { borderRadius: 12, padding: Spacing.three, minHeight: 100, textAlignVertical: 'top', fontSize: 16 },
  applyBtn:         { backgroundColor: '#0274DF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: Spacing.four },
  applyBtnText:     { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
