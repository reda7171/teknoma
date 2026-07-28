import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { getOrders } from '@/services/api';
import { useRouter } from 'expo-router';
import { useI18nStore } from '@/store/useI18nStore';
import { Ionicons } from '@expo/vector-icons';

/* Couleur par statut */
const STATUS_COLOR: Record<string, string> = {
  PENDING:    '#F59E0B',
  CONFIRMED:  '#3B82F6',
  PROCESSING: '#8B5CF6',
  SHIPPED:    '#06B6D4',
  DELIVERED:  '#10B981',
  CANCELLED:  '#EF4444',
  RETURNED:   '#6B7280',
};

type OrderItem = { name?: string; quantity: number; type: string };
type Order = {
  id: string;
  status: string;
  statusLabel: string;
  total: number;
  city: string;
  trackingID?: string;
  createdAt: string;
  items: OrderItem[];
};

export default function OrdersScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();

  const [mode, setMode] = useState<'phone' | 'id'>('phone');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18nStore();

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const params = mode === 'phone' ? { phone: input.trim() } : { orderId: input.trim() };
      const data = await getOrders(params);
      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(t('no_orders_found'));
        setOrders([]);
      }
    } catch {
      setError(t('conn_error_network'));
      setOrders([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('my_orders')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('track_orders')}
            </Text>
          </View>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'phone' && styles.modeBtnActive]}
            onPress={() => { setMode('phone'); setInput(''); setOrders([]); setSearched(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'phone' && styles.modeBtnTextActive]}>
              {t('phone_mode')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'id' && styles.modeBtnActive]}
            onPress={() => { setMode('id'); setInput(''); setOrders([]); setSearched(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'id' && styles.modeBtnTextActive]}>
              {t('order_id_mode')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            placeholder={mode === 'phone' ? t('placeholder_phone') : t('placeholder_order_id')}
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.searchBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
            onPress={handleSearch}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchBtnText}>{t('search_orders')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Résultats */}
        {searched && !loading && (
          <>
            {error || orders.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {error || 'Aucune commande trouvée.'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                  {orders.length} commande{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
                </Text>
                {orders.map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => router.push(`/order/${order.id}` as any)}
                  >
                {/* Header card */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={[styles.orderId, { color: colors.text }]}>{t('order_id')}{order.id}</Text>
                    <Text style={[styles.orderDate, { color: colors.textSecondary }]}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] || '#9CA3AF' }]}>
                    <Text style={styles.statusText}>{order.statusLabel || order.status}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('city_lbl')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{order.city}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('total')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{order.total.toFixed(2)} MAD</Text>
                  </View>
                  {order.trackingID && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('tracking_id')}</Text>
                      <Text style={[styles.detailValue, { color: '#0274DF', fontWeight: 'bold' }]}>{order.trackingID}</Text>
                    </View>
                  )}
                </View>

                {/* Articles */}
                <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
                {order.items.map((item, i) => (
                  <Text key={i} style={[styles.itemLine, { color: colors.text }]}>
                    {item.quantity}× {item.name ?? '—'}
                  </Text>
                ))}
              </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: Spacing.four, paddingBottom: 100 },
  header:         { marginBottom: Spacing.four },
  title:          { fontSize: 28, fontWeight: '800' },
  subtitle:       { fontSize: 15, marginTop: 4 },
  /* Mode toggle */
  modeToggle:     { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: Spacing.three },
  modeBtn:        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive:  { backgroundColor: '#0274DF' },
  modeBtnText:    { fontSize: 14, fontWeight: '600', color: '#60646C' },
  modeBtnTextActive: { color: '#FFFFFF' },
  /* Recherche */
  searchRow:      { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four },
  input:          { flex: 1, padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  searchBtn:      { backgroundColor: '#0274DF', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtnText:  { color: '#FFF', fontWeight: '700', fontSize: 15 },
  /* État vide */
  empty:          { alignItems: 'center', paddingVertical: Spacing.six },
  emptyIcon:      { fontSize: 48, marginBottom: Spacing.three },
  emptyText:      { fontSize: 16, textAlign: 'center' },
  resultCount:    { fontSize: 14, marginBottom: Spacing.three },
  /* Carte commande */
  card:           { borderRadius: 16, padding: Spacing.four, marginBottom: Spacing.three },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: Spacing.two },
  statusDot:      { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText:     { fontSize: 13, fontWeight: '700' },
  orderId:        { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  orderDate:      { fontSize: 13, marginBottom: Spacing.two },
  divider:        { height: 1, marginVertical: Spacing.two },
  itemLine:       { fontSize: 14, marginBottom: 4 },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:     { fontSize: 14 },
  totalValue:     { fontSize: 18, fontWeight: '800', color: '#0274DF' },
  tracking:       { fontSize: 12, marginTop: Spacing.two },
});
