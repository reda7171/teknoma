import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { getImageUrl } from '@/services/api';

interface ReaderCardModalProps {
  visible: boolean;
  onClose: () => void;
  customer: any;
  t: (key: string) => string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function ReaderCardModal({ visible, onClose, customer, t }: ReaderCardModalProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  if (!customer) return null;

  // Utilize external API to generate QR Code
  // the 'data' parameter is the customer's unique identifier (ID or Email)
  const qrData = customer.id || customer.email || 'petsunivers-user';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=ffffff&qzone=1`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={28} color="#000" />
          </View>
        </TouchableOpacity>

        {/* Card Container */}
        <View style={[styles.cardContainer, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
          <LinearGradient
            colors={isDark ? ['#1e293b', '#0f172a'] : ['#ffffff', '#f8fafc']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header branding */}
            <View style={styles.brandingHeader}>
              <Text style={[styles.brandingText, { color: isDark ? '#fff' : '#000' }]}>R I W A Y A</Text>
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>{customer.gamification?.level ? `NIV ${customer.gamification.level}` : t('member')}</Text>
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {customer.image ? (
                  <Image source={{ uri: getImageUrl(customer.image) || '' }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{customer.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.userName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                {customer.fullName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {customer.email || customer.phone}
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#000' }]}>{customer.credits || 0}</Text>
                <Text style={styles.statLabel}>{t('credits')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#000' }]}>{customer.gamification?.booksRead || 0}</Text>
                <Text style={styles.statLabel}>Livres lus</Text>
              </View>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <Image source={{ uri: qrUrl }} style={styles.qrCode} />
              </View>
              <Text style={styles.qrLabel}>Scannez pour identifier</Text>
            </View>

          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  brandingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandingText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
  },
  vipBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#64748b',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 12,
  },
  qrCode: {
    width: 160,
    height: 160,
  },
  qrLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
