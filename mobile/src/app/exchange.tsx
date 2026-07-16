import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18nStore } from '@/store/useI18nStore';

// Dummy data for requests
const dummyRequests = [
  { id: '1', bookTitle: 'Atomic Habits', type: 'giveaway', status: 'pending' },
  { id: '2', bookTitle: 'Deep Work', type: 'exchange', status: 'accepted' },
];

export default function ExchangeScreen() {
  const { t } = useI18nStore();
  const credits = 150; // Mock credits

  return (
    <SafeAreaView style={styles.container} className="bg-white dark:bg-slate-900">
      <View style={styles.header}>
        <Text style={styles.title} className="text-slate-900 dark:text-white">{t('exchange')}</Text>
        <Text style={styles.credits} className="text-primary dark:text-blue-400">
          Crédits: <Text style={styles.creditsValue}>{credits}</Text>
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle} className="text-slate-800 dark:text-slate-200">
          Demandes
        </Text>
        <FlatList
          data={dummyRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card} className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <View>
                <Text style={styles.bookTitle} className="text-slate-900 dark:text-white">{item.bookTitle}</Text>
                <Text style={styles.badge} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300">
                  {item.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.status} className="text-slate-500 dark:text-slate-400">
                {item.status}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text className="text-slate-500 dark:text-slate-400">Loading...</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  credits: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditsValue: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
});
