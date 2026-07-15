import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { identifier, password });
      const { token, customer } = response.data;
      
      setAuth(token, customer);
      router.back();
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Connexion</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Bienvenue sur Riwaya</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            placeholder="Email ou Téléphone"
            placeholderTextColor={colors.textSecondary}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.btn, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Se connecter</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>Vous n'avez pas de compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.link}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.five, justifyContent: 'center' },
  header:    { marginBottom: Spacing.six },
  title:     { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle:  { fontSize: 16 },
  form:      { gap: Spacing.four },
  input:     { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
  btn:       { height: 50, backgroundColor: '#0274DF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.two },
  btnText:   { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.six },
  link:      { color: '#0274DF', fontWeight: '700' },
});
