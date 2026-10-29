import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Switch, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useRecentStore } from '@/store/useRecentStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartStore } from '@/store/useCartStore';
import { useI18nStore } from '@/store/useI18nStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { getMe, updateProfile, uploadImage, getImageUrl } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import ReaderCardModal from '@/components/ReaderCardModal';

const WHATSAPP_NUMBER = '212702220575';
export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const isDark = scheme === 'dark';

  const clearRecent = useRecentStore(s => s.clearRecent);
  const clearWishlist = useWishlistStore(s => s.clear);
  const clearCart = useCartStore(s => s.clearCart);

  const { language, setLanguage, t } = useI18nStore();
  const { isLoggedIn, customer, logout, updateCustomer } = useAuthStore();
  const [isGamificationModalVisible, setGamificationModalVisible] = useState(false);
  const [isReaderCardVisible, setReaderCardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setRefreshing(true);
    try {
      const res = await getMe();
      if (res && res.customer) {
        updateCustomer(res.customer);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [isLoggedIn, updateCustomer]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        getMe().then(res => {
          if (res && res.customer) {
            updateCustomer(res.customer);
          }
        }).catch(console.error);
      }
    }, [isLoggedIn])
  );

  const handleContactSupport = () => {
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=Bonjour, j'ai besoin d'aide concernant PetsUnivers.`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'WhatsApp n\'est pas installé sur cet appareil.');
    });
  };

  const handleClearData = () => {
    Alert.alert(t('clear_data'), 'Voulez-vous vraiment vider votre panier, vos favoris et votre historique ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer', style: 'destructive', onPress: () => {
          clearRecent();
          clearWishlist();
          clearCart();
          Alert.alert('Succès', 'Toutes les données locales ont été effacées.');
        }
      },
    ]);
  };

  const handleLanguageToggle = () => {
    const newLang = language === 'fr' ? 'ar' : language === 'ar' ? 'en' : 'fr';
    setLanguage(newLang);
    Alert.alert(
      'Redémarrage requis',
      'Veuillez redémarrer l\'application pour appliquer les changements de langue.'
    );
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const uri = result.assets[0].uri;
        const uploadRes = await uploadImage(uri);
        if (uploadRes && uploadRes.imageUrl) {
          await updateProfile({ image: uploadRes.imageUrl });
          // Fetch updated profile
          const userRes = await getMe();
          if (userRes && userRes.customer) {
            updateCustomer(userRes.customer);
          }
          Alert.alert('Succès', 'Photo de profil mise à jour.');
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Erreur', 'Impossible de télécharger la photo.');
      }
    }
  };

  // Composant réutilisable pour une ligne de réglage premium
  const SettingRow = ({ icon, iconColor, iconBg, label, value, onPress, isDanger = false, toggleValue, onToggle }: any) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.backgroundSelected }]}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: isDanger ? '#EF4444' : colors.text }]}>{label}</Text>
      </View>

      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
        {toggleValue !== undefined && (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={toggleValue ? '#3B82F6' : '#F3F4F6'}
          />
        )}
        {onPress && toggleValue === undefined && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ opacity: 0.5, marginLeft: 8 }} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0274DF" />
        }
      >

        {/* En-tête de page */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
        </View>

        {/* Section Profil */}
        <View style={styles.section}>
          {isLoggedIn ? (
            <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
              <View style={styles.profileHeader}>
                <TouchableOpacity onPress={handlePickImage} style={styles.avatar}>
                  {customer?.image ? (
                    <Image source={{ uri: getImageUrl(customer.image) || '' }} style={{ width: '100%', height: '100%', borderRadius: 99 }} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{customer?.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                  )}
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    padding: 5,
                    borderWidth: 2,
                    borderColor: colors.backgroundElement
                  }}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={[styles.profileInfo, { justifyContent: 'center' }]}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{customer?.fullName}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{customer?.email || customer?.phone}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t('member')}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="cash-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={[styles.badgeText, { color: '#D97706' }]}>{customer?.credits || 0} {t('credits')}</Text>
                    </View>
                    {customer?.reviewsCount !== undefined && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="star" size={14} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>{customer.averageRating?.toFixed(1)} ({customer.reviewsCount} avis)</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Carte de Gamification */}
              {customer?.gamification && (
                <TouchableOpacity
                  style={[styles.gamificationCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                  activeOpacity={0.7}
                  onPress={() => setGamificationModalVisible(true)}
                >
                  <View style={styles.gamificationHeader}>
                    <Text style={[styles.gamificationTitle, { color: colors.text }]}>{customer.gamification.title}</Text>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>Niv {customer.gamification.level}</Text>
                    </View>
                  </View>
                  <Text style={[styles.gamificationDesc, { color: colors.textSecondary }]}>
                    {customer.gamification.booksRead} livres lus sur {customer.gamification.nextLevelThreshold}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${customer.gamification.progress}%`, backgroundColor: colors.primary }]} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Carte de Lecteur */}
              <TouchableOpacity
                style={[styles.gamificationCard, { backgroundColor: colors.primary, marginTop: 12, borderColor: 'transparent' }]}
                activeOpacity={0.8}
                onPress={() => setReaderCardVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Générer ma carte de lecteur
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loginCardContainer}
              onPress={() => router.push('/login')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#EFF6FF', '#DBEAFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginCardGradient}
              >
                <Ionicons name="person-circle" size={56} color="#3B82F6" />
                <View style={styles.loginCardText}>
                  <Text style={styles.loginCardTitle}>{t('join_community')}</Text>
                  <Text style={styles.loginCardSub}>{t('login_desc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Mon Compte */}
        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('my_account')}</Text>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
              <SettingRow
                icon="cube-outline" iconColor="#8B5CF6" iconBg="#EDE9FE"
                label={t('my_orders')}
                onPress={() => router.push('/orders')}
              />
              <SettingRow
                icon="heart-outline" iconColor="#EC4899" iconBg="#FCE7F3"
                label={t('wishlist')}
                onPress={() => router.push('/wishlist')}
              />
              <SettingRow
                icon="book-outline" iconColor="#3B82F6" iconBg="#EFF6FF"
                label="Ma Liste de Lecture"
                onPress={() => router.push('/reading-list')}
              />
            </View>
          </View>
        )}

        {/* Apparence et Langue */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('preferences')}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
            <SettingRow
              icon="moon-outline" iconColor="#3B82F6" iconBg="#EFF6FF"
              label={t('dark_mode')}
              toggleValue={isDark}
              onToggle={() => Alert.alert('Info', 'PetsUnivers suit le thème système de votre appareil.')}
            />
            <SettingRow
              icon="language-outline" iconColor="#10B981" iconBg="#D1FAE5"
              label={t('language')}
              value={language === 'fr' ? 'Français' : language === 'ar' ? 'العربية' : 'English'}
              onPress={handleLanguageToggle}
            />
          </View>
        </View>

        {/* Assistance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('assistance')}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleContactSupport}>
              <View style={styles.whatsappIconBg}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
              </View>
              <View style={styles.whatsappTextContainer}>
                <Text style={[styles.whatsappTitle, { color: colors.text }]}>{t('support')}</Text>
                <Text style={styles.whatsappSub}>{t('support_desc')}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#10B981" />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.backgroundSelected }} />

            <SettingRow
              icon="help-circle-outline" iconColor="#F59E0B" iconBg="#FEF3C7"
              label={t('faq')}
              onPress={() => { }}
            />
            <SettingRow
              icon="document-text-outline" iconColor="#64748B" iconBg="#F1F5F9"
              label={t('terms')}
              onPress={() => { }}
            />
          </View>
        </View>

        {/* Données & Déconnexion */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('system')}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
            <SettingRow
              icon="trash-outline" iconColor="#EF4444" iconBg="#FEE2E2"
              label={t('clear_cache')}
              onPress={handleClearData}
            />
            {isLoggedIn && (
              <>
                <View style={{ height: 1, backgroundColor: colors.backgroundSelected }} />
                <SettingRow
                  icon="log-out-outline" iconColor="#EF4444" iconBg="#FEE2E2"
                  label={t('logout')}
                  onPress={handleLogout}
                  isDanger
                />
              </>
            )}
          </View>
        </View>

        <Text style={styles.version}>PetsUnivers Mobile v1.0.0 • Made with ❤️</Text>
      </ScrollView>

      {/* Modal des niveaux de gamification */}
      <Modal
        visible={isGamificationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGamificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Niveaux de Lecture</Text>
              <TouchableOpacity onPress={() => setGamificationModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Lisez plus de livres pour monter en niveau et débloquer de nouveaux statuts !</Text>
              {[
                { level: 1, title: '🌱 Lecteur Débutant', desc: '0 à 2 livres' },
                { level: 2, title: '🧭 Explorateur Littéraire', desc: '3 à 9 livres' },
                { level: 3, title: '❤️ Passionné de Lecture', desc: '10 à 24 livres' },
                { level: 4, title: '🧠 Érudit', desc: '25 à 49 livres' },
                { level: 5, title: '👑 Maître des Mots', desc: '50 livres et plus' },
              ].map((lvl, index) => {
                const isCurrent = customer?.gamification?.level === lvl.level;
                return (
                  <View key={index} style={[styles.levelItem, isCurrent && { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#3B82F6', borderWidth: 1 }]}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>Niv {lvl.level}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.levelItemTitle, { color: colors.text }]}>{lvl.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{lvl.desc}</Text>
                    </View>
                    {isCurrent && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reader Card Modal */}
      {isLoggedIn && customer && (
        <ReaderCardModal
          visible={isReaderCardVisible}
          onClose={() => setReaderCardVisible(false)}
          customer={customer}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 28
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  profileCard: {
    borderRadius: 28,
    padding: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0274DF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold'
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  badge: {
    backgroundColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gamificationCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gamificationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  levelBadge: {
    backgroundColor: '#0274DF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gamificationDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  loginCardContainer: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  loginCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16
  },
  loginCardText: {
    flex: 1,
  },
  loginCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4
  },
  loginCardSub: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500'
  },
  version: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  levelItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16
  },
  whatsappIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappTextContainer: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2
  },
  whatsappSub: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500'
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 20,
    fontWeight: '500'
  },
});
