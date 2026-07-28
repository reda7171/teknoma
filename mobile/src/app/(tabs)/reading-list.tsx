import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { getReadingList, updateReadingProgress, removeFromReadingList } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function ReadingListScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const isDark = scheme === 'dark';
  
  const { isLoggedIn } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [readingList, setReadingList] = useState<any[]>([]);
  
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState('');
  
  const [activeTab, setActiveTab] = useState<'TO_READ' | 'READING' | 'COMPLETED'>('READING');
  const [activeLang, setActiveLang] = useState<string>('tous');

  const getLanguage = (item: any) => {
    const lang = item.book?.language?.toLowerCase();
    if (['fr', 'ar', 'en'].includes(lang)) return lang;
    return 'autre';
  };

  const filteredList = readingList.filter(item => {
    if (item.status !== activeTab) return false;
    if (activeLang !== 'tous' && getLanguage(item) !== activeLang) return false;
    return true;
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    fetchReadingList();
  }, [isLoggedIn]);

  const fetchReadingList = async () => {
    setLoading(true);
    try {
      const data = await getReadingList();
      setReadingList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedBook) return;
    const progress = parseInt(newProgress);
    if (isNaN(progress) || progress < 0 || progress > selectedBook.totalPages) {
      Alert.alert('Erreur', 'Veuillez entrer un nombre de pages valide.');
      return;
    }
    try {
      await updateReadingProgress(selectedBook.id, progress);
      setShowProgressModal(false);
      fetchReadingList();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la progression.');
    }
  };

  const handleRemove = async (id: string) => {
    Alert.alert('Confirmer', 'Retirer ce livre de votre liste ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        try {
          await removeFromReadingList(id);
          fetchReadingList();
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de retirer le livre.');
        }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const progressPercent = item.totalPages > 0 ? (item.currentPage / item.totalPages) * 100 : 0;
    const isCompleted = item.status === 'COMPLETED' || item.currentPage >= item.totalPages;

    return (
      <View style={[styles.bookCard, { backgroundColor: colors.backgroundElement, shadowColor: isDark ? '#000' : '#94A3B8' }]}>
        <Image 
          source={{ uri: item.cover || 'https://via.placeholder.com/150' }} 
          style={styles.cover} 
          resizeMode="cover"
        />
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.currentPage} / {item.totalPages} pages</Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: 'bold' }}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#E2E8F0' }]}>
              <LinearGradient
                colors={isCompleted ? ['#10B981', '#059669'] : ['#60A5FA', '#3B82F6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btnUpdate, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}
              onPress={() => {
                setSelectedBook(item);
                setNewProgress(item.currentPage.toString());
                setShowProgressModal(true);
              }}
            >
              <Text style={{ color: isCompleted ? '#10B981' : '#3B82F6', fontWeight: '600', fontSize: 14 }}>
                {isCompleted ? 'Relire' : 'Mettre à jour'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.btnRemove}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReadingList();
    setRefreshing(false);
  };

  const countToRead = readingList.filter(item => item.status === 'TO_READ').length;
  const countReading = readingList.filter(item => item.status === 'READING').length;
  const countCompleted = readingList.filter(item => item.status === 'COMPLETED').length;

  const countLang = (lang: string) => readingList.filter(item => item.status === activeTab && getLanguage(item) === lang).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F1F5F9' }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ma Liste de Lecture</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS (STATUS) */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundElement }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'TO_READ' && { backgroundColor: isDark ? '#333' : '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4 }]}
          onPress={() => setActiveTab('TO_READ')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'TO_READ' ? colors.text : colors.textSecondary }, activeTab === 'TO_READ' && styles.activeTabText]}>{`À lire (${countToRead})`}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'READING' && { backgroundColor: isDark ? '#333' : '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4 }]}
          onPress={() => setActiveTab('READING')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'READING' ? colors.text : colors.textSecondary }, activeTab === 'READING' && styles.activeTabText]}>{`En cours (${countReading})`}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'COMPLETED' && { backgroundColor: isDark ? '#333' : '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4 }]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'COMPLETED' ? colors.text : colors.textSecondary }, activeTab === 'COMPLETED' && styles.activeTabText]}>{`Terminés (${countCompleted})`}</Text>
        </TouchableOpacity>
      </View>

      {/* FILTRES LANGUES EN DESSOUS */}
      <View style={{ marginBottom: 12, height: 40 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          data={['tous', 'fr', 'ar', 'en', 'autre'].filter(lang => lang === 'tous' || countLang(lang) > 0)}
          keyExtractor={(item) => item}
          renderItem={({ item: lang }) => {
            const count = lang === 'tous' ? readingList.filter(i => i.status === activeTab).length : countLang(lang);
            const label = lang === 'tous' ? 'Tous' : lang === 'fr' ? 'Français' : lang === 'ar' ? 'Arabe' : lang === 'en' ? 'Anglais' : 'Autres';
            const isActive = activeLang === lang;
            
            return (
              <TouchableOpacity 
                onPress={() => setActiveLang(lang)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#0274DF' : colors.backgroundElement,
                  borderWidth: 1,
                  borderColor: isActive ? '#0274DF' : (isDark ? '#333' : '#E2E8F0'),
                  justifyContent: 'center',
                }}
              >
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: isActive ? 'bold' : '600',
                  color: isActive ? '#FFF' : colors.textSecondary
                }}>
                  {label} {lang !== 'tous' && `(${count})`}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Aucun livre dans cette catégorie</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Commencez à lire de nouveaux livres !</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0274DF" />}
        />
      )}

      {/* MODAL MISE A JOUR PROGRESSION (BOTTOM SHEET STYLE) */}
      <Modal visible={showProgressModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mise à jour</Text>
              <TouchableOpacity onPress={() => setShowProgressModal(false)} style={[styles.closeBtn, {backgroundColor: colors.backgroundElement}]}>
                <Ionicons name="close" size={24} color={colors.textSecondary}/>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, marginBottom: 24, fontSize: 16 }}>
              Où en êtes-vous dans <Text style={{fontWeight:'bold', color: colors.text}}>"{selectedBook?.title}"</Text> ?
            </Text>
            
            <View style={styles.progressControlRow}>
              <TouchableOpacity 
                style={[styles.stepperBtn, { backgroundColor: colors.backgroundElement }]} 
                onPress={() => {
                  const val = parseInt(newProgress) || 0;
                  setNewProgress(Math.max(0, val - 1).toString());
                }}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              
              <View style={styles.stepperInputContainer}>
                <TextInput 
                  style={[styles.stepperInput, { color: colors.text }]} 
                  value={newProgress} 
                  onChangeText={setNewProgress} 
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>/ {selectedBook?.totalPages || 0}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.stepperBtn, { backgroundColor: colors.backgroundElement }]} 
                onPress={() => {
                  const val = parseInt(newProgress) || 0;
                  setNewProgress(Math.min(selectedBook?.totalPages || 1000, val + 1).toString());
                }}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={[styles.quickActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} 
                onPress={() => setNewProgress(selectedBook?.totalPages?.toString() || '0')}
              >
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
                <Text style={{ color: '#10B981', fontWeight: 'bold', marginLeft: 8 }}>J'ai terminé !</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateProgress}>
              <Text style={styles.submitBtnText}>Enregistrer la progression</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 8, padding: 4, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  activeTabText: { fontWeight: '800' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  bookCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnUpdate: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnRemove: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  progressControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperInputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepperInput: {
    fontSize: 32,
    fontWeight: '900',
    marginRight: 4,
    minWidth: 60,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 32,
    justifyContent: 'center',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  submitBtn: {
    backgroundColor: '#0274DF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
