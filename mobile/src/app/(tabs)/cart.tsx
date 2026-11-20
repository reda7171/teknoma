import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/store/useCartStore';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useI18nStore } from '@/store/useI18nStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function CartScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { t } = useI18nStore();
  
  const { items, removeItem, updateQuantity, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();

  const handleWhatsAppCartOrder = () => {
    if (items.length === 0) return;
    const itemsList = items
      .map((i) => `• ${i.quantity}x ${i.product.title} (${(i.product.price * i.quantity).toFixed(2)} MAD)`)
      .join('\n');
    const msg = `Salam / Bonjour, je souhaite commander mon panier Riwaya :\n\n${itemsList}\n\n*Total : ${subtotal.toFixed(2)} MAD*\nPaiement à la livraison (COD).`;
    const url = `whatsapp://send?phone=212702220575&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/212702220575?text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Linking.openURL(webUrl);
    });
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="cart-outline" size={60} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t('empty_cart')}</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t('empty_cart_subtext')}
        </Text>
        <TouchableOpacity style={styles.continueButtonContainer} onPress={() => router.push('/')} activeOpacity={0.9}>
          <LinearGradient
            colors={['#0274DF', '#025AB0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>{t('explore_shop')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t('my_cart')}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.product.id} style={[styles.cartItem, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.imageContainer}>
              <Image source={item.product.image} style={styles.image} contentFit="cover" />
            </View>
            
            <View style={styles.itemDetails}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.product.title}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                    {item.product.type === 'PACK' && (
                      <View style={[styles.packChip, { marginTop: 0 }]}>
                        <Text style={styles.packChipText}>{t('pack_chip')}</Text>
                      </View>
                    )}
                    {item.product.language && (
                      <View style={[styles.packChip, { backgroundColor: colors.textSecondary, marginTop: 0 }]}>
                        <Text style={styles.packChipText}>{item.product.language.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.product.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>{item.product.price.toFixed(2)} <Text style={{ fontSize: 13, fontWeight: 'bold' }}>MAD</Text></Text>
                
                <View style={styles.quantityContainer}>
                  <TouchableOpacity 
                    style={[styles.qtyButton, { backgroundColor: colors.background }]} 
                    onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={[styles.qtyButton, { backgroundColor: colors.background }]} 
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.floatingBottomBar, { backgroundColor: colors.background, borderTopColor: colors.backgroundSelected }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('total_to_pay')}</Text>
          <Text style={styles.totalValue}>{subtotal.toFixed(2)} <Text style={{ fontSize: 16 }}>MAD</Text></Text>
        </View>
        
        <TouchableOpacity style={styles.checkoutContainer} onPress={() => router.push('/checkout')} activeOpacity={0.9}>
          <LinearGradient
            colors={['#0274DF', '#025AB0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutGradient}
          >
            <Text style={styles.checkoutText}>{t('order_cod')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.whatsappCartBtn, { backgroundColor: scheme === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: scheme === 'dark' ? '#047857' : '#A7F3D0' }]} 
          onPress={handleWhatsAppCartOrder} 
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
          <Text style={[styles.whatsappCartText, { color: scheme === 'dark' ? '#A7F3D0' : '#065F46' }]}>
            {t('share_cart_whatsapp')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  continueButtonContainer: {
    width: '100%',
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  continueGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badgeContainer: {
    backgroundColor: '#0274DF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  container: {
    padding: 20,
    paddingBottom: 190, // Espace pour la barre flottante et les 2 boutons
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  imageContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  image: {
    width: 85,
    height: 120,
    borderRadius: 12,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  packChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#0274DF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  packChipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  removeButton: {
    padding: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0274DF',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 4,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  qtyText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0274DF',
  },
  checkoutContainer: {
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  checkoutGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  whatsappCartBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  whatsappCartText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
