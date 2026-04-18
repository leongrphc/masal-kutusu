import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CreateStoryParams } from '../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { AudioPlayer } from '../components/AudioPlayer';
import { Colors, BorderRadius } from '../constants/theme';
import { API_BASE_URL, EXAMPLE_TOPICS } from '../constants/config';
import { saveStoryToHistory } from '../lib/storyHistory';
import { fetchCurrentSubscription } from '../lib/subscription';
import { trackEvent } from '../lib/analytics';

interface StoryResult {
  story: string;
  audioBase64: string;
  mimeType: string;
  meta?: {
    totalTime: number;
    storyGenerationTime: number;
    ttsGenerationTime: number;
    storyLength: number;
  };
}

interface Subscription {
  plan: 'free' | 'basic' | 'premium' | 'unlimited';
  credits_remaining: number;
  credits_total: number;
}

function getGenerationStatusMessage(result: StoryResult | null, loading: boolean) {
  if (!loading) {
    return null;
  }

  if (result?.audioBase64) {
    return 'Ses hazırlanıyor...';
  }

  if (result?.story) {
    return 'Masal tamamlandı, ses ekleniyor...';
  }

  return 'Masal kurgulanıyor...';
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [topic, setTopic] = useState('');
  const [ageRange, setAgeRange] = useState<'3-5' | '6-8'>('3-5');
  const [length, setLength] = useState<'short' | 'medium'>('short');
  const [theme, setTheme] = useState<'friendship' | 'courage' | 'sharing' | 'emotions'>('friendship');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const appliedPrefillRef = useRef<string | null>(null);

  const createStoryParams = route.params as CreateStoryParams | undefined;
  const creditsRemaining = subscription?.credits_remaining ?? 0;
  const willUseCredit = Boolean(user && session && topic.trim());
  const generationHint = getGenerationStatusMessage(result, loading) ?? generationStatus;

  useEffect(() => {
    if (!createStoryParams) {
      return;
    }

    const prefillKey = JSON.stringify(createStoryParams);
    if (appliedPrefillRef.current === prefillKey) {
      return;
    }

    appliedPrefillRef.current = prefillKey;

    if (createStoryParams.topic) {
      setTopic(createStoryParams.topic);
    }

    if (createStoryParams.ageRange) {
      setAgeRange(createStoryParams.ageRange);
    }

    if (createStoryParams.length) {
      setLength(createStoryParams.length);
    }

    if (createStoryParams.theme) {
      setTheme(createStoryParams.theme);
      setShowAdvanced(true);
    }

    navigation.setParams?.(undefined);
  }, [createStoryParams, navigation]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) {
        setLoadingSubscription(false);
        return;
      }

      try {
        const nextSubscription = await fetchCurrentSubscription<Subscription>(session.access_token);
        setSubscription(nextSubscription);
      } catch (err) {
        console.error('Subscription fetch error:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };
    fetchSubscription();
  }, [session]);

  const handleGenerate = async () => {
    if (!user || !session) {
      trackEvent('generate_blocked_not_authenticated');
      setError('Masal üretmek için giriş yapmalısınız. Hazır olduğunuzda giriş ekranına geçebilirsiniz.');
      return;
    }

    if (!topic.trim()) {
      setError('Lütfen bir konu girin.');
      return;
    }

    if (subscription && subscription.credits_remaining <= 0) {
      trackEvent('upgrade_modal_opened', { source: 'preflight_generate', creditsRemaining: subscription.credits_remaining });
      setGenerationStatus(null);
      setShowUpgradeModal(true);
      return;
    }

    trackEvent('generate_started', { ageRange, length, theme, hasSession: Boolean(session) });
    setLoading(true);
    setError(null);
    setGenerationStatus('Masal kurgulanıyor...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topic, ageRange, length, theme }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsUpgrade) {
          trackEvent('upgrade_modal_opened', { source: 'generate_response' });
          setGenerationStatus(null);
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data.error || 'Bir hata oluştu');
      }

      setGenerationStatus('Masal tamamlandı, ses ekleniyor...');
      setResult(data);
      trackEvent('generate_succeeded', {
        storyLength: data.meta?.storyLength,
        totalTimeMs: data.meta?.totalTime,
        storyGenerationTimeMs: data.meta?.storyGenerationTime,
        ttsGenerationTimeMs: data.meta?.ttsGenerationTime,
      });
      setGenerationStatus('Masalınız hazır. Sesli anlatımı başlatabilirsiniz.');
      void saveStoryToHistory(user.id, {
        topic: topic.trim(),
        story: data.story,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType,
        ageRange,
        length,
        theme,
      }).then((savedEntry) => {
        if (!savedEntry.audioBase64 && data.audioBase64) {
          console.warn('Story history audio omitted to keep local storage lighter.');
        }
      }).catch((historyError) => {
        console.error('Story history save error:', historyError);
      });

      // Abonelik bilgisini güncelle
      const nextSubscription = await fetchCurrentSubscription<Subscription>(session.access_token);
      setSubscription(nextSubscription);
    } catch (err: any) {
      trackEvent('generate_failed', { message: err?.message ?? 'unknown_error' });
      setGenerationStatus(null);
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyStory = async () => {
    if (result?.story) {
      await Clipboard.setStringAsync(result.story);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const themeOptions = [
    { value: 'friendship', label: '🤝 Arkadaşlık' },
    { value: 'courage', label: '🦁 Cesaret' },
    { value: 'sharing', label: '🎁 Paylaşmak' },
    { value: 'emotions', label: '❤️ Duygular' },
  ];

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav Bar */}
        <View style={styles.navBar}>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>📚</Text>
            <Text style={styles.logoText}>Masal Kutusu</Text>
          </View>
          <View style={styles.navActions}>
            {/* Theme Toggle */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeBtn, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel={mode === 'light' ? 'Karanlık temaya geç' : 'Aydınlık temaya geç'}
            >
              <Text style={{ fontSize: 18 }}>{mode === 'light' ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>

            {user ? (
              <>
                {!loadingSubscription && subscription && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AppTabs', { screen: 'Dashboard' })}
                    style={[styles.creditBadge, { backgroundColor: colors.surface }]}
                  >
                    <Text style={styles.creditIcon}>💰</Text>
                    <Text style={[styles.creditText, { color: colors.textSecondary }]}>
                      {subscription.credits_remaining} kredi
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('AppTabs', { screen: 'Dashboard' })}
                  accessibilityRole="button"
                  accessibilityLabel="Hesap ekranını aç"
                >
                  <LinearGradient
                    colors={[Colors.primary[500], Colors.warm[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accountBtn}
                  >
                    <Text style={styles.accountBtnText}>Hesap</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={[styles.navBtn, { backgroundColor: colors.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel="Giriş ekranını aç"
                >
                  <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Giriş</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  accessibilityRole="button"
                  accessibilityLabel="Kayıt ol ekranını aç"
                >
                  <LinearGradient
                    colors={[Colors.primary[500], Colors.warm[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accountBtn}
                  >
                    <Text style={styles.accountBtnText}>Kayıt Ol</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📚</Text>
          <Text style={styles.headerTitle}>Masal Kutusu</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Çocuğunuz için yapay zeka destekli, sesli masallar oluşturun
          </Text>
          <LinearGradient
            colors={[Colors.primary[500], Colors.warm[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>⭐ Yapay zeka destekli, çocuklara özel sesli masallar.</Text>
          </LinearGradient>
        <Text style={[styles.headerTrustCopy, { color: colors.textMuted }]}>Yaşa uygun dil, reklamsız deneyim ve hızlı sesli anlatım tek akışta hazırlanır.</Text>
        </View>

        {/* Input Card */}
        <GlassCard style={styles.inputCard}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Masal Konusu</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Örn: Aslan ve ördek arkadaşlığı"
            placeholderTextColor={Colors.neutral[400]}
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={handleGenerate}
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            }]}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {topic.length}/120 karakter
          </Text>

          {/* Örnek Konular */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Hızlı Örnekler
          </Text>
          <View style={styles.chipContainer}>
            {EXAMPLE_TOPICS.map((example) => (
              <TouchableOpacity
                key={example}
                onPress={() => setTopic(example)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: topic === example ? Colors.primary[500] : colors.surface,
                    borderColor: topic === example ? Colors.primary[500] : colors.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: topic === example ? Colors.white : colors.textSecondary },
                  ]}
                >
                  {example}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Uzunluk & Yaş Aralığı */}
          <View style={styles.settingsGrid}>
            <View style={styles.settingCol}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Uzunluk</Text>
              <View style={styles.toggleRow}>
                {(['short', 'medium'] as const).map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setLength(val)}
                    style={[styles.toggleBtn, length === val && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, length === val && styles.toggleTextActive]}>
                      {val === 'short' ? '📖 Kısa' : '📚 Orta'}
                    </Text>
                    <Text style={[styles.toggleSub, length === val && styles.toggleSubActive]}>
                      {val === 'short' ? '~2 dakika' : '~3-4 dakika'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingCol}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Yaş Aralığı</Text>
              <View style={styles.toggleRow}>
                {(['3-5', '6-8'] as const).map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setAgeRange(val)}
                    style={[styles.toggleBtn, ageRange === val && styles.toggleBtnActiveOrange]}
                  >
                    <Text style={[styles.toggleText, ageRange === val && styles.toggleTextActive]}>
                      {val === '3-5' ? '🧒 3-5 yaş' : '👧 6-8 yaş'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Gelişmiş Seçenekler */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            style={styles.advancedToggle}
          >
            <Text style={[styles.advancedText, { color: colors.textSecondary }]}>
              {showAdvanced ? '▲' : '▼'} Gelişmiş Seçenekler
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedPanel}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🎨 Tema</Text>
              <View style={styles.chipContainer}>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTheme(opt.value as any)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme === opt.value ? Colors.primary[500] : colors.surface,
                        borderColor: theme === opt.value ? Colors.primary[500] : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme === opt.value ? Colors.white : colors.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {user && subscription ? (
            <View style={styles.creditHintBox}>
              <Text style={[styles.creditHintTitle, { color: colors.text }]}>Bu işlem 1 kredi kullanır</Text>
              <Text style={[styles.creditHintText, { color: colors.textSecondary }]}>Şu an hesabınızda {creditsRemaining} kredi var. Masal oluşturulduktan sonra kalan kredi bilginiz otomatik güncellenecek.</Text>
              {creditsRemaining <= 0 ? (
                <Text style={styles.creditWarningText}>Yeni masal oluşturmak için önce paketinizi yükseltmeniz gerekiyor.</Text>
              ) : null}
            </View>
          ) : null}

          {/* Generate Button */}
          <Button
            title={loading ? 'Masal Oluşturuluyor...' : 'Masalı Oluştur ve Seslendir ▶️'}
            onPress={handleGenerate}
            loading={loading}
            disabled={!topic.trim()}
            fullWidth
            style={{ marginTop: 16 }}
          />

          {generationHint ? (
            <View style={styles.progressBox}>
              <ActivityIndicator size="small" color={Colors.primary[500]} />
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>{generationHint}</Text>
            </View>
          ) : null}

          {!user && willUseCredit ? (
            <Text style={[styles.preAuthHint, { color: colors.textMuted }]}>Masal üretmek için giriş yaptığınızda kredi kullanımı ve kalan hakkınız burada görünür.</Text>
          ) : null}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              {!user ? (
                <Button
                  title="Giriş Ekranına Git"
                  onPress={() => navigation.navigate('Login')}
                  variant="secondary"
                  fullWidth
                  style={{ marginTop: 10 }}
                />
              ) : null}
            </View>
          )}
        </GlassCard>

        {/* Loading Skeleton */}
        {loading && (
          <GlassCard style={{ marginTop: 16 }}>
            <View style={styles.skeleton} />
            <View style={[styles.skeleton, { width: '80%', marginTop: 8 }]} />
            <View style={[styles.skeleton, { width: '60%', marginTop: 8 }]} />
          </GlassCard>
        )}

        {/* Result */}
        {result && !loading && (
          <View style={{ gap: 16, marginTop: 16 }}>
            <GlassCard>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Masalınız Hazır! 📖</Text>
                <TouchableOpacity onPress={handleCopyStory} style={styles.copyBtn}>
                  <Text style={styles.copyBtnText}>{copied ? '✅ Kopyalandı' : '📋 Kopyala'}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.storyScroll} nestedScrollEnabled>
                <Text style={[styles.storyText, { color: colors.text }]}>{result.story}</Text>
              </ScrollView>
              {result.meta && (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    ⏱ Toplam: {(result.meta.totalTime / 1000).toFixed(1)}s
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    Hikaye: {result.meta.storyLength} karakter
                  </Text>
                </View>
              )}
            </GlassCard>

            <AudioPlayer audioBase64={result.audioBase64} mimeType={result.mimeType} />

            <Button
              title="🔄 Yeni Masal Üret"
              onPress={handleGenerate}
              variant="secondary"
              fullWidth
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>🛡 Çocuk güvenliği önceliğimiz</Text>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>🔒 Verileriniz saklanmaz</Text>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>💰 Her gün ücretsiz 1 hikaye</Text>
          </View>
          <Text style={[styles.footerSub, { color: colors.textMuted }]}>
            Her masal benzersizdir ve çocuğunuza özeldir.
          </Text>
        </View>

        {/* Upgrade Modal */}
        <Modal visible={showUpgradeModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>⚡</Text>
                </View>
                <Text style={styles.modalTitle}>Kredi Limitine Ulaştınız</Text>
                <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                  Daha fazla masal oluşturmak için paketinizi yükseltin
                </Text>
                <Button
                  title="Paketleri Görüntüle"
                  onPress={() => {
                    trackEvent('upgrade_modal_cta_clicked', { source: 'home_modal' });
                    setShowUpgradeModal(false);
                    navigation.navigate('Pricing');
                  }}
                  fullWidth
                />
                <Button
                  title="Kapat"
                  onPress={() => setShowUpgradeModal(false)}
                  variant="secondary"
                  fullWidth
                  style={{ marginTop: 8 }}
                />
              </View>
            </GlassCard>
          </View>
        </Modal>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
    flexWrap: 'wrap',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  logoEmoji: { fontSize: 28 },
  logoText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary[500],
    flexShrink: 1,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 3,
    maxWidth: 56,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  creditIcon: { fontSize: 12 },
  creditText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  accountBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minHeight: 36,
    justifyContent: 'center',
  },
  accountBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minHeight: 36,
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 13, fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: 24 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary[500],
    marginBottom: 8,
  },
  headerSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
  headerTrustCopy: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  badgeText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  inputCard: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  creditHintBox: {
    backgroundColor: 'rgba(255,127,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,127,80,0.18)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginTop: 16,
    gap: 4,
  },
  creditHintTitle: { fontSize: 13, fontWeight: '700' },
  creditHintText: { fontSize: 12, lineHeight: 18 },
  creditWarningText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 4,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  progressText: { fontSize: 13, lineHeight: 18, flex: 1 },
  preAuthHint: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  input: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },

  settingsGrid: { gap: 16, marginTop: 16 },
  settingCol: {},
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleBtnActive: {
    backgroundColor: Colors.secondary[500],
    shadowColor: Colors.secondary[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleBtnActiveOrange: {
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  toggleTextActive: { color: Colors.white },
  toggleSub: { fontSize: 11, color: Colors.neutral[500], marginTop: 2 },
  toggleSubActive: { color: 'rgba(255,255,255,0.8)' },

  advancedToggle: { paddingVertical: 8, marginTop: 8 },
  advancedText: { fontSize: 13, fontWeight: '600' },
  advancedPanel: { marginTop: 8, gap: 8 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginTop: 8,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  skeleton: {
    height: 16,
    backgroundColor: Colors.neutral[200],
    borderRadius: 8,
    width: '100%',
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  copyBtnText: { fontSize: 12, fontWeight: '600', color: Colors.neutral[700] },

  storyScroll: { maxHeight: 300 },
  storyText: { fontSize: 16, lineHeight: 26 },

  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  metaText: { fontSize: 12 },

  footer: { marginTop: 40, alignItems: 'center', gap: 8 },
  footerRow: { gap: 8, alignItems: 'center' },
  footerText: { fontSize: 13 },
  footerSub: { fontSize: 11, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 400 },
  modalContent: { alignItems: 'center', gap: 12 },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.warm[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.primary[500] },
  modalDesc: { fontSize: 14, textAlign: 'center' },
});
