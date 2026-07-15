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
        setError('Aucune commande trouvée.');
        setOrders([]);
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau.');
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mes Commandes</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Suivez l'état de vos livraisons
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'phone' && styles.modeBtnActive]}
            onPress={() => { setMode('phone'); setInput(''); setOrders([]); setSearched(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'phone' && styles.modeBtnTextActive]}>
              Téléphone
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'id' && styles.modeBtnActive]}
            onPress={() => { setMode('id'); setInput(''); setOrders([]); setSearched(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'id' && styles.modeBtnTextActive]}>
              N° Commande
            </Text>
          </TouchableOpacity>
        </View>

        {/* Champ de recherche */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, flex: 1 }]}
            placeholder={mode === 'phone' ? 'Ex: 0612345678' : 'Votre numéro de commande'}
            placeholderTextColor={colors.textSecondary}
            keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
            onPress={handleSearch}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={styles.searchBtnText}>Chercher</Text>
            }
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
                    style={[styles.card, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => router.push(`/order/${order.id}` as any)}
                  >

                    {/* Badge statut */}
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[order.status] || '#6B7280' }]} />
                      <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#6B7280' }]}>
                        {order.statusLabel}
                      </Text>
                    </View>

                    {/* Infos commande */}
                    <Text style={[styles.orderId, { color: colors.textSecondary }]}>
                      #{order.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                      {formatDate(order.createdAt)} · {order.city}
                    </Text>

                    {/* Articles */}
                    <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
                    {order.items.map((item, i) => (
                      <Text key={i} style={[styles.itemLine, { color: colors.text }]}>
                        {item.quantity}× {item.name ?? '—'}
                      </Text>
                    ))}

                    {/* Total */}
                    <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                      <Text style={styles.totalValue}>{order.total.toFixed(2)} MAD</Text>
                    </View>

                    {/* Tracking */}
                    {order.trackingID && (
                      <Text style={[styles.tracking, { color: colors.textSecondary }]}>
                        Suivi : {order.trackingID}
                      </Text>
                    )}
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
  input:          { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  searchBtn:      { backgroundColor: '#0274DF', paddingHorizontal: Spacing.three, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
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
