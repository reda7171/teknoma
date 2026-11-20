import React, { useState } from 'react';
import { Share, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, Alert, useColorScheme, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, RefreshControl, Linking } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBooks, getPacks, getReviews, getSimilarBooks, postReview, updateReview, deleteReview, addToReadingList, getReadingList } from '@/services/api';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useRecentStore } from '@/store/useRecentStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18nStore } from '@/store/useI18nStore';
import { BookCard } from '@/components/BookCard';
import { BookKeyInsights } from '@/components/BookKeyInsights';
import { Colors, Spacing } from '@/constants/theme';
import { playFavoriteSound } from '@/utils/sounds';

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const addItem = useCartStore((state) => state.addItem);
  const toggle = useWishlistStore((state) => state.toggle);
  const items = useWishlistStore((state) => state.items);
  const addRecent = useRecentStore((state) => state.addRecent);
  const { isLoggedIn, customer } = useAuthStore();
  const { t } = useI18nStore();
  const liked = items.some((p) => p.id === id);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const handleAddToReadingList = async () => {
    if (!isLoggedIn) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter ce livre à votre liste.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') }
      ]);
      return;
    }
    try {
      setAddingToList(true);
      await addToReadingList({
        title: product.title,
        author: product.author || 'Inconnu',
        totalPages: 300, // Default pages if not specified
        cover: product.image,
        bookId: product.id,
      });
      Alert.alert('Succès', 'Ajouté à votre liste de lecture !');
      refetchReadingList();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || "Impossible d'ajouter à la liste.");
    } finally {
      setAddingToList(false);
    }
  };

  const { data: books, isLoading: loadingBooks, refetch: refetchBooks } = useQuery({ queryKey: ['books'], queryFn: () => getBooks() });
  const { data: packs, isLoading: loadingPacks, refetch: refetchPacks } = useQuery({ queryKey: ['packs'], queryFn: () => getPacks() });

  const { data: readingList, refetch: refetchReadingList } = useQuery({
    queryKey: ['readingList'],
    queryFn: () => getReadingList(),
    enabled: isLoggedIn,
  });

  const isInReadingList = readingList?.some((item: any) => item.bookId === id);

  const allProducts = [...(books || []), ...(packs || [])];
  const product = allProducts.find((p) => p.id === id);

  React.useEffect(() => {
    if (product) addRecent(product);
  }, [product, addRecent]);

  const { data: reviewData, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => getReviews(id as string),
    enabled: !!id && product?.type === 'BOOK',
  });

  const { data: similarData, refetch: refetchSimilar } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => getSimilarBooks(id as string),
    enabled: !!id && product?.type === 'BOOK',
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchBooks(),
      refetchPacks(),
      refetchReadingList(),
      refetchReviews(),
      refetchSimilar()
    ]);
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!product) return;
    await Share.share({
      title: product.title,
      message: `Découvrez "${product.title}"${product.author ? ` par ${product.author}` : ''} sur Riwaya — ${product.price.toFixed(2)} MAD\nhttps://riwaya.ma/books/${product.id}`,
    });
  };

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
      Alert.alert('Succès', 'Produit ajouté au panier !');
    }
  };

  const handleWhatsAppOrder = () => {
    if (!product) return;
    const priceText = product.price > 0 ? ` (Prix : ${product.price.toFixed(2)} MAD)` : '';
    const authorText = product.author ? ` par ${product.author}` : '';
    const message = `Bonjour, je souhaite commander ce ${product.type === 'PACK' ? 'pack' : 'livre'} : "${product.title}"${authorText}${priceText}. Livraison au Maroc.`;
    const url = `whatsapp://send?phone=212702220575&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/212702220575?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Linking.openURL(webUrl);
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire.');
      return;
    }
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await updateReview(product!.id, editingReviewId, {
          rating: reviewRating,
          comment: reviewComment,
        });
        Alert.alert('Succès', 'Votre avis a été modifié !');
      } else {
        await postReview(product!.id, {
          fullName: customer?.fullName || 'Client',
          rating: reviewRating,
          comment: reviewComment,
        });
        Alert.alert('Succès', 'Votre avis a été publié !');
      }
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      setEditingReviewId(null);
      refetchReviews();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditReview = (r: any) => {
    setEditingReviewId(r.id);
    setReviewRating(r.rating);
    setReviewComment(r.comment);
    setShowReviewModal(true);
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet avis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReview(product!.id, reviewId);
              Alert.alert('Succès', 'Avis supprimé.');
              refetchReviews();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

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
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Produit introuvable.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.push('/')}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retourner à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reviews = reviewData?.reviews || [];
  const avgRating = reviewData?.avgRating || 0;
  const similarBooks = similarData?.books || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Navigation */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="share-social-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              if (!liked) playFavoriteSound();
              toggle(product);
            }} style={[styles.iconBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? '#EF4444' : colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#0274DF" 
          />
        }
      >
        {/* Image Presentation */}
        <View style={styles.imageWrapper}>
          <Animated.View sharedTransitionTag={`book-image-${product.id}`} style={styles.imageBackground}>
            <LinearGradient
              colors={scheme === 'dark' ? ['#1F2937', '#111827'] : ['#E0E7FF', '#F3F4F6']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 32 }}
            />
            <Image source={product.image} style={styles.image} contentFit="contain" transition={300} />
          </Animated.View>
        </View>

        {/* Content Details */}
        <View style={styles.detailsBox}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {product.type === 'PACK' && (
              <View style={[styles.badgePack, { marginBottom: 0 }]}>
                <Ionicons name="layers" size={12} color="#FFF" />
                <Text style={styles.badgePackText}>PACK EXCLUSIF</Text>
              </View>
            )}
            {product.language && (
              <View style={[styles.badgePack, { backgroundColor: colors.textSecondary, marginBottom: 0 }]}>
                <Ionicons name="language" size={12} color="#FFF" />
                <Text style={styles.badgePackText}>{product.language.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{product.title}</Text>
          
          {product.author && (
            <TouchableOpacity onPress={() => router.push(`/author/${encodeURIComponent(product.author!)}`)}>
              <Text style={[styles.author, { color: colors.textSecondary }]}>
                <Ionicons name="person-outline" size={14} /> {product.author}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price.toFixed(2)} <Text style={styles.currency}>MAD</Text></Text>
            {avgRating > 0 && (
              <View style={[styles.ratingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 4 }}>({reviewData?.total})</Text>
              </View>
            )}
          </View>

          {/* Quick WhatsApp Order Banner */}
          <TouchableOpacity 
            style={[
              styles.whatsAppQuickBtn, 
              { backgroundColor: scheme === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: scheme === 'dark' ? '#047857' : '#A7F3D0' }
            ]} 
            onPress={handleWhatsAppOrder}
            activeOpacity={0.85}
          >
            <View style={styles.whatsAppIconCircle}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.whatsAppBtnTitle, { color: scheme === 'dark' ? '#A7F3D0' : '#065F46' }]}>
                {t('order_whatsapp')}
              </Text>
              <Text style={[styles.whatsAppBtnSubtitle, { color: scheme === 'dark' ? '#6EE7B7' : '#047857' }]}>
                {t('whatsapp_order_subtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={scheme === 'dark' ? '#34D399' : '#059669'} />
          </TouchableOpacity>

          {product.description ? (
            <View style={styles.descriptionBox}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Description</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* Sommaire & Citations */}
          {product.type === 'BOOK' && (
            <BookKeyInsights
              title={product.title}
              author={product.author}
              description={product.description}
            />
          )}
        </View>

        {/* Reviews Section */}
        {product.type === 'BOOK' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Avis des lecteurs</Text>
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
                <Text style={styles.actionText}>Écrire un avis</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Soyez le premier à donner votre avis !</Text>
              </View>
            ) : (
              reviews.map((r: any) => (
                <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.reviewHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewName, { color: colors.text }]}>{r.fullName}</Text>
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name="star" size={12} color={s <= r.rating ? '#F59E0B' : '#CBD5E1'} />
                        ))}
                      </View>
                    </View>
                    {customer?.id === r.customerId && (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => handleEditReview(r)}>
                          <Ionicons name="create-outline" size={20} color="#0274DF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteReview(r.id)}>
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.reviewComment, { color: colors.text }]}>{r.comment}</Text>
                  {r.city && <Text style={[styles.reviewCity, { color: colors.textSecondary }]}>{r.city}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {/* Similar Books Section */}
        {similarBooks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 12 }]}>Vous aimerez aussi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {similarBooks.map((b: any) => (
                <View key={b.id} style={{ width: 150 }}>
                  <BookCard product={b} showWishlist={false} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.floatingBottomBar, { backgroundColor: colors.background }]}>
        {product.type === 'BOOK' && (
          <TouchableOpacity 
            style={[styles.readingListBtn, { backgroundColor: colors.backgroundElement }]} 
            onPress={handleAddToReadingList} 
            disabled={addingToList || isInReadingList}
          >
            {addingToList ? (
              <ActivityIndicator size="small" color="#0274DF" />
            ) : isInReadingList ? (
              <Ionicons name="bookmark" size={24} color="#10B981" />
            ) : (
              <Ionicons name="book-outline" size={24} color="#0274DF" />
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.addToCartContainer, product.type !== 'BOOK' && { flex: 1 }]} onPress={handleAddToCart} activeOpacity={0.9}>
          <LinearGradient
            colors={['#0274DF', '#025AB0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addToCartGradient}
          >
            <Ionicons name="cart" size={24} color="#FFF" />
            <Text style={styles.addToCartText}>Ajouter au panier</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{editingReviewId ? 'Modifier l\'avis' : 'Laisser un avis'}</Text>
                  <TouchableOpacity onPress={() => {
                    setShowReviewModal(false);
                    setEditingReviewId(null);
                    setReviewComment('');
                    setReviewRating(5);
                  }} style={[styles.iconBtn, { backgroundColor: colors.backgroundElement }]}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.ratingSelector}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 16 }}>Notez ce livre</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                        <Ionicons name="star" size={40} color={s <= reviewRating ? '#F59E0B' : '#CBD5E1'} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={[styles.reviewInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                  placeholder="Partagez votre expérience avec ce livre..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={5}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />

                <TouchableOpacity 
                  style={[styles.applyBtn, submittingReview && { opacity: 0.7 }]} 
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? <ActivityIndicator color="#FFF" /> : <Text style={styles.applyBtnText}>Publier mon avis</Text>}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backHomeBtn: { marginTop: 16, backgroundColor: '#0274DF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 130 },
  imageWrapper: { paddingHorizontal: 16, marginBottom: 24, marginTop: 8 },
  imageBackground: { width: '100%', height: 380, borderRadius: 32, padding: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
  image: { width: '100%', height: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 25 },
  detailsBox: { paddingHorizontal: 20, marginBottom: 24 },
  badgePack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#0274DF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12, gap: 4 },
  badgePackText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32, marginBottom: 8 },
  author: { fontSize: 16, fontWeight: '500', marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  price: { fontSize: 32, fontWeight: '900', color: '#0274DF' },
  currency: { fontSize: 18, fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  ratingText: { fontSize: 14, fontWeight: '800', color: '#92400E', marginLeft: 4 },
  whatsAppQuickBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 20, gap: 12 },
  whatsAppIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  whatsAppBtnTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  whatsAppBtnSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  descriptionBox: { marginTop: 8 },
  description: { fontSize: 15, lineHeight: 24 },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#0274DF' },
  emptyBox: { alignItems: 'center', padding: 24, borderRadius: 16 },
  reviewCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewName: { fontSize: 15, fontWeight: '700' },
  reviewComment: { fontSize: 14, lineHeight: 22 },
  reviewCity: { fontSize: 12, marginTop: 8 },
  floatingBottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 15 },
  readingListBtn: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#0274DF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  addToCartContainer: { flex: 1, shadowColor: '#0274DF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  addToCartGradient: { paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  addToCartText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  ratingSelector: { alignItems: 'center', marginBottom: 24 },
  reviewInput: { borderRadius: 16, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 16 },
  applyBtn: { backgroundColor: '#0274DF', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  applyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
