import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Modal, TextInput, Alert, ScrollView, ActivityIndicator, Platform, Keyboard, TouchableWithoutFeedback, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18nStore } from '@/store/useI18nStore';
import { getExchangeBooks, addExchangeBook, getMyExchanges, updateExchangeStatus, requestExchange, submitRating, uploadImage, getImageUrl } from '@/services/api';
import { playRequestSound, playAcceptSound } from '@/utils/sounds';
import { getDistance } from '@/utils/distance';
import { useRouter } from 'expo-router';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

export default function ExchangeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { isLoggedIn, customer } = useAuthStore();
  const t = useI18nStore(state => state.t);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'all' | 'my_requests' | 'my_catalog'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [books, setBooks] = useState<any[]>([]);
  const [requests, setRequests] = useState<{ sent: any[], received: any[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal d'ajout de livre
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', condition: 'GOOD', description: '', exchangeType: 'DIRECT' });
  const [bookLocation, setBookLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Modal de demande
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState('');

  // Filtre de distance
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Modal de notation (Rating)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const fetchBooks = async () => {
    try {
      const data = await getExchangeBooks();
      setBooks(data.books || []);
    } catch (e) {
      console.log('Error fetching exchange books', e);
    }
  };

  const fetchRequests = async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getMyExchanges();
      setRequests({ sent: data.sent || [], received: data.received || [] });
    } catch (e) {
      console.log('Error fetching requests', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchBooks();
    if (activeTab === 'my_requests' || activeTab === 'my_catalog') await fetchRequests();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBooks();
    if (activeTab === 'my_requests' || activeTab === 'my_catalog') await fetchRequests();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, isLoggedIn]);

  const handleProtectedAction = (action: () => void) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour effectuer cette action.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    action();
  };

  const handleGetLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour utiliser cette fonctionnalité.');
        setLocating(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setBookLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      Alert.alert('Succès', 'Votre position a été enregistrée pour ce livre.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position.');
    } finally {
      setLocating(false);
    }
  };

  const handlePickImage = async () => {
    if (selectedImages.length >= 2) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez ajouter que 2 images au maximum.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const handleAddBook = async () => {
    Keyboard.dismiss();
    if (!newBook.title || !newBook.author) {
      Alert.alert('Erreur', 'Titre et auteur requis.');
      return;
    }
    
    setUploadingImages(true);
    let uploadedUrls: string[] = [];
    
    try {
      for (const uri of selectedImages) {
        const url = await uploadImage(uri);
        uploadedUrls.push(url);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de télécharger l\'image.');
      setUploadingImages(false);
      return;
    }
    
    const imageString = uploadedUrls.length > 0 ? uploadedUrls.join(',') : null;

    try {
      await addExchangeBook({
        ...newBook,
        image: imageString,
        latitude: bookLocation?.latitude,
        longitude: bookLocation?.longitude,
      });
      setShowAddModal(false);
      setNewBook({ title: '', author: '', condition: 'GOOD', description: '', exchangeType: 'DIRECT' });
      setBookLocation(null);
      setSelectedImages([]);
      fetchBooks();
      Alert.alert('Succès', 'Votre livre a été publié.');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter le livre.");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSendRequest = async () => {
    Keyboard.dismiss();
    try {
      await requestExchange({
        bookRequestedId: selectedBook.id,
        message: requestMessage,
      });
      setShowRequestModal(false);
      setRequestMessage('');
      fetchRequests();
      playRequestSound();
      Alert.alert('Succès', 'Votre demande a été envoyée !');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || "Impossible d'envoyer la demande.");
    }
  };

  const handleUpdateStatus = async (id: string, status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED') => {
    try {
      await updateExchangeStatus(id, status);
      if (status === 'ACCEPTED') {
        playAcceptSound();
      }
      fetchRequests();
      fetchBooks();
    } catch (e) {
      Alert.alert('Erreur', "Impossible de mettre à jour le statut.");
    }
  };

  const handleFinishExchange = (id: string) => {
    setSelectedExchangeId(id);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedExchangeId) return;
    try {
      await submitRating({
        exchangeId: selectedExchangeId,
        rating: ratingValue,
        comment: ratingComment
      });
      await handleUpdateStatus(selectedExchangeId, 'COMPLETED');
      setShowRatingModal(false);
      setRatingValue(5);
      setRatingComment('');
      Alert.alert('Merci !', 'Votre note a été enregistrée avec succès.');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || "Impossible d'envoyer la note.");
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="people-circle-outline" size={64} color="#3B82F6" />
            <Text style={[styles.loginTitle, { color: colors.text }]}>{t('community')}</Text>
            <Text style={[styles.loginSub, { color: colors.textSecondary }]}>{t('exchange_desc')}</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>{t('login')}</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filtrage des livres
  let filteredBooks = activeTab === 'my_catalog' ? books.filter(b => b.ownerId === customer?.id) : books;
  if (maxDistance && userLocation) {
    filteredBooks = filteredBooks.filter(b => {
      if (!b.latitude || !b.longitude) return false;
      return getDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude) <= maxDistance;
    });
  }

  // Obtenir le centre pour la carte basé sur les livres filtrés avec GPS
  const mapBooks = filteredBooks.filter(b => b.latitude && b.longitude);
  const initialRegion = mapBooks.length > 0 ? {
    latitude: mapBooks[0].latitude,
    longitude: mapBooks[0].longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : userLocation ? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 33.5731, // Casablanca (par défaut)
    longitude: -7.5898,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER TABS */}
      <View style={[styles.tabContainer, { alignItems: 'center', paddingHorizontal: 8 }]}>
        <TouchableOpacity 
          style={{ padding: 8, marginRight: 4 }}
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 8 }}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>{t('catalog') || 'Catalogue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'my_requests' && styles.activeTab]}
            onPress={() => setActiveTab('my_requests')}
          >
            <Text style={[styles.tabText, activeTab === 'my_requests' && styles.activeTabText]}>{t('your_requests') || 'Vos demandes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'my_catalog' && styles.activeTab]}
            onPress={() => setActiveTab('my_catalog')}
          >
            <Text style={[styles.tabText, activeTab === 'my_catalog' && styles.activeTabText]}>{t('my_catalog') || 'Mon catalogue'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* FEED TAB */}
      {(activeTab === 'all' || activeTab === 'my_catalog') && (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 }}>
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity 
                style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: '#0274DF' }]} 
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'list' ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.viewToggleText, { color: viewMode === 'list' ? '#FFF' : colors.textSecondary }]}>Liste</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleBtn, viewMode === 'map' && { backgroundColor: '#0274DF' }]} 
                onPress={() => setViewMode('map')}
              >
                <Ionicons name="map" size={16} color={viewMode === 'map' ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.viewToggleText, { color: viewMode === 'map' ? '#FFF' : colors.textSecondary }]}>Carte</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location" size={16} color={maxDistance ? '#10B981' : colors.textSecondary} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {[null, 5, 10, 50].map((dist, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    style={[styles.distBtn, maxDistance === dist && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                    onPress={async () => {
                      if (dist === null) {
                        setMaxDistance(null);
                      } else {
                        if (!userLocation) {
                          setLocating(true);
                          let { status } = await Location.requestForegroundPermissionsAsync();
                          if (status === 'granted') {
                            let loc = await Location.getCurrentPositionAsync({});
                            setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                            setMaxDistance(dist);
                          } else {
                            Alert.alert('Erreur', 'Localisation requise pour le filtre.');
                          }
                          setLocating(false);
                        } else {
                          setMaxDistance(dist);
                        }
                      }
                    }}
                  >
                    <Text style={[styles.distBtnText, { color: maxDistance === dist ? '#FFF' : colors.textSecondary }]}>
                      {dist ? `${dist}km` : 'Tout'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {viewMode === 'list' ? (
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => (
                <View style={[styles.bookCard, { backgroundColor: colors.backgroundElement }]}>
                  {item.image ? (
                    <Image 
                      source={{ uri: getImageUrl(item.image.split(',')[0]) || item.image.split(',')[0] }} 
                      style={{ width: 70, height: 100, borderRadius: 12, marginRight: 16, backgroundColor: '#E5E7EB' }} 
                    />
                  ) : (
                    <View style={{ width: 70, height: 100, borderRadius: 12, marginRight: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="book-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.bookInfo}>
                    <Text style={[styles.bookTitle, { color: colors.text }]}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Text style={[styles.bookAuthor, { color: colors.textSecondary, marginBottom: 0 }]}>{item.author}</Text>
                      {item.language && (
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary }}>{item.language.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    {item.exchangeType === 'CREDIT' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="cash-outline" size={14} color="#D97706" />
                        <Text style={{ color: '#D97706', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>10 Crédits</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="swap-horizontal" size={14} color="#10B981" />
                        <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Échange Direct</Text>
                      </View>
                    )}
                    <Text style={[styles.bookOwner, { marginTop: 4 }]}>Par {item.owner?.fullName} ({item.owner?.city || 'Maroc'})</Text>
                  </View>
                  <View style={{ justifyContent: 'center' }}>
                    <TouchableOpacity 
                      style={styles.requestBtn} 
                      onPress={() => handleProtectedAction(() => {
                        setSelectedBook(item);
                        setShowRequestModal(true);
                      })}
                    >
                      <Text style={styles.requestBtnText}>{t('ask') || 'Demander'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('no_books')}</Text>
                </View>
              }
            />
          ) : Platform.OS === 'web' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
                La carte interactive est uniquement disponible sur l'application mobile (iOS/Android).
              </Text>
              <TouchableOpacity style={[styles.viewToggleBtn, { backgroundColor: '#0274DF', marginTop: 16 }]} onPress={() => setViewMode('list')}>
                <Text style={{ color: '#FFF' }}>Passer en vue Liste</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MapView 
              style={{ flex: 1 }} 
              initialRegion={initialRegion}
              showsUserLocation={true}
            >
              {mapBooks.map(book => (
                <Marker
                  key={book.id}
                  coordinate={{ latitude: book.latitude, longitude: book.longitude }}
                >
                  <View style={styles.markerContainer}>
                    <Ionicons name="book" size={16} color="#FFF" />
                  </View>
                  <Callout onPress={() => handleProtectedAction(() => {
                    setSelectedBook(book);
                    setShowRequestModal(true);
                  })}>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.calloutAuthor} numberOfLines={1}>{book.author}</Text>
                      <TouchableOpacity style={styles.calloutBtn}>
                        <Text style={styles.calloutBtnText}>{t('ask') || 'Demander'}</Text>
                      </TouchableOpacity>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}

          {/* FAB Add */}
          <TouchableOpacity style={styles.fab} onPress={() => handleProtectedAction(() => setShowAddModal(true))}>
            <Ionicons name="add" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* DISCONNECTED STATE FOR TABS */}
      {!isLoggedIn && activeTab !== 'all' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="lock-closed-outline" size={80} color={colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>Connexion requise</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
            Veuillez vous connecter pour gérer vos demandes d'échange et votre catalogue de livres.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#0274DF', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, shadowColor: '#0274DF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 }} 
            onPress={() => router.push('/login')}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* REQUESTS TAB */}
      {isLoggedIn && activeTab === 'my_requests' && (
        <ScrollView style={{ flex: 1, padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('received_requests') || 'Demandes reçues'}</Text>
          {requests.received.length === 0 && (
            <View style={[styles.emptyStateContainer, { borderColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
              <Ionicons name="mail-unread-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('no_received_requests') || 'Aucune demande reçue'}</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>{t('no_received_requests_desc') || "Vous n'avez pas encore reçu de demande d'échange pour vos livres."}</Text>
            </View>
          )}
          {requests.received.map(req => (
            <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.backgroundElement }]}>
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>{req.bookRequested?.title || 'Livre inconnu'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Demandé par {req.requester?.fullName || 'Utilisateur inconnu'}</Text>
              {req.message && <Text style={{ color: colors.text, fontStyle: 'italic', marginBottom: 12 }}>"{req.message}"</Text>}
              
              {req.status === 'PENDING' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleUpdateStatus(req.id, 'REJECTED')}>
                    <Text style={styles.actionText}>Refuser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateStatus(req.id, 'ACCEPTED')}>
                    <Text style={styles.actionText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: req.status === 'ACCEPTED' ? '#10B981' : req.status === 'COMPLETED' ? '#8B5CF6' : '#EF4444' }}>{req.status}</Text>
                  {req.status === 'ACCEPTED' && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat/${req.id}`)}>
                            <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.chatBtn, { backgroundColor: '#10B981' }]} onPress={() => handleFinishExchange(req.id)}>
                            <Ionicons name="checkmark-done" size={16} color="#FFF" />
                            <Text style={styles.chatBtnText}>Terminer</Text>
                          </TouchableOpacity>
                        </View>
                  )}
                  {req.status === 'COMPLETED' && (
                     <Text style={{ color: '#8B5CF6', fontSize: 12 }}>Échange terminé</Text>
                  )}
                </View>
              )}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>{t('sent_requests') || 'Demandes envoyées'}</Text>
          {requests.sent.length === 0 && (
            <View style={[styles.emptyStateContainer, { borderColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
              <Ionicons name="send-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('no_sent_requests') || 'Aucune demande envoyée'}</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>{t('no_sent_requests_desc') || "Vous n'avez pas encore envoyé de demande d'échange."}</Text>
            </View>
          )}
          {requests.sent.map(req => (
            <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.backgroundElement }]}>
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>{req.bookRequested?.title || 'Livre inconnu'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>À {req.responder?.fullName || 'Utilisateur inconnu'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', color: req.status === 'ACCEPTED' ? '#10B981' : req.status === 'COMPLETED' ? '#8B5CF6' : req.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }}>
                  Statut: {req.status}
                </Text>
                {req.status === 'ACCEPTED' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={styles.chatBtn} 
                      onPress={() => router.push(`/chat/${req.id}`)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.chatBtn, { backgroundColor: '#10B981' }]} onPress={() => handleFinishExchange(req.id)}>
                      <Ionicons name="checkmark-done" size={16} color="#FFF" />
                      <Text style={styles.chatBtnText}>Terminer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* MODAL ADD BOOK */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('publish_book')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}><Ionicons name="close" size={28} color={colors.textSecondary}/></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]} placeholder={t('title')} placeholderTextColor={colors.textSecondary} value={newBook.title} onChangeText={(t) => setNewBook({...newBook, title: t})} />
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]} placeholder={t('author')} placeholderTextColor={colors.textSecondary} value={newBook.author} onChangeText={(t) => setNewBook({...newBook, author: t})} />
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, height: 100, textAlignVertical: 'top' }]} placeholder={t('description')} placeholderTextColor={colors.textSecondary} value={newBook.description} onChangeText={(t) => setNewBook({...newBook, description: t})} multiline />
                
                <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
                  <TouchableOpacity 
                    style={[styles.typeBtn, newBook.exchangeType === 'DIRECT' && styles.typeBtnActive, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => setNewBook({...newBook, exchangeType: 'DIRECT'})}>
                    <Text style={[styles.typeBtnText, newBook.exchangeType === 'DIRECT' && styles.typeBtnTextActive, { color: colors.textSecondary }]}>Échange direct</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeBtn, newBook.exchangeType === 'CREDIT' && styles.typeBtnActive, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => setNewBook({...newBook, exchangeType: 'CREDIT'})}>
                    <Text style={[styles.typeBtnText, newBook.exchangeType === 'CREDIT' && styles.typeBtnTextActive, { color: colors.textSecondary }]}>Pour crédits</Text>
                  </TouchableOpacity>
                </View>

                {/* Images Picker */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>Images ({selectedImages.length}/2)</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {selectedImages.map((uri, index) => (
                      <View key={index} style={{ position: 'relative' }}>
                        <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                        <TouchableOpacity 
                          style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12 }} 
                          onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                        >
                          <Ionicons name="close" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedImages.length < 2 && (
                      <TouchableOpacity 
                        style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textSecondary, justifyContent: 'center', alignItems: 'center' }}
                        onPress={handlePickImage}
                      >
                        <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.locationBtn, bookLocation ? { borderColor: '#10B981', backgroundColor: '#D1FAE5' } : { borderColor: colors.backgroundSelected }]} 
                  onPress={handleGetLocation}
                >
                  {locating ? <ActivityIndicator size="small" color="#10B981" /> : <Ionicons name="location" size={24} color={bookLocation ? "#10B981" : colors.textSecondary} />}
                  <Text style={{ marginLeft: 8, color: bookLocation ? "#10B981" : colors.textSecondary, fontWeight: '500' }}>
                    {bookLocation ? 'Position ajoutée' : t('use_location')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.submitBtn, uploadingImages && { opacity: 0.7 }]} onPress={handleAddBook} disabled={uploadingImages}>
                  {uploadingImages ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>{t('publish')}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL REQUEST */}
      <Modal visible={showRequestModal} animationType="fade" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ask_exchange')}</Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)}><Ionicons name="close" size={28} color={colors.textSecondary}/></TouchableOpacity>
              </View>
              <Text style={{ color: colors.text, marginBottom: 12 }}>{t('request')} : <Text style={{ fontWeight: 'bold' }}>{selectedBook?.title}</Text></Text>
              
              {selectedBook?.image && (
                <Image 
                  source={{ uri: getImageUrl(selectedBook.image.split(',')[0]) || selectedBook.image.split(',')[0] }} 
                  style={{ width: 100, height: 140, borderRadius: 8, marginBottom: 16, alignSelf: 'center', backgroundColor: '#E5E7EB' }} 
                />
              )}
              
              {selectedBook?.exchangeType === 'CREDIT' && (
                <View style={{ backgroundColor: '#Fef3c7', padding: 12, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={20} color="#D97706" />
                  <Text style={{ color: '#D97706', marginLeft: 8, flex: 1, fontSize: 13 }}>{t('credit_warning')}</Text>
                </View>
              )}

              <TextInput style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, height: 100, textAlignVertical: 'top' }]} placeholder={t('leave_message')} placeholderTextColor={colors.textSecondary} value={requestMessage} onChangeText={setRequestMessage} multiline />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSendRequest}>
                <Text style={styles.submitBtnText}>{t('send_request')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL RATING */}
      <Modal visible={showRatingModal} animationType="fade" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Noter l'échange</Text>
                <TouchableOpacity onPress={() => setShowRatingModal(false)}><Ionicons name="close" size={28} color={colors.textSecondary}/></TouchableOpacity>
              </View>
              <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Comment s'est passé votre échange ?</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                    <Ionicons name={star <= ratingValue ? "star" : "star-outline"} size={40} color="#F59E0B" />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput 
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, height: 100, textAlignVertical: 'top' }]} 
                placeholder="Laisser un commentaire (optionnel)" 
                placeholderTextColor={colors.textSecondary} 
                value={ratingComment} 
                onChangeText={setRatingComment} 
                multiline 
              />
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating}>
                <Text style={styles.submitBtnText}>Soumettre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginBtn: { backgroundColor: '#0274DF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', paddingVertical: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeTab: { backgroundColor: 'rgba(2,116,223,0.1)' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  activeTabText: { color: '#0274DF' },
  
  // Toggle
  viewToggleContainer: { flexDirection: 'row', gap: 8 },
  viewToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  viewToggleText: { fontWeight: '600', fontSize: 13 },
  
  distBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  distBtnText: { fontSize: 12, fontWeight: 'bold' },
  
  listContent: { padding: 16, paddingBottom: 100 },
  bookCard: { padding: 16, borderRadius: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  bookInfo: { flex: 1, paddingRight: 12 },
  bookTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  bookAuthor: { fontSize: 13, marginBottom: 8, fontWeight: '500' },
  bookOwner: { fontSize: 12, color: '#0274DF', fontWeight: '600' },
  requestBtn: { backgroundColor: '#0274DF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, shadowColor: '#0274DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  requestBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  
  // Callout Map
  markerContainer: { backgroundColor: '#10B981', padding: 8, borderRadius: 24, borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  calloutContainer: { width: 160, alignItems: 'center', padding: 8, borderRadius: 12 },
  calloutTitle: { fontWeight: '800', textAlign: 'center', marginBottom: 2, fontSize: 14 },
  calloutAuthor: { fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  calloutBtn: { backgroundColor: '#0274DF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, width: '100%', alignItems: 'center' },
  calloutBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0274DF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  requestCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  submitBtn: { backgroundColor: '#0274DF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyStateContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateSub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20
  },
  chatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0274DF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  chatBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  typeBtnActive: { borderColor: '#0274DF', backgroundColor: 'rgba(2,116,223,0.1)' },
  typeBtnText: { fontWeight: '600' },
  typeBtnTextActive: { color: '#0274DF' }
});
