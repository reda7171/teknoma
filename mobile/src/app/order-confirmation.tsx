import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

type OrderItem = { name?: string; quantity: number; type: string };

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  // Paramètres passés depuis checkout
  const params = useLocalSearchParams<{
    orderId: string;
    fullName: string;
    city: string;
    total: string;
    discount: string;
    couponCode: string;
    items: string; // JSON.stringify
  }>();

  const items: OrderItem[] = params.items ? JSON.parse(params.items) : [];
  const total = parseFloat(params.total || '0');
  const discount = parseFloat(params.discount || '0');
  const subtotal = total + discount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Icône succès */}
        <View style={[styles.successCircle, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Commande confirmée !</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Merci {params.fullName?.split(' ')[0]}. Votre commande a bien été enregistrée.
        </Text>

        {/* Numéro de commande */}
        <View style={[styles.orderIdBox, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>N° de commande</Text>
          <Text style={[styles.orderId, { color: colors.text }]}>
            #{params.orderId?.substring(0, 8).toUpperCase()}
          </Text>
        </View>

        {/* Détails */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Récapitulatif</Text>

          {/* Articles */}
          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                {item.quantity}× {item.name}
              </Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />

          {/* Livraison */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Ville</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{params.city}</Text>
          </View>

          {/* Coupon */}
          {discount > 0 && (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Sous-total</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>{subtotal.toFixed(2)} MAD</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: '#10B981' }]}>
                  Code promo ({params.couponCode})
                </Text>
                <Text style={{ color: '#10B981', fontWeight: '700' }}>
                  -{discount.toFixed(2)} MAD
                </Text>
              </View>
            </>
          )}

          {/* Total */}
          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total à payer (COD)</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} MAD</Text>
          </View>
        </View>

        {/* Message */}
        <View style={[styles.infoBox, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.infoText}>
            Notre équipe vous contactera prochainement pour confirmer la livraison.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/')}>
          <Text style={styles.primaryBtnText}>Continuer mes achats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.backgroundElement }]}
          onPress={() => router.replace('/orders')}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
            Suivre ma commande
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { padding: Spacing.four, paddingBottom: 100, alignItems: 'center' },
  successCircle:  { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.four, marginTop: Spacing.four },
  successIcon:    { fontSize: 44, color: '#10B981', fontWeight: '900' },
  title:          { fontSize: 26, fontWeight: '800', marginBottom: Spacing.two, textAlign: 'center' },
  subtitle:       { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.four },
  orderIdBox:     { borderRadius: 12, padding: Spacing.three, alignItems: 'center', width: '100%', marginBottom: Spacing.four },
  orderIdLabel:   { fontSize: 12, marginBottom: 4 },
  orderId:        { fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  card:           { borderRadius: 16, padding: Spacing.four, width: '100%', marginBottom: Spacing.three },
  cardTitle:      { fontSize: 16, fontWeight: '700', marginBottom: Spacing.three },
  itemRow:        { marginBottom: Spacing.two },
  itemName:       { fontSize: 14 },
  divider:        { height: 1, marginVertical: Spacing.three },
  row:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  rowLabel:       { fontSize: 14 },
  rowValue:       { fontSize: 14, fontWeight: '500' },
  totalLabel:     { fontSize: 16, fontWeight: '700' },
  totalValue:     { fontSize: 18, fontWeight: '800', color: '#0274DF' },
  infoBox:        { borderRadius: 12, padding: Spacing.three, width: '100%', marginBottom: Spacing.four },
  infoText:       { fontSize: 14, color: '#92400E', lineHeight: 20, textAlign: 'center' },
  primaryBtn:     { backgroundColor: '#0274DF', width: '100%', paddingVertical: Spacing.three, borderRadius: 12, alignItems: 'center', marginBottom: Spacing.two },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn:   { width: '100%', paddingVertical: Spacing.three, borderRadius: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
});
