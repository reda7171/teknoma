import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  onClose?: () => void;
}

export function CustomAlertModal({
  visible,
  type = 'info',
  title,
  message,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
}: CustomAlertProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  if (!visible) return null;

  const iconConfig = {
    success: { name: 'checkmark-circle' as const, color: '#10B981', bg: isDark ? '#064E3B' : '#ECFDF5' },
    error: { name: 'close-circle' as const, color: '#EF4444', bg: isDark ? '#7F1D1D' : '#FEF2F2' },
    warning: { name: 'warning' as const, color: '#F59E0B', bg: isDark ? '#78350F' : '#FFFBEB' },
    info: { name: 'information-circle' as const, color: '#0274DF', bg: isDark ? '#0C4A6E' : '#EFF6FF' },
    confirm: { name: 'help-circle' as const, color: '#0274DF', bg: isDark ? '#0C4A6E' : '#EFF6FF' },
  }[type];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose || onPrimaryPress}
    >
      <TouchableWithoutFeedback onPress={onClose || onPrimaryPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Icône de statut */}
              <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name} size={36} color={iconConfig.color} />
              </View>

              {/* Titre */}
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>

              {/* Boutons d'action */}
              <View style={styles.actionsRow}>
                {secondaryButtonText && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.secondaryButton,
                      {
                        backgroundColor: isDark ? '#334155' : '#F1F5F9',
                        borderColor: isDark ? '#475569' : '#CBD5E1',
                      },
                    ]}
                    onPress={onSecondaryPress || onClose}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {secondaryButtonText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    {
                      backgroundColor: type === 'error' ? '#EF4444' : '#0274DF',
                      flex: secondaryButtonText ? 1 : undefined,
                      minWidth: secondaryButtonText ? undefined : 140,
                    },
                  ]}
                  onPress={onPrimaryPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
