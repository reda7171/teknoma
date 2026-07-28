import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18nStore } from '@/store/useI18nStore';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18nStore();
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const [identifier, setIdentifier] = useState('redaazizip@hotmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert(t('error'), t('fill_all_fields'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { identifier, password });
      const { token, customer } = response.data;
      
      setAuth(token, customer);
      router.back();
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message);
      Alert.alert(t('error'), error.response?.data?.error || t('wrong_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/auth-bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
        style={styles.gradientOverlay}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.contentContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('login_title')}</Text>
                <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('email_or_phone')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('password')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.btn, loading && { opacity: 0.7 }]} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{t('login_btn')}</Text>}
                </TouchableOpacity>

                {__DEV__ && (
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981' }]} 
                    onPress={() => {
                      setIdentifier('redaazizip@hotmail.com');
                      setPassword('admin123');
                    }}
                  >
                    <Text style={[styles.btnText, { color: '#10B981' }]}>Dev: Auto-Fill (Admin)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.footer}>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{t('no_account')} </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.link}>{t('create_account')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  gradientOverlay: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, justifyContent: 'flex-end', padding: Spacing.five },
  contentContainer: { paddingBottom: Spacing.six },
  header: { marginBottom: Spacing.six },
  title: { fontSize: 36, fontWeight: '900', marginBottom: 8, color: '#FFF' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  form: { gap: Spacing.four },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden'
  },
  input: { height: 56, paddingHorizontal: 20, fontSize: 16, color: '#FFF' },
  btn: { height: 56, backgroundColor: '#0274DF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.two },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.six },
  link: { color: '#60A5FA', fontWeight: '800' },
});
