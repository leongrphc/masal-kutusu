import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Colors, BorderRadius } from '../constants/theme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signIn } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Giriş başarısız');
      setLoading(false);
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.logo}>📚 Masal Kutusu</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Hoş Geldiniz</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Hesabınıza giriş yapın
          </Text>
        </View>

        <GlassCard>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            placeholderTextColor={Colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Şifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.neutral[400]}
            secureTextEntry
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />

          <Button
            title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email || !password}
            fullWidth
            style={{ marginTop: 24 }}
          />

          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Hesabınız yok mu?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkAction}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 10,
  },
  backText: { fontSize: 15, fontWeight: '600' },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: { fontSize: 14 },
  linkAction: {
    color: Colors.primary[500],
    fontWeight: '600',
    fontSize: 14,
  },
});
