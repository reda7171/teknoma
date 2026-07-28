import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useI18nStore } from '@/store/useI18nStore';
import { getMyExchanges } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';

export default function ChatListScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const t = useI18nStore(state => state.t);
  const router = useRouter();
  const { isLoggedIn, customer } = useAuthStore();
  
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadExchanges();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const loadExchanges = async () => {
    try {
      setLoading(true);
      const res = await getMyExchanges();
      // Combine sent and received
      const all = [...(res.sent || []), ...(res.received || [])];
      // Sort by latest
      all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setExchanges(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExchanges();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isRequester = item.requesterId === customer?.id;
    const otherUser = isRequester ? item.responder : item.requester;
    const bookName = item.bookRequested?.title || 'Livre inconnu';
    
    let statusColor = colors.textSecondary;
    if (item.status === 'ACCEPTED') statusColor = '#10B981';
    if (item.status === 'REJECTED') statusColor = '#EF4444';
    if (item.status === 'PENDING') statusColor = '#F59E0B';

    return (
      <TouchableOpacity 
        style={[styles.chatItem, { borderBottomColor: isDark ? '#333' : '#F1F5F9' }]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{otherUser?.fullName?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.userName, { color: colors.text }]}>{otherUser?.fullName || 'Utilisateur'}</Text>
            <Text style={{ fontSize: 12, color: statusColor, fontWeight: 'bold' }}>{item.status}</Text>
          </View>
          <Text style={[styles.messagePreview, { color: colors.textSecondary }]} numberOfLines={1}>
            Demande pour : {bookName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isDark = scheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F1F5F9' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('chat') || 'Messagerie'}</Text>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0274DF" />
        </View>
      ) : exchanges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Vos conversations et demandes apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={exchanges}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0274DF" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    marginTop: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0274DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 14,
  },
});
