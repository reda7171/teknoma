import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Switch, Alert, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { useRecentStore } from '@/store/useRecentStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartStore } from '@/store/useCartStore';
import { useI18nStore } from '@/store/useI18nStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';

const WHATSAPP_NUMBER = '212600000000'; // Remplacer par le vrai numéro

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const isDark = scheme === 'dark';

  const clearRecent = useRecentStore(s => s.clearRecent);
  const clearWishlist = useWishlistStore(s => s.clear);
  const clearCart = useCartStore(s => s.clearCart);
  
  const { language, setLanguage, t } = useI18nStore();
  const { isLoggedIn, customer, logout } = useAuthStore();

  const handleContactSupport = () => {
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=Bonjour, j'ai besoin d'aide concernant Riwaya.`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'WhatsApp n\'est pas installé sur cet appareil.');
    });
  };

  const handleClearData = () => {
    Alert.alert(t('clear_data'), 'Voulez-vous vraiment vider votre panier, vos favoris et votre historique ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: () => {
        clearRecent();
        clearWishlist();
        clearCart();
        Alert.alert('Succès', 'Toutes les données locales ont été effacées.');
      }},
    ]);
  };

  const handleLanguageToggle = () => {
    const newLang = language === 'fr' ? 'ar' : 'fr';
    setLanguage(newLang);
    Alert.alert(
      'Redémarrage requis',
      'Veuillez redémarrer l\'application pour appliquer les changements de direction (RTL).'
    );
  };

  const SettingRow = ({ label, value, onPress, isDanger = false, toggleValue, onToggle }: any) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.backgroundSelected, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, { color: isDanger ? '#EF4444' : colors.text }]}>{label}</Text>
      {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
      {toggleValue !== undefined && (
        <Switch value={toggleValue} onValueChange={onToggle} />
      )}
      {onPress && !toggleValue && <Text style={[styles.chevron, { color: colors.textSecondary, transform: [{ scaleX: language === 'ar' ? -1 : 1 }] }]}>›</Text>}
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'left' }]}>
          {t('settings')}
        </Text>

        {/* Section Profil */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }]}>Profil</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {isLoggedIn ? (
              <>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{customer?.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.profileName, { color: colors.text }]}>{customer?.fullName}</Text>
                    <Text style={{ color: colors.textSecondary }}>{customer?.email || customer?.phone}</Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: colors.backgroundSelected }} />
                <SettingRow label="Mes Commandes" onPress={() => router.push('/orders')} />
                <SettingRow label="Se déconnecter" onPress={handleLogout} isDanger />
              </>
            ) : (
              <SettingRow label="Se connecter / S'inscrire" onPress={() => router.push('/login')} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }]}>Apparence</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow label={t('dark_mode')} toggleValue={isDark} onToggle={() => Alert.alert('Info', 'Pour l\'instant, Riwaya suit le thème système de votre appareil.')} />
            <SettingRow label={t('language')} value={language === 'fr' ? 'Français' : 'العربية'} onPress={handleLanguageToggle} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Assistance</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {/* O - Support WhatsApp */}
            <TouchableOpacity style={styles.supportBtn} onPress={handleContactSupport}>
              <View style={styles.whatsappIcon}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>WA</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Contacter le support</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Réponse sous 24h via WhatsApp</Text>
              </View>
            </TouchableOpacity>
            
            <View style={{ height: 1, backgroundColor: colors.backgroundSelected, marginVertical: 8 }} />
            
            <SettingRow label="FAQ & Aide" onPress={() => {}} />
            <SettingRow label="Conditions d'utilisation" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Données</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <SettingRow label="Effacer le cache et les données" onPress={handleClearData} isDanger />
          </View>
        </View>

        <Text style={styles.version}>Riwaya Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: Spacing.four, paddingBottom: 100 },
  title:        { fontSize: 28, fontWeight: '800', marginBottom: Spacing.four },
  section:      { marginBottom: Spacing.five },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.two, marginLeft: 8 },
  card:         { borderRadius: 16, paddingVertical: 4, overflow: 'hidden' },
  profileHeader:{ flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.four },
  avatar:       { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0274DF', justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  profileName:  { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three, borderBottomWidth: 1 },
  rowLabel:     { fontSize: 16, fontWeight: '500' },
  rowValue:     { fontSize: 16 },
  chevron:      { fontSize: 20 },
  supportBtn:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, gap: 12 },
  whatsappIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  version:      { textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: Spacing.four },
});
