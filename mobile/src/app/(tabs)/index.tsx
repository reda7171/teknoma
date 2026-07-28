import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, Modal, RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookCard } from '@/components/BookCard';
import { SkeletonGrid, SkeletonHorizontal } from '@/components/SkeletonCard';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useCartStore, Product } from '@/store/useCartStore';
import api from '@/services/api';
import { useI18nStore } from '@/store/useI18nStore';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl } from '@/services/api';

// Récupère les packs (toujours page 1)
async function fetchPacks() {
  const res = await api.get('/catalog?page=1&limit=10');
  return (res.data.packs || []) as Product[];
}

export default function HomeScreen() {
  const { t } = useI18nStore();
  const { isLoggedIn, customer } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const router = useRouter();

  const FILTERS = useMemo(() => [
    { id: 'ALL',  label: t('filter_all')   },
    { id: 'PACK', label: t('filter_packs')  },
    { id: 'BOOK', label: t('filter_books') },
  ], [t]);

  const CATEGORIES = useMemo(() => [
    { id: '', label: t('cat_all') },
    { id: 'Roman', label: t('cat_roman') },
    { id: 'Développement Personnel', label: t('cat_dev') },
    { id: 'Business', label: t('cat_business') },
    { id: 'Enfant', label: t('cat_enfant') },
  ], [t]);

  const SORTS = useMemo(() => [
    { id: 'newest', label: t('sort_newest') },
    { id: 'price_asc', label: t('sort_price_asc') },
    { id: 'price_desc', label: t('sort_price_desc') },
  ], [t]);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Pour l'input avant soumission
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PACK' | 'BOOK'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('newest');
  const [languageFilter, setLanguageFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const resetFilters = () => {
    setCategoryFilter('');
    setSortFilter('newest');
    setLanguageFilter('');
    setMinPrice('');
    setMaxPrice('');
  };

  // Pagination infinie pour les livres (K)
  const {
    data: booksData,
    isLoading: loadingBooks,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['books-infinite', search, categoryFilter, sortFilter, languageFilter, minPrice, maxPrice],
    queryFn: async ({ pageParam = 1, queryKey }) => {
      const [_key, s, c, sort, lang, min, max] = queryKey;
      let url = `/catalog?page=${pageParam}&limit=12&search=${encodeURIComponent(s as string)}&category=${encodeURIComponent(c as string)}&sort=${encodeURIComponent(sort as string)}`;
      if (lang) url += `&language=${encodeURIComponent(lang as string)}`;
      if (min) url += `&minPrice=${encodeURIComponent(min as string)}`;
      if (max) url += `&maxPrice=${encodeURIComponent(max as string)}`;
      const res = await api.get(url);
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => last.pagination?.nextPage ?? undefined,
  });

  // Packs (simple query)
  const { data: packs, isLoading: loadingPacks } = useQuery({
    queryKey: ['packs'],
    queryFn: fetchPacks,
  });

  // Aplatit toutes les pages de livres
  const allBooks: Product[] = useMemo(
    () => booksData?.pages.flatMap((p) => p.books || []) ?? [],
    [booksData]
  );

  // Validation de la recherche
  const handleSearchSubmit = () => {
    setSearch(searchInput);
  };

  // Pull-to-refresh (J)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['books-infinite'] });
    await queryClient.invalidateQueries({ queryKey: ['packs'] });
    setRefreshing(false);
  }, [queryClient]);

  // Charge la page suivante au scroll (K)
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Filtrage des packs (client-side car les packs sont tous chargés d'un coup)
  const filteredPacks = useMemo(() => {
    if (activeFilter === 'BOOK') return [];
    const src = (packs || []) as Product[];
    if (!search) return src;
    const q = search.toLowerCase();
    return src.filter((p) => p.title.toLowerCase().includes(q));
  }, [packs, search, activeFilter]);

  const isLoading = loadingBooks || loadingPacks;

  // Header de la FlatList (packs + barre de recherche + filtres)
  const ListHeader = () => (
    <View style={{ paddingBottom: Spacing.four }}>
      {/* Header Premium */}
      <LinearGradient
        colors={['#0274DF', '#014A8E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumHeader}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.premiumTitle}>Riwaya</Text>
            <Text style={styles.premiumSubtitle}>{t('home_subtitle')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {totalItems > 0 && (
              <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartHeaderBtn}>
                <Ionicons name="cart" size={24} color="#FFF" />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalItems}</Text>
                </View>
              </TouchableOpacity>
            )}
            {isLoggedIn && customer ? (
              <TouchableOpacity onPress={() => router.push('/settings')} style={styles.profileContainer}>
                {customer.image ? (
                  <Image source={{ uri: getImageUrl(customer.image) || customer.image }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{customer.fullName?.charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/login')} style={styles.profileContainer}>
                <Ionicons name="person-circle-outline" size={44} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar overlapping the gradient */}
        <View style={[styles.searchBar, { backgroundColor: colors.background, shadowColor: colors.text }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('search_placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
              <Text style={[styles.clearBtn, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
            <Ionicons name="options" size={24} color="#0274DF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, { backgroundColor: colors.backgroundElement }, activeFilter === f.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.id as 'ALL' | 'PACK' | 'BOOK')}
          >
            <Text style={[styles.filterText, { color: colors.textSecondary }, activeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeFilter !== 'BOOK' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('packs')}</Text>
          {loadingPacks ? (
            <SkeletonHorizontal count={3} />
          ) : filteredPacks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {filteredPacks.map((pack) => (
                <View key={pack.id} style={{ marginRight: Spacing.three }}>
                  <BookCard product={pack} />
                </View>
              ))}
            </ScrollView>
          ) : (
             <Text style={{ color: colors.textSecondary }}>{t('no_packs')}</Text>
          )}
        </View>
      )}

      {(activeFilter === 'ALL' || activeFilter === 'BOOK') && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {search ? `${allBooks.length} ${t('results')}` : t('popular_books')}
        </Text>
      )}
    </View>
  );

  const ListFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#0274DF" />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('loading')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={allBooks}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.columnWrapper}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0274DF" />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        ListEmptyComponent={
          !loadingBooks ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? t('no_results_for', { query: search }) : t('no_books_found')}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <BookCard product={item} />}
      />

      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('filters_and_sort')}</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>Réinitialiser</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="swap-vertical" size={20} color={colors.text} />
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('sort_by')}</Text>
              </View>
              <View style={styles.chipGroup}>
                {SORTS.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setSortFilter(s.id)} style={[styles.chip, sortFilter === s.id ? styles.chipActive : { backgroundColor: colors.backgroundElement }]}>
                    <Text style={{ color: sortFilter === s.id ? '#FFF' : colors.text, fontWeight: sortFilter === s.id ? '700' : '500' }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sectionHeader}>
                <Ionicons name="folder-open-outline" size={20} color={colors.text} />
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('category')}</Text>
              </View>
              <View style={styles.chipGroup}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryFilter(c.id)} style={[styles.chip, categoryFilter === c.id ? styles.chipActive : { backgroundColor: colors.backgroundElement }]}>
                    <Text style={{ color: categoryFilter === c.id ? '#FFF' : colors.text, fontWeight: categoryFilter === c.id ? '700' : '500' }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sectionHeader}>
                <Ionicons name="language" size={20} color={colors.text} />
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Langue</Text>
              </View>
              <View style={styles.chipGroup}>
                {['', 'fr', 'ar', 'en'].map(l => (
                  <TouchableOpacity key={l} onPress={() => setLanguageFilter(l)} style={[styles.chip, languageFilter === l ? styles.chipActive : { backgroundColor: colors.backgroundElement }]}>
                    <Text style={{ color: languageFilter === l ? '#FFF' : colors.text, fontWeight: languageFilter === l ? '700' : '500' }}>{l === '' ? 'Toutes' : l.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sectionHeader}>
                <Ionicons name="cash-outline" size={20} color={colors.text} />
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Prix (MAD)</Text>
              </View>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                  placeholder="Min"
                  placeholderTextColor={colors.textSecondary}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
                <Text style={{ color: colors.textSecondary, marginHorizontal: 12, fontWeight: 'bold' }}>-</Text>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                  placeholder="Max"
                  placeholderTextColor={colors.textSecondary}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>{t('apply_filters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: 0 },
  premiumHeader:  {
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six + 24, // extra space for overlapping search bar
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: Spacing.six,
  },
  headerContent:  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Spacing.four 
  },
  profileContainer: {
    marginLeft: Spacing.two,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  premiumTitle:   { fontSize: 34, fontWeight: '900', color: '#FFF', marginBottom: 4, letterSpacing: -0.5 },
  premiumSubtitle:{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  searchBar:      { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    paddingHorizontal: Spacing.three, 
    paddingVertical: 14, 
    position: 'absolute',
    bottom: -24,
    left: Spacing.four,
    right: Spacing.four,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  searchIcon:     { fontSize: 16, marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 16, padding: 0 },
  clearBtn:       { fontSize: 16, paddingLeft: 8 },
  filtersRow:     { marginBottom: Spacing.four, marginTop: Spacing.two },
  filtersContent: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  filterChip:     { paddingHorizontal: Spacing.four, paddingVertical: 10, borderRadius: 24 },
  filterChipActive:{ backgroundColor: '#0274DF' },
  filterText:     { fontSize: 14, fontWeight: '500' },
  filterTextActive:{ color: '#FFFFFF', fontWeight: '700' },
  section:        { marginBottom: Spacing.four, paddingHorizontal: Spacing.four },
  sectionTitle:   { fontSize: 22, fontWeight: '800', marginBottom: Spacing.three },
  horizontalList: { paddingLeft: Spacing.four },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  columnWrapper:  { justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  footerLoader:   { alignItems: 'center', paddingVertical: Spacing.four, gap: 8 },
  footerText:     { fontSize: 13 },
  emptyState:     { alignItems: 'center', paddingVertical: Spacing.six },
  emptyIcon:      { fontSize: 48, marginBottom: Spacing.three },
  emptyText:      { fontSize: 16, textAlign: 'center' },
  filterBtn:      { paddingLeft: 8, paddingVertical: 4 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent:   { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.four, maxHeight: '85%', paddingBottom: Spacing.six },
  modalHandle:    { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: Spacing.four },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four },
  modalTitle:     { fontSize: 24, fontWeight: '900' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.three },
  modalSectionTitle: { fontSize: 18, fontWeight: '800', marginLeft: 8 },
  chipGroup:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  chipActive:     { backgroundColor: '#0274DF', shadowColor: '#0274DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  priceRow:       { flexDirection: 'row', alignItems: 'center' },
  priceInput:     { flex: 1, padding: 14, borderRadius: 16, fontSize: 16, textAlign: 'center' },
  modalFooter:    { paddingTop: Spacing.four, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  applyBtn:       { backgroundColor: '#0274DF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#0274DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  applyBtnText:   { color: '#FFF', fontSize: 18, fontWeight: '800' },
  cartHeaderBtn: {
    padding: 8,
    position: 'relative'
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0274DF'
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4
  }
});
