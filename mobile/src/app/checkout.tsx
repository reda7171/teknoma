import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/store/useCartStore';
import { submitOrder, validateCoupon } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useI18nStore } from '@/store/useI18nStore';
import { CustomAlertModal, AlertType } from '@/components/ui/CustomAlertModal';

// URL de base du serveur (sans /api/mobile)
const SERVER_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace('/api/mobile', '')
  : Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir',
  'Oujda', 'Meknès', 'Kénitra', 'Tétouan', 'Salé', 'Mohammédia', 'Nador'
];

export default function CheckoutScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { t } = useI18nStore();

  const { items, getSubtotal, clearCart } = useCartStore();
  const subtotal = getSubtotal();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    comment: '',
  });

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [loading, setLoading] = useState(false);

  // Alerte customisée
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type?: AlertType;
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onPrimaryPress: () => {},
  });

  // Modes de paiement actifs depuis l'admin
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [paymentSettings, setPaymentSettings] = useState<{
    cod: boolean;
    bankTransfer: boolean;
    bankTransferAccounts: { bankName: string; accountName: string; rib: string }[];
  }>({ cod: true, bankTransfer: false, bankTransferAccounts: [] });

  useEffect(() => {
    fetch(`${SERVER_URL}/api/mobile/settings`)
      .then(r => r.json())
      .then(data => {
        if (data?.paymentMethods) setPaymentSettings(data.paymentMethods);
      })
      .catch(() => {/* silencieux */});
  }, []);

  // Calcul dynamique conforme aux règles Riwaya (30 MAD, gratuit dès 500 MAD)
  const shippingFees = subtotal >= 500 ? 0 : 30;
  const remainingForFreeShipping = Math.max(0, 500 - subtotal);
  const total = Math.max(0, subtotal - discount + shippingFees);

  const handleCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await validateCoupon(couponInput.trim(), subtotal);
      if (res.success) {
        setDiscount(res.coupon.discount);
        setCouponCode(res.coupon.code);
        setCouponMsg({ text: `${t('code_applied')} — -${res.coupon.discount.toFixed(2)} MAD`, ok: true });
      } else {
        setDiscount(0);
        setCouponCode('');
        setCouponMsg({ text: res.error, ok: false });
      }
    } catch {
      setCouponMsg({ text: t('conn_error'), ok: false });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setCouponCode('');
    setCouponInput('');
    setCouponMsg(null);
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: t('req_fields') || 'Champs obligatoires',
        message: t('fill_req_fields') || 'Veuillez renseigner votre nom, téléphone, ville et adresse de livraison.',
        primaryButtonText: t('ok') || 'D\'accord',
        onPrimaryPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        ...formData,
        total,
        discount,
        couponCode: couponCode || null,
        paymentMethod,
        items: items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          type: i.product.type,
          price: i.product.price,
        })),
      };

      const res = await submitOrder(orderData);

      if (res.success) {
        clearCart();
        router.replace({
          pathname: '/order-confirmation',
          params: {
            orderId: res.orderId,
            fullName: formData.fullName,
            city: formData.city,
            total: total.toString(),
            discount: discount.toString(),
            couponCode: couponCode,
            items: JSON.stringify(res.orderDetails?.items || []),
          },
        });
      }
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: t('error') || 'Erreur',
        message: e?.response?.data?.error || t('order_error') || 'Impossible d\'enregistrer votre commande.',
        primaryButtonText: t('ok') || 'D\'accord',
        onPrimaryPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('empty_cart')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backText}>← {t('back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('payment_cod')}</Text>
        </View>

        {/* Jauge d'incitation à la livraison gratuite */}
        <View style={[
          styles.freeShippingBox,
          { backgroundColor: remainingForFreeShipping === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(2, 116, 223, 0.08)' }
        ]}>
          <Ionicons
            name={remainingForFreeShipping === 0 ? "checkmark-circle" : "car-outline"}
            size={22}
            color={remainingForFreeShipping === 0 ? "#10B981" : "#0274DF"}
          />
          <Text style={[
            styles.freeShippingText,
            { color: remainingForFreeShipping === 0 ? "#10B981" : colors.text }
          ]}>
            {remainingForFreeShipping === 0
              ? (t('free_shipping_congrats') || "🎉 Félicitations ! Livraison standard offerte")
              : (t('free_shipping_reach')?.replace('{{amount}}', remainingForFreeShipping.toFixed(0)) || `Ajoutez encore ${remainingForFreeShipping.toFixed(0)} MAD pour la livraison GRATUITE !`)}
          </Text>
        </View>

        {/* Formulaire Client */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('fullname')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Ex: Amine Benali"
              placeholderTextColor={colors.textSecondary}
              value={formData.fullName}
              onChangeText={(v) => setFormData({ ...formData, fullName: v })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('phone')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Ex: 0612345678"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(v) => setFormData({ ...formData, phone: v })}
            />
          </View>

          {/* Ville avec suggestions rapides */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('city')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Ex: Casablanca"
              placeholderTextColor={colors.textSecondary}
              value={formData.city}
              onChangeText={(v) => setFormData({ ...formData, city: v })}
            />
            {/* Puces de villes populaires */}
            <View style={{ marginTop: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {MOROCCAN_CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setFormData({ ...formData, city: c })}
                    style={[
                      styles.cityChip,
                      {
                        backgroundColor: formData.city === c ? '#0274DF' : colors.backgroundElement,
                        borderColor: formData.city === c ? '#0274DF' : 'transparent',
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.cityChipText,
                      { color: formData.city === c ? '#FFFFFF' : colors.text }
                    ]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('address')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, height: 75, textAlignVertical: 'top' }]}
              placeholder="Ex: 12 Rue des Lilas, Maarif"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={formData.address}
              onChangeText={(v) => setFormData({ ...formData, address: v })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('comment')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, height: 65, textAlignVertical: 'top' }]}
              placeholder="Instructions pour le livreur (optionnel)..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={formData.comment}
              onChangeText={(v) => setFormData({ ...formData, comment: v })}
            />
          </View>
        </View>

        {/* Section Code Promo */}
        <View style={[styles.couponSection, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('have_coupon')}</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput, { backgroundColor: colors.background, color: colors.text, flex: 1 }]}
              placeholder="CODE123"
              placeholderTextColor={colors.textSecondary}
              value={couponInput}
              onChangeText={setCouponInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.couponBtn, (!couponInput.trim() || couponLoading) && { opacity: 0.5 }]}
              onPress={handleCoupon}
              disabled={couponLoading || !couponInput.trim()}
            >
              {couponLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.couponBtnText}>{t('apply_coupon')}</Text>}
            </TouchableOpacity>
          </View>
          {couponMsg && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' }}>
              <Text style={{ color: couponMsg.ok ? '#10B981' : '#EF4444', fontSize: 13, fontWeight: '500' }}>{couponMsg.text}</Text>
              {couponMsg.ok && (
                <TouchableOpacity onPress={removeCoupon}>
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: 'bold' }}>{t('remove')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Récapitulatif montant complet avec frais de livraison */}
        <View style={[styles.summaryBox, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('subtotal')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{subtotal.toFixed(2)} MAD</Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#10B981' }]}>{t('discount')}</Text>
              <Text style={{ color: '#10B981', fontWeight: '700' }}>-{discount.toFixed(2)} MAD</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('shipping_fees') || 'Frais de livraison'}</Text>
            {shippingFees === 0 ? (
              <Text style={{ color: '#10B981', fontWeight: '700' }}>{t('free_shipping') || 'Gratuit'}</Text>
            ) : (
              <Text style={[styles.summaryValue, { color: colors.text }]}>30.00 MAD</Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{t('total_cod')}</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} MAD</Text>
          </View>
        </View>

        {/* Modes de paiement */}
        {(paymentSettings.cod || paymentSettings.bankTransfer) && (
          <View style={[styles.paymentSection, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mode de paiement</Text>

            {paymentSettings.cod && (
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'COD' && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod('COD')}
                activeOpacity={0.8}
              >
                <View style={[styles.paymentRadio, paymentMethod === 'COD' && styles.paymentRadioActive]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentLabel, { color: colors.text }]}>Paiement à la livraison (COD)</Text>
                  <Text style={[styles.paymentDesc, { color: colors.textSecondary }]}>Réglez en cash au livreur à la réception de votre colis</Text>
                </View>
              </TouchableOpacity>
            )}

            {paymentSettings.bankTransfer && (
              <>
                <TouchableOpacity
                  style={[styles.paymentOption, paymentMethod === 'BANK_TRANSFER' && styles.paymentOptionActiveTeal]}
                  onPress={() => setPaymentMethod('BANK_TRANSFER')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.paymentRadio, paymentMethod === 'BANK_TRANSFER' && styles.paymentRadioTeal]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentLabel, { color: colors.text }]}>{t('BankTransfer')}</Text>
                    <Text style={[styles.paymentDesc, { color: colors.textSecondary }]}>{t('TransferAmountToBank')}</Text>
                  </View>
                </TouchableOpacity>

                {paymentMethod === 'BANK_TRANSFER' && paymentSettings.bankTransferAccounts.length > 0 && (
                  <View style={styles.bankDetails}>
                    {paymentSettings.bankTransferAccounts.map((acc, i) => (
                      <View key={i} style={styles.bankCard}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0D9488', marginBottom: 6, textTransform: 'uppercase' }}>{acc.bankName}</Text>
                        <Text style={{ fontSize: 13, color: colors.text }}>Titulaire : <Text style={{ fontWeight: '700' }}>{acc.accountName}</Text></Text>
                        <Text style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>RIB : <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{acc.rib}</Text></Text>
                      </View>
                    ))}
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>{t('OrderProcessedAfterTransfer')}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Note de réassurance COD */}
        <View style={styles.codNoticeRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
          <Text style={[styles.codNoticeText, { color: colors.textSecondary }]}>
            {t('cod_notice') || 'Paiement en espèces à la livraison partout au Maroc • Livraison sous 24-48h'}
          </Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>{t('confirm_order')} - {total.toFixed(2)} MAD</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Alerte Customisée */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButtonText={alertConfig.primaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { padding: Spacing.four, paddingBottom: 100 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  backButton:      { marginTop: Spacing.three },
  backText:        { fontSize: 16, color: '#0274DF', fontWeight: '600' },
  title:           { fontSize: 22, fontWeight: 'bold' },
  freeShippingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  freeShippingText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  form:            { gap: Spacing.three, marginBottom: Spacing.four },
  inputGroup:      { gap: Spacing.two },
  label:           { fontSize: 14, fontWeight: '600' },
  input:           { padding: Spacing.three, borderRadius: 10, fontSize: 15 },
  cityChip:        {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cityChipText:    {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle:    { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
  /* Coupon */
  couponSection:   { borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.three },
  couponRow:       { flexDirection: 'row', gap: Spacing.two },
  couponInput:     { padding: Spacing.two, borderRadius: 8, fontSize: 15 },
  couponBtn:       { backgroundColor: '#0274DF', paddingHorizontal: Spacing.three, borderRadius: 8, justifyContent: 'center' },
  couponBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  /* Modes de paiement */
  paymentSection:  { borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.three, gap: Spacing.two },
  paymentOption:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: 'rgba(0,0,0,0.04)' },
  paymentOptionActive:     { borderColor: '#0274DF', backgroundColor: 'rgba(2,116,223,0.06)' },
  paymentOptionActiveTeal: { borderColor: '#0D9488', backgroundColor: 'rgba(13,148,136,0.06)' },
  paymentRadio:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: 'white' },
  paymentRadioActive: { borderColor: '#0274DF', backgroundColor: '#0274DF' },
  paymentRadioTeal:   { borderColor: '#0D9488', backgroundColor: '#0D9488' },
  paymentLabel:    { fontSize: 14, fontWeight: '600' },
  paymentDesc:     { fontSize: 12, marginTop: 2 },
  bankDetails:     { marginTop: Spacing.two, gap: Spacing.two },
  bankCard:        { backgroundColor: 'rgba(13,148,136,0.08)', borderRadius: 10, padding: Spacing.three, borderWidth: 1, borderColor: 'rgba(13,148,136,0.2)' },
  /* Résumé */
  summaryBox:      { borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.three },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  summaryLabel:    { fontSize: 14 },
  summaryValue:    { fontSize: 14, fontWeight: '500' },
  divider:         { height: 1, marginVertical: Spacing.two },
  totalLabel:      { fontSize: 16, fontWeight: '700' },
  totalValue:      { fontSize: 18, fontWeight: '800', color: '#0274DF' },
  /* Réassurance */
  codNoticeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.three, paddingHorizontal: 4 },
  codNoticeText:   { fontSize: 12, flex: 1, lineHeight: 17 },
  /* Bouton */
  submitBtn:       { backgroundColor: '#0274DF', paddingVertical: Spacing.three, borderRadius: 12, alignItems: 'center', shadowColor: '#0274DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitBtnText:   { color: 'white', fontSize: 17, fontWeight: 'bold' },
});
