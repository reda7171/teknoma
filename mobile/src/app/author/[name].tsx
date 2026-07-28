import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BookCard } from '@/components/BookCard';
import { getAuthorBooks } from '@/services/api';
import { Product } from '@/store/useCartStore';

export default function AuthorScreen() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const [books, setBooks] = useState<Product[]>([]);
  const [stats, setStats] = useState<{totalBooks?: number; averageRating?: string}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (name) {
      fetchAuthorBooks(name as string);
    }
  }, [name]);

  const fetchAuthorBooks = async (authorName: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getAuthorBooks(authorName);
      setBooks(data.books || []);
      setStats(data.stats || {});
    } catch (e) {
      console.log('Error fetching author books', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.authorHeader}>
      <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="person" size={40} color={colors.textSecondary} />
      </View>
      <Text style={[styles.authorName, { color: colors.text }]}>{decodeURIComponent(name as string)}</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalBooks || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Livres</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.backgroundElement }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            <Ionicons name="star" size={14} color="#F59E0B" /> {stats.averageRating || 'N/A'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Note moy.</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: scheme === 'dark' ? '#333' : '#F1F5F9' }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profil Auteur</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0274DF" />
        </View>
      ) : (
        <FlatList
          data={books}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.bookContainer}>
              <BookCard product={item} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
              Aucun livre trouvé pour cet auteur.
            </Text>
          }
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => fetchAuthorBooks(name as string, true)} 
              tintColor="#0274DF" 
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: 'bold' },
  
  authorHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorName: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bookContainer: {
    width: '48%',
  },
});
