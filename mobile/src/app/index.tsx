import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookCard } from '@/components/BookCard';
import { SkeletonGrid, SkeletonHorizontal } from '@/components/SkeletonCard';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { Product } from '@/store/useCartStore';
import api from '@/services/api';

const FILTERS = [
  { id: 'ALL',  label: 'Tout'   },
  { id: 'PACK', label: 'Packs'  },
  { id: 'BOOK', label: 'Livres' },
];

const CATEGORIES = [
  { id: '', label: 'Toutes les catégories' },
  { id: 'Roman', label: 'Roman' },
  { id: 'Développement Personnel', label: 'Développement Personnel' },
  { id: 'Business', label: 'Business' },
  { id: 'Enfant', label: 'Enfant' },
];

const SORTS = [
  { id: 'newest', label: 'Plus récents' },
  { id: 'price_asc', label: 'Prix croissant' },
  { id: 'price_desc', label: 'Prix décroissant' },
];

// Récupère les packs (toujours page 1)
async function fetchPacks() {
  const res = await api.get('/catalog?page=1&limit=10');
  return (res.data.packs || []) as Product[];
}

export default function HomeScreen() {
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

  // Pagination infinie pour les livres (K)
  const {
    data: booksData,
    isLoading: loadingBooks,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['books-infinite', search, categoryFilter, sortFilter],
    queryFn: async ({ pageParam = 1, queryKey }) => {
      const [_key, s, c, sort] = queryKey;
      const res = await api.get(`/catalog?page=${pageParam}&limit=12&search=${encodeURIComponent(s as string)}&category=${encodeURIComponent(c as string)}&sort=${encodeURIComponent(sort as string)}`);
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
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Riwaya</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Des livres pour tous les goûts</Text>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher un livre, un auteur..."
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => setSearch(searchInput)}
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
            <Text style={[styles.clearBtn, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
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

      {/* Packs horizontaux */}
      {activeFilter !== 'BOOK' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Packs Promotionnels 🔥</Text>
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
          ) : null}
        </View>
      )}

      {/* Titre section livres */}
      {activeFilter !== 'PACK' && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {search ? `${allBooks.length} résultat${allBooks.length !== 1 ? 's' : ''}` : 'Livres Populaires 📚'}
        </Text>
      )}
    </View>
  );

  // Footer de la FlatList (spinner de chargement page suivante)
  const ListFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#0274DF" />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  };

  // Pendant le chargement initial → skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Riwaya</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.three }]}>Packs Promotionnels 🔥</Text>
          <SkeletonHorizontal count={3} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginVertical: Spacing.three }]}>Livres Populaires 📚</Text>
          <SkeletonGrid count={6} />
        </View>
      </SafeAreaView>
    );
  }

  if (activeFilter === 'PACK') {
    // Vue packs uniquement — ScrollView simple
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0274DF" />}
          keyboardShouldPersistTaps="handled"
        >
          <ListHeader />
          <View style={styles.grid}>
            {filteredPacks.map((p) => <BookCard key={p.id} product={p} />)}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={allBooks}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.columnWrapper}
        keyboardShouldPersistTaps="handled"

        /* J — Pull-to-refresh */
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0274DF" />
        }

        /* K — Infinite scroll */
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}

        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}

        ListEmptyComponent={
          search ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun résultat pour "{search}"
              </Text>
            </View>
          ) : null
        }

        renderItem={({ item }) => <BookCard product={item} />}
      />

      {/* Modal de filtres */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filtres & Tri</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={{ fontSize: 24, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Trier par</Text>
            {SORTS.map(s => (
              <TouchableOpacity key={s.id} onPress={() => setSortFilter(s.id)} style={[styles.optionRow, sortFilter === s.id && styles.optionRowActive]}>
                <Text style={{ color: sortFilter === s.id ? '#FFF' : colors.text }}>{s.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Catégorie</Text>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCategoryFilter(c.id)} style={[styles.optionRow, categoryFilter === c.id && styles.optionRowActive]}>
                <Text style={{ color: categoryFilter === c.id ? '#FFF' : colors.text }}>{c.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: Spacing.four },
  header:         { marginBottom: Spacing.four },
  title:          { fontSize: 30, fontWeight: '800', marginBottom: 2 },
  subtitle:       { fontSize: 15 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 12, marginBottom: Spacing.three },
  searchIcon:     { fontSize: 16, marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 16, padding: 0 },
  clearBtn:       { fontSize: 16, paddingLeft: 8 },
  filtersRow:     { marginBottom: Spacing.four },
  filtersContent: { gap: Spacing.two, paddingRight: Spacing.four },
  filterChip:     { paddingHorizontal: Spacing.three, paddingVertical: 8, borderRadius: 20 },
  filterChipActive:{ backgroundColor: '#0274DF' },
  filterText:     { fontSize: 14, fontWeight: '500' },
  filterTextActive:{ color: '#FFFFFF', fontWeight: '700' },
  section:        { marginBottom: Spacing.four },
  sectionTitle:   { fontSize: 20, fontWeight: '700', marginBottom: Spacing.three },
  horizontalList: { paddingRight: Spacing.four },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  columnWrapper:  { justifyContent: 'space-between' },
  footerLoader:   { alignItems: 'center', paddingVertical: Spacing.four, gap: 8 },
  footerText:     { fontSize: 13 },
  emptyState:     { alignItems: 'center', paddingVertical: Spacing.six },
  emptyIcon:      { fontSize: 48, marginBottom: Spacing.three },
  emptyText:      { fontSize: 16, textAlign: 'center' },
  filterBtn:      { paddingLeft: 8, paddingVertical: 4 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.four, maxHeight: '80%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:     { fontSize: 22, fontWeight: 'bold' },
  optionRow:      { padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#f0f0f0' }, // fallback
  optionRowActive:{ backgroundColor: '#0274DF' },
  applyBtn:       { backgroundColor: '#0274DF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  applyBtnText:   { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
