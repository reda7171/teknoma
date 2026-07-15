import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useRecentStore } from '@/store/useRecentStore';
import { BookCard } from '@/components/BookCard';

export default function WishlistScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { items, clear } = useWishlistStore();
  const { items: recentItems, clearRecent } = useRecentStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mes Favoris</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={clear}>
              <Text style={styles.clearText}>Tout supprimer</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>♡</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun favori</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Appuyez sur le cœur sur un livre pour l'ajouter ici.
            </Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
              <Text style={styles.browseBtnText}>Parcourir le catalogue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {items.length} livre{items.length > 1 ? 's' : ''} sauvegardé{items.length > 1 ? 's' : ''}
            </Text>
            <View style={styles.grid}>
              {items.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </View>
          </>
        )}

        {/* M - Historique des livres consultés */}
        {recentItems.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: colors.text }]}>Vus récemment</Text>
              <TouchableOpacity onPress={clearRecent}>
                <Text style={styles.clearText}>Effacer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
              {recentItems.map((b) => (
                <View key={b.id} style={{ width: 160 }}>
                  <BookCard product={b} showWishlist={false} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: Spacing.four, paddingBottom: 100 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four },
  title:          { fontSize: 28, fontWeight: '800' },
  clearText:      { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  count:          { fontSize: 14, marginBottom: Spacing.three },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  empty:          { alignItems: 'center', paddingTop: 80, gap: Spacing.three },
  emptyIcon:      { fontSize: 64, color: '#CBD5E1' },
  emptyTitle:     { fontSize: 22, fontWeight: '700' },
  emptySubtitle:  { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  browseBtn:      { backgroundColor: '#0274DF', paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: 12, marginTop: Spacing.two },
  browseBtnText:  { color: '#FFF', fontWeight: '700', fontSize: 16 },
  recentSection:  { marginTop: Spacing.six, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.2)', paddingTop: Spacing.four },
  recentHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  recentTitle:    { fontSize: 20, fontWeight: '700' },
});
