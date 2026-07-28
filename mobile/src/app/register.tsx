import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18nStore } from '@/store/useI18nStore';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useI18nStore();
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert(t('error'), t('fill_req_fields_reg'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', { fullName, phone, email, password });
      const { token, customer } = response.data;
      
      setAuth(token, customer);
      router.back(); // Revenir d'où on vient
    } catch (error: any) {
      console.log('Register Error:', error.response?.data || error.message);
      Alert.alert(t('error'), error.response?.data?.error || t('reg_error'));
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
                <Text style={styles.title}>{t('register_title')}</Text>
                <Text style={styles.subtitle}>{t('register_subtitle')}</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('fullname_reg')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('phone_opt')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('email')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={email}
                    onChangeText={setEmail}
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
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{t('create_my_account')}</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{t('already_have_account')} </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.link}>{t('login_link')}</Text>
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
