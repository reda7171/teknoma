import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCartStore } from '@/store/useCartStore';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function CartScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const { items, removeItem, updateQuantity, getSubtotal } = useCartStore();

  const subtotal = getSubtotal();

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Votre panier est vide</Text>
        <TouchableOpacity style={styles.continueButton} onPress={() => router.push('/')}>
          <Text style={styles.continueText}>Continuer mes achats</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Mon Panier</Text>

        {items.map((item) => (
          <View key={item.product.id} style={[styles.cartItem, { backgroundColor: colors.backgroundElement }]}>
            <Image source={item.product.image} style={styles.image} contentFit="cover" />
            
            <View style={styles.itemDetails}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item.product.title}</Text>
              <Text style={styles.itemPrice}>{item.product.price.toFixed(2)} MAD</Text>
              
              <View style={styles.quantityContainer}>
                <TouchableOpacity 
                  style={[styles.qtyButton, { backgroundColor: colors.backgroundSelected }]} 
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Text style={{ color: colors.text }}>-</Text>
                </TouchableOpacity>
                
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                
                <TouchableOpacity 
                  style={[styles.qtyButton, { backgroundColor: colors.backgroundSelected }]} 
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Text style={{ color: colors.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.product.id)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View style={[styles.bottomBar, { borderTopColor: colors.backgroundSelected }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{subtotal.toFixed(2)} MAD</Text>
        </View>
        
        <TouchableOpacity style={styles.checkoutButton} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutText}>Commander (COD)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: Spacing.four,
  },
  continueButton: {
    backgroundColor: '#0274DF',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    padding: Spacing.four,
    paddingBottom: 120, // Space for bottom bar
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.four,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  image: {
    width: 80,
    height: 110,
    borderRadius: Spacing.two,
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.three,
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0274DF',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    marginHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButton: {
    padding: Spacing.two,
    justifyContent: 'center',
  },
  removeText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    borderTopWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  totalLabel: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0274DF',
  },
  checkoutButton: {
    backgroundColor: '#0274DF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  checkoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
