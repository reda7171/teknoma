import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/store/useCartStore';
import { submitOrder, validateCoupon } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function CheckoutScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

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

  const total = subtotal - discount;

  const handleCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await validateCoupon(couponInput.trim(), subtotal);
      if (res.success) {
        setDiscount(res.coupon.discount);
        setCouponCode(res.coupon.code);
        setCouponMsg({ text: `Code appliqué — -${res.coupon.discount.toFixed(2)} MAD`, ok: true });
      } else {
        setDiscount(0);
        setCouponCode('');
        setCouponMsg({ text: res.error, ok: false });
      }
    } catch {
      setCouponMsg({ text: 'Erreur de connexion', ok: false });
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
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        ...formData,
        total,
        discount,
        couponCode: couponCode || null,
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
        // Navigation vers l'écran de confirmation avec tous les détails
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
    } catch {
      alert('Une erreur est survenue lors de la validation de la commande.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Votre panier est vide.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Paiement (COD)</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {[
            { key: 'fullName', label: 'Nom complet *', placeholder: 'Ex: Amine Benali' },
            { key: 'phone',    label: 'Téléphone *',   placeholder: 'Ex: 0612345678', keyboard: 'phone-pad' },
            { key: 'city',     label: 'Ville *',        placeholder: 'Ex: Casablanca' },
          ].map(({ key, label, placeholder, keyboard }) => (
            <View key={key} style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType={keyboard as any}
                value={(formData as any)[key]}
                onChangeText={(v) => setFormData({ ...formData, [key]: v })}
              />
            </View>
          ))}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Adresse de livraison *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Votre adresse complète"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={formData.address}
              onChangeText={(v) => setFormData({ ...formData, address: v })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Commentaire (Optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Ex: Appeler avant livraison"
              placeholderTextColor={colors.textSecondary}
              value={formData.comment}
              onChangeText={(v) => setFormData({ ...formData, comment: v })}
            />
          </View>
        </View>

        {/* Bloc coupon */}
        <View style={[styles.couponBox, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.label, { color: colors.text, marginBottom: Spacing.two }]}>Code promo</Text>
          {couponCode ? (
            <View style={styles.couponApplied}>
              <Text style={{ color: '#10B981', fontWeight: '700', flex: 1 }}>
                {couponCode} — -{discount.toFixed(2)} MAD
              </Text>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                disabled={!couponInput.trim() || couponLoading}
              >
                {couponLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.couponBtnText}>Appliquer</Text>
                }
              </TouchableOpacity>
            </View>
          )}
          {couponMsg && (
            <Text style={[styles.couponMsg, { color: couponMsg.ok ? '#10B981' : '#EF4444' }]}>
              {couponMsg.text}
            </Text>
          )}
        </View>

        {/* Récapitulatif montant */}
        <View style={[styles.summaryBox, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sous-total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{subtotal.toFixed(2)} MAD</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Réduction</Text>
              <Text style={{ color: '#10B981', fontWeight: '700' }}>-{discount.toFixed(2)} MAD</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total à payer (COD)</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} MAD</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.submitText}>Confirmer la commande</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { padding: Spacing.four, paddingBottom: 100 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  backButton:      { marginTop: Spacing.three },
  backText:        { fontSize: 16, color: '#0274DF', fontWeight: '600' },
  title:           { fontSize: 22, fontWeight: 'bold' },
  form:            { gap: Spacing.three, marginBottom: Spacing.four },
  inputGroup:      { gap: Spacing.two },
  label:           { fontSize: 15, fontWeight: '500' },
  input:           { padding: Spacing.three, borderRadius: 10, fontSize: 16 },
  textArea:        { minHeight: 80, textAlignVertical: 'top' },
  /* Coupon */
  couponBox:       { borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.three },
  couponRow:       { flexDirection: 'row', gap: Spacing.two },
  couponInput:     { padding: Spacing.two, borderRadius: 8, fontSize: 15 },
  couponBtn:       { backgroundColor: '#0274DF', paddingHorizontal: Spacing.three, borderRadius: 8, justifyContent: 'center' },
  couponBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  couponApplied:   { flexDirection: 'row', alignItems: 'center' },
  couponMsg:       { fontSize: 13, marginTop: 6 },
  /* Résumé */
  summaryBox:      { borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.four },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  summaryLabel:    { fontSize: 14 },
  summaryValue:    { fontSize: 14, fontWeight: '500' },
  divider:         { height: 1, marginVertical: Spacing.two },
  totalLabel:      { fontSize: 16, fontWeight: '700' },
  totalValue:      { fontSize: 18, fontWeight: '800', color: '#0274DF' },
  submitButton:    { backgroundColor: '#0274DF', paddingVertical: Spacing.three, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitText:      { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
