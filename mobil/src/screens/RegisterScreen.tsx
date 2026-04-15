import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Colors, BorderRadius } from '../constants/theme';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName || !trimmedEmail || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    const { error } = await signUp(trimmedEmail, password, trimmedFullName);

    if (error) {
      setError(error.message || 'Kayıt başarısız');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.logo}>📚 Masal Kutusu</Text>
          </View>

          <GlassCard>
            <View style={styles.successContent}>
              <View style={styles.emailIconContainer}>
                <Text style={styles.emailIcon}>📧</Text>
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                E-postanızı Kontrol Edin
              </Text>
              <View style={styles.successInfoBox}>
                <Text style={styles.successInfoTitle}>Kayıt işleminiz başarıyla tamamlandı!</Text>
                <Text style={styles.successInfoText}>
                  <Text style={{ fontWeight: '700' }}>{email}</Text> adresine bir onay maili gönderdik.
                </Text>
              </View>

              <View style={styles.stepList}>
                {['E-posta gelen kutunuzu kontrol edin', 'E-postadaki onay linkine tıklayın', 'Hesabınız onaylandıktan sonra giriş yapabilirsiniz'].map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepCircle}>
                      <Text style={styles.stepNum}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  💡 E-postayı bulamadınız mı? Spam veya gereksiz klasörünü kontrol edin.
                </Text>
              </View>

              <Button
                title="Giriş Sayfasına Dön"
                onPress={() => navigation.navigate('Login')}
                fullWidth
              />
            </View>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.logo}>📚 Masal Kutusu</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Hesap Oluştur</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ücretsiz hesabınızı oluşturun
          </Text>
        </View>

        <GlassCard>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ahmet Yılmaz"
            placeholderTextColor={Colors.neutral[400]}
            returnKeyType="next"
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            placeholderTextColor={Colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
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
            returnKeyType="next"
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>En az 6 karakter</Text>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Şifre Tekrar</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.neutral[400]}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />

          <Button
            title={loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!fullName || !email || !password || !confirmPassword}
            fullWidth
            style={{ marginTop: 24 }}
          />

          <Text style={[styles.helperText, { color: colors.textMuted }]}>Kayıt sonrası e-posta onayı ile hesabınızı aktifleştirip giriş yapabilirsiniz.</Text>

          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Zaten hesabınız var mı?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkAction}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              Kayıt olarak Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursunuz.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    marginBottom: 24,
    alignSelf: 'flex-start',
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
  subtitle: { fontSize: 15 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
  },
  hint: { fontSize: 11, marginTop: 4 },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: { fontSize: 14 },
  linkAction: { color: Colors.primary[500], fontWeight: '600', fontSize: 14 },
  termsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  termsText: { fontSize: 11, textAlign: 'center' },

  successContent: { alignItems: 'center', gap: 12 },
  emailIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emailIcon: { fontSize: 28 },
  successTitle: { fontSize: 22, fontWeight: '700' },
  successInfoBox: {
    backgroundColor: 'rgba(255,127,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,127,80,0.3)',
    borderRadius: BorderRadius.md,
    padding: 16,
    width: '100%',
  },
  successInfoTitle: { fontSize: 13, fontWeight: '600', color: Colors.primary[800], marginBottom: 4 },
  successInfoText: { fontSize: 13, color: Colors.primary[700] },
  stepList: { gap: 12, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 11, fontWeight: '700', color: Colors.primary[600] },
  stepText: { flex: 1, fontSize: 13 },
  tipBox: {
    backgroundColor: 'rgba(245,166,35,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    width: '100%',
  },
  tipText: { fontSize: 12, color: '#92400E' },
});
