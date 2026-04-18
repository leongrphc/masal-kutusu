import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Colors, BorderRadius } from '../constants/theme';
import { API_BASE_URL } from '../constants/config';
import { supabase } from '../lib/supabase';

interface UserSubscription {
  plan: string;
  status: string;
  credits_remaining: number;
  credits_total: number;
  credits_reset_date: string | null;
  expires_at: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface DashboardNotice {
  tone: 'error' | 'warning' | 'info';
  message: string;
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof TypeError) {
    return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  return 'Kontrol paneli verileri güncellenemedi. Lütfen tekrar deneyin.';
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
}

function getDashboardNotice(subscriptionFailed: boolean, transactionsFailed: boolean): DashboardNotice | null {
  if (subscriptionFailed && transactionsFailed) {
    return {
      tone: 'error',
      message: 'Abonelik ve işlem geçmişi güncellenemedi. Veriler geçici olarak eski görünebilir.',
    };
  }

  if (subscriptionFailed) {
    return {
      tone: 'warning',
      message: 'Abonelik bilgileri güncellenemedi. Paket ve kredi alanları eski veriyi gösterebilir.',
    };
  }

  if (transactionsFailed) {
    return {
      tone: 'warning',
      message: 'İşlem geçmişi güncellenemedi. Son hareketleriniz eksik görünebilir.',
    };
  }

  return null;
}

function getEmptyTransactionMessage(subscription: UserSubscription | null) {
  if (!subscription) {
    return 'İşlem geçmişiniz henüz yüklenmedi.';
  }

  return 'Henüz işlem geçmişiniz bulunmuyor. İlk kullanım veya satın alma sonrasında burada görünecek.';
}

function getUpgradePrompt(subscription: UserSubscription | null) {
  if (!subscription) {
    return 'Paket seçeneklerini görmek için fiyatlandırma ekranını açın.';
  }

  if (subscription.credits_remaining <= 1) {
    return 'Krediniz azalıyor. Daha kesintisiz kullanım için paketinizi yükseltebilirsiniz.';
  }

  return 'İhtiyacınız artarsa paketinizi birkaç dokunuşla yükseltebilirsiniz.';
}

function getRenewalMessage(subscription: UserSubscription | null) {
  if (!subscription) {
    return 'Kredi bilgisi bekleniyor.';
  }

  if (!subscription.credits_reset_date) {
    return 'Kredi yenileme bilgisi şu an görünmüyor.';
  }

  return `Kredileriniz ${new Date(subscription.credits_reset_date).toLocaleDateString('tr-TR')} tarihinde yenilenir.`;
}

function getCreditDisplayValue(value: number | null | undefined) {
  if (value == null) {
    return '—';
  }

  return String(value);
}

function getCreditTotalDisplayValue(subscription: UserSubscription | null) {
  if (!subscription) {
    return '—';
  }

  if (subscription.credits_total <= 0) {
    return 'Bekleniyor';
  }

  return String(subscription.credits_total);
}

function getCreditAvailabilityCopy(subscription: UserSubscription | null) {
  if (!subscription) {
    return 'Abonelik bilgisi yenilenirken kredi detayları kısa süreliğine beklenebilir.';
  }

  if (subscription.credits_total <= 0) {
    return 'Kredi üst sınırı henüz doğrulanmadı. Bilgileri yenileyerek tekrar kontrol edebilirsiniz.';
  }

  return null;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<DashboardNotice | null>(null);

  const loadDashboardData = useCallback(async ({ refreshing: isRefreshing = false } = {}) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setNotice(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSubscription(null);
        setTransactions([]);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      let nextSubscription: UserSubscription | null = null;
      let nextTransactions: Transaction[] = [];
      let subscriptionFailed = false;
      let transactionsFailed = false;

      const subResponse = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
        headers,
      });

      if (subResponse.status === 404) {
        const initResponse = await fetch(`${API_BASE_URL}/api/auth/init-subscription`, {
          method: 'POST',
          headers,
        });

        if (!initResponse.ok) {
          subscriptionFailed = true;
        } else {
          const retryResponse = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
            headers,
          });

          if (retryResponse.ok) {
            const subData = await retryResponse.json();
            nextSubscription = subData.subscription;
          } else {
            subscriptionFailed = true;
          }
        }
      } else if (subResponse.ok) {
        const subData = await subResponse.json();
        nextSubscription = subData.subscription;
      } else {
        subscriptionFailed = true;
      }

      const transResponse = await fetch(`${API_BASE_URL}/api/subscription/transactions?t=${Date.now()}`, {
        headers,
      });

      if (transResponse.ok) {
        const transData = await transResponse.json();
        nextTransactions = transData.transactions;
      } else {
        transactionsFailed = true;
      }

      const nextNotice = getDashboardNotice(subscriptionFailed, transactionsFailed);

      setSubscription(nextSubscription);
      setTransactions(nextTransactions);
      setNotice(nextNotice);

      if (subscriptionFailed && transactionsFailed) {
        setError(nextNotice?.message ?? 'Kontrol paneli verileri güncellenemedi.');
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
      setError(getDashboardErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadDashboardData();
      }
    }, [loadDashboardData, user]),
  );

  const handleCreateStory = () => navigation.navigate('CreateStory');
  const handleOpenHistory = () => navigation.navigate('History');
  const handleOpenPricing = () => navigation.navigate('Pricing');
  const handleRetry = () => void loadDashboardData();
  const handleRefresh = () => void loadDashboardData({ refreshing: true });

  const handleSignOut = async () => {
    await signOut();
  };

  const showInitialLoading = authLoading || (loading && !subscription && transactions.length === 0 && !error);

  if (showInitialLoading) {
    return (
      <GradientBackground style={styles.loadingContainer}>
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>Kontrol paneli hazırlanıyor</Text>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Abonelik ve işlem bilgilerinizi güncelliyoruz.</Text>
        </GlassCard>
      </GradientBackground>
    );
  }

  if (!user) return null;

  const creditsPercentage = subscription && subscription.credits_total > 0
    ? clampPercentage((subscription.credits_remaining / subscription.credits_total) * 100)
    : 0;
  const usageCount = transactions.filter((transaction) => transaction.type === 'usage').length;
  const latestTransactionLabel = transactions[0]
    ? new Date(transactions[0].created_at).toLocaleDateString('tr-TR')
    : 'Henüz yok';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Süresiz';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return Colors.neutral[500];
      case 'basic': return '#3B82F6';
      case 'premium': return '#8B5CF6';
      case 'unlimited': return Colors.warm[600];
      default: return Colors.neutral[500];
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Ücretsiz';
      case 'basic': return 'Temel';
      case 'premium': return 'Premium';
      case 'unlimited': return 'Sınırsız';
      default: return plan;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Satın Alma';
      case 'usage': return 'Kullanım';
      case 'refund': return 'İade';
      case 'bonus': return 'Bonus';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return { bg: 'rgba(34,197,94,0.1)', text: '#16A34A' };
      case 'usage': return { bg: 'rgba(59,130,246,0.1)', text: '#2563EB' };
      case 'refund': return { bg: 'rgba(245,158,11,0.1)', text: '#D97706' };
      default: return { bg: 'rgba(139,92,246,0.1)', text: '#7C3AED' };
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
          />
        )}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Kontrol Paneli</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>Hoş geldiniz, {user.email}</Text>
          </View>
          <View style={styles.headerActions}>
            <Button title="Masal Oluştur" onPress={handleCreateStory} variant="secondary" />
            <Button title="Çıkış" onPress={handleSignOut} variant="secondary" />
          </View>
        </View>

        {error ? (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Bağlantı sorunu</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Tekrar Dene"
              onPress={handleRetry}
              variant="secondary"
              loading={loading}
              style={styles.errorButton}
            />
          </GlassCard>
        ) : null}

        {notice && !error ? (
          <GlassCard
            style={[
              styles.noticeCard,
              notice.tone === 'warning' ? styles.warningCard : styles.infoCard,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                { color: notice.tone === 'warning' ? '#9A3412' : '#1D4ED8' },
              ]}
            >
              {notice.message}
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewCopy}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hesap Özeti</Text>
              <Text style={[styles.overviewSubtext, { color: colors.textSecondary }]}>Son kullanım ve hesabınızın mevcut durumu tek bakışta burada.</Text>
            </View>
            <Button
              title="Yenile"
              onPress={handleRefresh}
              variant="secondary"
              loading={refreshing}
              style={styles.refreshAction}
            />
          </View>

          <View style={styles.overviewMetrics}>
            <View style={[styles.overviewMetricCard, { backgroundColor: 'rgba(255,127,80,0.08)' }]}>
              <Text style={[styles.overviewMetricValue, { color: colors.text }]}>{subscription?.credits_remaining ?? 0}</Text>
              <Text style={[styles.overviewMetricLabel, { color: colors.textSecondary }]}>Kalan kredi</Text>
            </View>
            <View style={[styles.overviewMetricCard, { backgroundColor: 'rgba(107,127,251,0.08)' }]}>
              <Text style={[styles.overviewMetricValue, { color: colors.text }]}>{usageCount}</Text>
              <Text style={[styles.overviewMetricLabel, { color: colors.textSecondary }]}>Toplam kullanım</Text>
            </View>
            <View style={[styles.overviewMetricCard, { backgroundColor: 'rgba(255,189,92,0.08)' }]}>
              <Text style={[styles.overviewMetricValue, { color: colors.text }]}>{latestTransactionLabel}</Text>
              <Text style={[styles.overviewMetricLabel, { color: colors.textSecondary }]}>Son işlem</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mevcut Paket</Text>
              <View style={[styles.planBadge, { backgroundColor: subscription ? getPlanColor(subscription.plan) : Colors.neutral[500] }]}>
                <Text style={styles.planBadgeText}>
                  {subscription ? getPlanName(subscription.plan) : 'Yükleniyor...'}
                </Text>
              </View>
            </View>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>{getUpgradePrompt(subscription)}</Text>
            <TouchableOpacity onPress={handleOpenPricing}>
              <Text style={styles.upgradeLink}>Paketi Yükselt →</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Kalan Kredi</Text>
            <View style={styles.creditRow}>
              <Text style={styles.creditBig}>{getCreditDisplayValue(subscription?.credits_remaining)}</Text>
              <Text style={[styles.creditTotal, { color: colors.textMuted }]}>/ {getCreditTotalDisplayValue(subscription)}</Text>
            </View>
            {getCreditAvailabilityCopy(subscription) ? (
              <Text style={[styles.helperText, { color: colors.textMuted }]}>{getCreditAvailabilityCopy(subscription)}</Text>
            ) : null}
            <View style={[styles.progressTrack, { backgroundColor: colors.inputBorder }]}>
              <LinearGradient
                colors={[Colors.primary[500], Colors.warm[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${creditsPercentage}%` as any }]}
              />
            </View>
            <Text style={[styles.resetDate, { color: colors.textMuted }]}>{getRenewalMessage(subscription)}</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Abonelik Durumu</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: subscription?.status === 'active' ? Colors.success : Colors.error },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {subscription?.status === 'active' ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
            <Text style={[styles.resetDate, { color: colors.textMuted }]}>
              {subscription?.expires_at ? `Bitiş: ${formatDate(subscription.expires_at)}` : 'Süresiz'}
            </Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hızlı İşlemler</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={handleCreateStory}
              style={[styles.actionCard, { backgroundColor: 'rgba(255,127,80,0.08)' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary[500] }]}>
                <Text style={{ fontSize: 20 }}>✨</Text>
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Masal Oluştur</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Yeni bir hikaye yarat</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenPricing}
              style={[styles.actionCard, { backgroundColor: 'rgba(107,127,251,0.08)' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.secondary[500] }]}>
                <Text style={{ fontSize: 20 }}>💎</Text>
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Paket Yükselt</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Daha fazla masal</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenHistory}
              style={[styles.actionCard, { backgroundColor: 'rgba(255,189,92,0.08)' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warm[500] }]}>
                <Text style={{ fontSize: 20 }}>🕘</Text>
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Masal Geçmişi</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Önceki masallarına dön</Text>
              </View>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem Geçmişi</Text>
          {transactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{getEmptyTransactionMessage(subscription)}</Text>
          ) : (
            transactions.map((t) => {
              const typeColor = getTypeColor(t.type);
              return (
                <View key={t.id} style={[styles.transactionRow, { borderBottomColor: colors.surfaceBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.transDesc, { color: colors.text }]}>{t.description}</Text>
                    <View style={styles.transMetaRow}>
                      <Text style={[styles.transDate, { color: colors.textMuted }]}>
                        {new Date(t.created_at).toLocaleDateString('tr-TR')}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>
                          {getTypeLabel(t.type)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.transAmount, { color: t.amount > 0 ? Colors.success : Colors.error }]}>
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </Text>
                </View>
              );
            })
          )}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingText: { marginTop: 0, fontSize: 14, textAlign: 'center' },

  header: { marginBottom: 16 },
  errorCard: { marginBottom: 16, gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Colors.error },
  errorText: { fontSize: 14, lineHeight: 20, color: Colors.error },
  errorButton: { alignSelf: 'flex-start' },
  noticeCard: { marginBottom: 16 },
  warningCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.18)',
    borderWidth: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
  },
  noticeText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  overviewCard: { marginBottom: 16, gap: 16 },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  overviewCopy: { flex: 1 },
  overviewSubtext: { fontSize: 13 },
  refreshAction: { alignSelf: 'flex-start' },
  overviewMetrics: { flexDirection: 'row', gap: 10 },
  overviewMetricCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  overviewMetricValue: { fontSize: 16, fontWeight: '700' },
  overviewMetricLabel: { fontSize: 12, fontWeight: '500' },

  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  statsGrid: { gap: 12, marginBottom: 16 },
  statCard: { padding: 20 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, fontWeight: '600' },
  helperText: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  planBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  upgradeLink: { color: Colors.primary[500], fontSize: 13, fontWeight: '600' },

  creditRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  creditBig: { fontSize: 36, fontWeight: '700', color: Colors.primary[500] },
  creditTotal: { fontSize: 16 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  resetDate: { fontSize: 11 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  actionsCard: { marginBottom: 16 },
  quickActions: { gap: 12 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: BorderRadius.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionSub: { fontSize: 12 },

  emptyText: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transDesc: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  transMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transDate: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  transAmount: { fontSize: 15, fontWeight: '600' },
});
