import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  useColorScheme,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useI18nStore } from '@/store/useI18nStore';
import { addExchangeBook, uploadImage } from '@/services/api';
import { CustomAlertModal, AlertType } from '@/components/ui/CustomAlertModal';

interface AddExchangeBookModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExchangeBookModal({ visible, onClose, onSuccess }: AddExchangeBookModalProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const borderColor = isDark ? '#2E3135' : '#E2E8F0';
  const t = useI18nStore((state) => state.t);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'GOOD' | 'USED'>('GOOD');
  const [exchangeType, setExchangeType] = useState<'DIRECT' | 'GIVEAWAY' | 'CREDIT'>('DIRECT');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showPhotoSourceSheet, setShowPhotoSourceSheet] = useState(false);

  // Custom alert modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string, onPrimaryPress?: () => void) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onPrimaryPress: onPrimaryPress || (() => setAlertConfig((prev) => ({ ...prev, visible: false }))),
    });
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCondition('GOOD');
    setExchangeType('DIRECT');
    setDescription('');
    setPhotos([]);
    setLocation(null);
    setSubmitting(false);
    setLocating(false);
    setShowPhotoSourceSheet(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // Prise de photo directe avec l'appareil photo du smartphone
  const handleDirectCameraCapture = async () => {
    if (photos.length >= 3) {
      showAlert('warning', t('max_photos_reached'), t('max_photos_reached'));
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert('error', t('camera_permission_denied'), t('camera_permission_desc'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.75,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
        setShowPhotoSourceSheet(false);
      }
    } catch (e) {
      showAlert('error', t('error'), 'Impossible d\'ouvrir l\'appareil photo.');
    }
  };

  // Sélection depuis la galerie de photos
  const handlePickFromGallery = async () => {
    if (photos.length >= 3) {
      showAlert('warning', t('max_photos_reached'), t('max_photos_reached'));
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('error', t('gallery_permission_denied'), t('gallery_permission_desc'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.75,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
        setShowPhotoSourceSheet(false);
      }
    } catch (e) {
      showAlert('error', t('error'), 'Impossible d\'accéder à la galerie.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Géolocalisation GPS en un clic
  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('warning', 'Localisation désactivée', 'Activez la localisation pour permettre aux lecteurs à proximité de vous trouver.');
        setLocating(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      showAlert('success', 'Position enregistrée', t('location_detected'));
    } catch (error) {
      showAlert('error', t('error'), 'Impossible de détecter votre position actuelle.');
    } finally {
      setLocating(false);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!title.trim() || !author.trim()) {
      showAlert('warning', t('required_fields_error'), t('required_fields_error'));
      return;
    }

    setSubmitting(true);
    let uploadedUrls: string[] = [];

    try {
      // Téléchargement des photos
      for (const uri of photos) {
        const url = await uploadImage(uri);
        if (url) uploadedUrls.push(url);
      }

      const imageString = uploadedUrls.length > 0 ? uploadedUrls.join(',') : null;

      await addExchangeBook({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        condition,
        exchangeType,
        description: description.trim() || undefined,
        image: imageString,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      showAlert('success', t('success'), t('book_added_success'), () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        resetForm();
        onClose();
        onSuccess();
      });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Une erreur est survenue lors de l'ajout du livre.";
      showAlert('error', t('error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardContainer}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View style={styles.c2cBadge}>
                        <Ionicons name="repeat" size={14} color="#10B981" />
                        <Text style={styles.c2cBadgeText}>{t('c2c_badge')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>{t('add_book')}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {t('c2c_subtitle')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.backgroundElement }]}
                    onPress={handleClose}
                    disabled={submitting}
                  >
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Section Photos Directes */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="camera" size={18} color="#0274DF" />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Photos du livre ({photos.length}/3)
                      </Text>
                    </View>
                    <Text style={[styles.photoTip, { color: colors.textSecondary }]}>
                      {t('photo_required_tip')}
                    </Text>

                    {/* Previews & Actions */}
                    <View style={styles.photoGrid}>
                      {photos.map((uri, idx) => (
                        <View key={idx} style={styles.photoWrapper}>
                          <Image source={{ uri }} style={styles.photoThumb} />
                          {idx === 0 && (
                            <View style={styles.coverBadge}>
                              <Text style={styles.coverBadgeText}>{t('main_cover')}</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.removePhotoBtn}
                            onPress={() => handleRemovePhoto(idx)}
                          >
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {photos.length < 3 && (
                        <TouchableOpacity
                          style={[styles.addPhotoButton, { borderColor: borderColor }]}
                          onPress={() => setShowPhotoSourceSheet(true)}
                        >
                          <View style={styles.cameraCircle}>
                            <Ionicons name="camera-reverse" size={24} color="#0274DF" />
                          </View>
                          <Text style={[styles.addPhotoText, { color: colors.text }]}>
                            {t('take_photo')}
                          </Text>
                          <Text style={[styles.addPhotoSub, { color: colors.textSecondary }]}>
                            Caméra / Galerie
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Section Informations du Livre */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="book" size={18} color="#10B981" />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Informations principales
                      </Text>
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {t('book_title')} <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: borderColor }]}
                      placeholder="Ex: Le Petit Prince"
                      placeholderTextColor={colors.textSecondary}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={120}
                    />

                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {t('author')} <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: borderColor }]}
                      placeholder={t('author_placeholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={author}
                      onChangeText={setAuthor}
                      maxLength={80}
                    />

                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      ISBN (Optionnel)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: borderColor }]}
                      placeholder={t('isbn_placeholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={isbn}
                      onChangeText={setIsbn}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  {/* Section État du Livre */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
                      État du livre
                    </Text>
                    <View style={styles.pillsRow}>
                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          condition === 'NEW' && styles.pillActiveNew,
                        ]}
                        onPress={() => setCondition('NEW')}
                      >
                        <Ionicons
                          name="sparkles"
                          size={16}
                          color={condition === 'NEW' ? '#10B981' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: condition === 'NEW' ? '#10B981' : colors.textSecondary },
                          ]}
                        >
                          {t('condition_new')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          condition === 'GOOD' && styles.pillActiveGood,
                        ]}
                        onPress={() => setCondition('GOOD')}
                      >
                        <Ionicons
                          name="thumbs-up"
                          size={16}
                          color={condition === 'GOOD' ? '#0274DF' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: condition === 'GOOD' ? '#0274DF' : colors.textSecondary },
                          ]}
                        >
                          {t('condition_good')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          condition === 'USED' && styles.pillActiveUsed,
                        ]}
                        onPress={() => setCondition('USED')}
                      >
                        <Ionicons
                          name="book-outline"
                          size={16}
                          color={condition === 'USED' ? '#D97706' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: condition === 'USED' ? '#D97706' : colors.textSecondary },
                          ]}
                        >
                          {t('condition_used')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Section Modalité de Bourse */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
                      Type de proposition
                    </Text>
                    <View style={styles.pillsRow}>
                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          exchangeType === 'DIRECT' && styles.pillActiveDirect,
                        ]}
                        onPress={() => setExchangeType('DIRECT')}
                      >
                        <Ionicons
                          name="swap-horizontal"
                          size={16}
                          color={exchangeType === 'DIRECT' ? '#0274DF' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: exchangeType === 'DIRECT' ? '#0274DF' : colors.textSecondary },
                          ]}
                        >
                          {t('exchange_type_direct')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          exchangeType === 'GIVEAWAY' && styles.pillActiveGiveaway,
                        ]}
                        onPress={() => setExchangeType('GIVEAWAY')}
                      >
                        <Ionicons
                          name="gift"
                          size={16}
                          color={exchangeType === 'GIVEAWAY' ? '#10B981' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: exchangeType === 'GIVEAWAY' ? '#10B981' : colors.textSecondary },
                          ]}
                        >
                          {t('exchange_type_giveaway')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pill,
                          { borderColor: borderColor },
                          exchangeType === 'CREDIT' && styles.pillActiveCredit,
                        ]}
                        onPress={() => setExchangeType('CREDIT')}
                      >
                        <Ionicons
                          name="ribbon-outline"
                          size={16}
                          color={exchangeType === 'CREDIT' ? '#D97706' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: exchangeType === 'CREDIT' ? '#D97706' : colors.textSecondary },
                          ]}
                        >
                          {t('exchange_type_credit')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Localisation GPS */}
                  <TouchableOpacity
                    style={[
                      styles.locationButton,
                      location
                        ? styles.locationButtonSuccess
                        : { backgroundColor: colors.backgroundElement, borderColor: borderColor },
                    ]}
                    onPress={handleDetectLocation}
                    disabled={locating}
                  >
                    {locating ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <Ionicons
                        name={location ? 'location' : 'location-outline'}
                        size={22}
                        color={location ? '#10B981' : colors.textSecondary}
                      />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.locationText,
                          { color: location ? '#10B981' : colors.text },
                        ]}
                      >
                        {location ? t('location_detected') : t('detect_location')}
                      </Text>
                      <Text style={[styles.locationSubText, { color: colors.textSecondary }]}>
                        {location
                          ? `Lat: ${location.latitude.toFixed(4)}, Long: ${location.longitude.toFixed(4)}`
                          : 'Permet d\'échanger en main propre dans votre ville'}
                      </Text>
                    </View>
                    {location && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>

                  {/* Note / Description */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {t('description')} (Optionnel)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        { backgroundColor: colors.background, color: colors.text, borderColor: borderColor },
                      ]}
                      placeholder={t('desc_placeholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      maxLength={300}
                    />
                  </View>

                  {/* Bouton de Publication */}
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={18} color="#FFF" />
                        <Text style={styles.submitButtonText}>{t('publish')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ActionSheet de choix de source de photo (Caméra directe ou Galerie) */}
      <Modal
        visible={showPhotoSourceSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoSourceSheet(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPhotoSourceSheet(false)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetContent, { backgroundColor: colors.background }]}>
              <View style={styles.sheetDragHandle} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {t('photo_source_title')}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                {t('photo_source_subtitle')}
              </Text>

              {/* Option 1: Appareil Photo Direct */}
              <TouchableOpacity
                style={[styles.sheetOption, { backgroundColor: colors.backgroundElement }]}
                onPress={handleDirectCameraCapture}
              >
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(2, 116, 223, 0.15)' }]}>
                  <Ionicons name="camera" size={24} color="#0274DF" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                    {t('take_photo')}
                  </Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                    Prendre la photo maintenant avec votre smartphone
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option 2: Galerie de Photos */}
              <TouchableOpacity
                style={[styles.sheetOption, { backgroundColor: colors.backgroundElement }]}
                onPress={handlePickFromGallery}
              >
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="images" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                    {t('choose_gallery')}
                  </Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                    Sélectionner un cliché existant depuis votre album
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[styles.sheetCancelBtn, { borderColor: borderColor }]}
                onPress={() => setShowPhotoSourceSheet(false)}
              >
                <Text style={[styles.sheetCancelText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal d'alerte personnalisée Riwaya */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={alertConfig.onPrimaryPress || (() => setAlertConfig((prev) => ({ ...prev, visible: false })))}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  c2cBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  c2cBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  photoTip: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 90,
    height: 115,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 90,
    height: 115,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cameraCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 116, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  addPhotoSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillActiveNew: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillActiveGood: {
    borderColor: '#0274DF',
    backgroundColor: 'rgba(2, 116, 223, 0.12)',
  },
  pillActiveUsed: {
    borderColor: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  pillActiveDirect: {
    borderColor: '#0274DF',
    backgroundColor: 'rgba(2, 116, 223, 0.12)',
  },
  pillActiveGiveaway: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillActiveCredit: {
    borderColor: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  locationButtonSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#0274DF',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  sheetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sheetCancelBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
