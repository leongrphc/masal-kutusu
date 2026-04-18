import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Colors, BorderRadius } from '../constants/theme';
import {
  SUBSCRIPTION_PLANS,
  PLAN_HIERARCHY,
  API_BASE_URL,
  type SubscriptionPlanId,
  type PaidSubscriptionPlanId,
} from '../constants/config';
import {
  getAllBillingAvailability,
  restoreBillingPurchases,
  startPlanPurchase,
  type BillingPlanAvailability,
} from '../lib/billing';
import { fetchCurrentSubscription } from '../lib/subscription';
import { trackEvent } from '../lib/analytics';

interface Subscription {
  plan: SubscriptionPlanId;
  status: string;
}

interface FeedbackState {
  type: 'error' | 'info';
  title: string;
  message: string;
}

function getBillingFeedback(result: { status: 'blocked' | 'cancelled' | 'started' | 'error'; message: string }): FeedbackState {
  switch (result.status) {
    case 'started':
      return {
        type: 'info',
        title: 'Üyelik güncellendi',
        message: result.message,
      };
    case 'cancelled':
      return {
        type: 'info',
        title: 'İşlem iptal edildi',
        message: result.message,
      };
    case 'blocked':
      return {
        type: 'error',
        title: 'Satın alma şu anda tamamlanamıyor',
        message: result.message,
      };
    default:
      return {
        type: 'error',
        title: 'Bir sorun oluştu',
        message: result.message,
      };
  }
}

function getFeedbackCardStyle(type: FeedbackState['type']) {
  return type === 'error'
    ? {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.3)',
        titleColor: '#B91C1C',
        textColor: '#DC2626',
      }
    : {
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderColor: 'rgba(59,130,246,0.25)',
        titleColor: '#1D4ED8',
        textColor: '#1D4ED8',
      };
}

function getPlanSuccessLabel(planId: PaidSubscriptionPlanId) {
  switch (planId) {
    case 'basic':
      return 'Temel paketiniz aktif edildi.';
    case 'premium':
      return 'Premium paketiniz aktif edildi.';
    case 'unlimited':
      return 'Sınırsız paketiniz aktif edildi.';
    default:
      return 'Üyeliğiniz güncellendi.';
  }
}

function getRestoreSuccessLabel() {
  return 'Store satın alımlarınız hesabınıza yeniden uygulandı.';
}

function getSubscriptionManagementUrl() {
  if (Platform.OS === 'ios') {
    return 'itms-apps://apps.apple.com/account/subscriptions';
  }

  if (Platform.OS === 'android') {
    return 'https://play.google.com/store/account/subscriptions';
  }

  return null;
}

function getSubscriptionManagementLabel() {
  if (Platform.OS === 'ios') {
    return 'App Store Aboneliklerini Aç';
  }

  if (Platform.OS === 'android') {
    return 'Google Play Aboneliklerini Aç';
  }

  return 'Mağaza Aboneliklerini Aç';
}

function getPricingLoadErrorMessage(subscriptionFailed: boolean, billingFailed: boolean) {
  if (subscriptionFailed && billingFailed) {
    return 'Üyelik ve mağaza bilgileri güncellenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (subscriptionFailed) {
    return 'Üyelik bilgileri güncellenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  return 'Mağaza bilgileri güncellenemedi. Lütfen tekrar deneyin.';
}

function getPaidPlanCta(planId: PaidSubscriptionPlanId) {
  switch (planId) {
    case 'basic':
      return 'Temel Pakete Geç';
    case 'premium':
      return 'Premium’a Geç';
    case 'unlimited':
      return 'Sınırsız’a Geç';
    default:
      return 'Store ile Satın Al';
  }
}

function getPlanTrustCopy(planId: PaidSubscriptionPlanId) {
  if (planId === 'basic') {
    return 'Bugün seçtiğiniz paket store üzerinden başlatılır. Yenileme ve iptal işlemlerini daha sonra mağaza hesabınızdan yönetebilirsiniz.';
  }

  if (planId === 'premium') {
    return 'En çok tercih edilen plan. Ödeme store üzerinden güvenli şekilde alınır; yenileme ve iptal ayarları mağaza hesabınızdan yönetilir.';
  }

  return 'Yüksek kullanım için tasarlandı. Satın alma, yenileme ve iptal işlemleri uygulama mağazanız üzerinden güvenli şekilde yönetilir.';
}

export default function PricingScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingAvailability, setBillingAvailability] = useState<
    Partial<Record<PaidSubscriptionPlanId, BillingPlanAvailability>>
  >({});

  const fetchSubscription = useCallback(async () => {
    if (!session) {
      return null;
    }

    return fetchCurrentSubscription<Subscription>(session.access_token);
  }, [session]);

  const fetchBillingAvailability = useCallback(async (forceRefresh = false) => {
    return getAllBillingAvailability({ forceRefresh });
  }, []);

  const loadScreenData = useCallback(async ({ refreshing: isRefreshing = false, forceRefresh = false } = {}) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setScreenLoading(true);
      }
      setLoadError(null);

      const [subscriptionResult, availabilityResult] = await Promise.allSettled([
        fetchSubscription(),
        fetchBillingAvailability(forceRefresh),
      ]);

      if (subscriptionResult.status === 'fulfilled') {
        setSubscription(subscriptionResult.value);
      } else {
        console.error('Subscription fetch error:', subscriptionResult.reason);
      }

      if (availabilityResult.status === 'fulfilled') {
        setBillingAvailability(availabilityResult.value);
      } else {
        console.error('Billing availability error:', availabilityResult.reason);
      }

      if (subscriptionResult.status === 'rejected' || availabilityResult.status === 'rejected') {
        setLoadError(
          getPricingLoadErrorMessage(
            subscriptionResult.status === 'rejected',
            availabilityResult.status === 'rejected',
          ),
        );
      }
    } catch (err) {
      console.error('Pricing screen load error:', err);
      setLoadError('Paket bilgileri güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setScreenLoading(false);
      setRefreshing(false);
    }
  }, [fetchBillingAvailability, fetchSubscription]);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData();
    }, [loadScreenData]),
  );

  const refreshScreenData = useCallback(async (forceRefresh = false) => {
    await loadScreenData({ forceRefresh });
  }, [loadScreenData]);

  const handleRefresh = () => void loadScreenData({ refreshing: true, forceRefresh: true });
  const handleRetry = () => void loadScreenData({ forceRefresh: true });

  const handlePurchase = async (planId: SubscriptionPlanId) => {
    if (!user || !session) {
      navigation.navigate('Login');
      return;
    }

    if (planId === 'free') {
      return;
    }

    setLoading(planId);
    setFeedback(null);
    trackEvent('purchase_started', { planId });

    try {
      const result = await startPlanPurchase(planId);
      trackEvent('purchase_result', { planId, status: result.status });
      setFeedback(
        result.status === 'started'
          ? {
              type: 'info',
              title: getPlanSuccessLabel(planId),
              message: result.message,
            }
          : getBillingFeedback(result),
      );

      await refreshScreenData(true);

      if (result.status === 'started') {
        navigation.goBack();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRestorePurchases = async () => {
    if (!user || !session) {
      navigation.navigate('Login');
      return;
    }

    setLoading('restore');
    setFeedback(null);
    trackEvent('restore_started');

    try {
      const result = await restoreBillingPurchases();
      trackEvent('restore_result', { status: result.status });
      setFeedback(
        result.status === 'started'
          ? {
              type: 'info',
              title: getRestoreSuccessLabel(),
              message: result.message,
            }
          : getBillingFeedback(result),
      );

      await refreshScreenData(true);
    } finally {
      setLoading(null);
    }
  };

  const handleOpenSubscriptionManagement = async () => {
    const url = getSubscriptionManagementUrl();

    if (!url) {
      setFeedback({
        type: 'error',
        title: 'Bu cihazda kullanılamıyor',
        message: 'Abonelik yönetimi bağlantısı yalnızca App Store veya Google Play üzerinden açılabilir.',
      });
      return;
    }

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      setFeedback({
        type: 'error',
        title: 'Mağaza açılamadı',
        message: 'Abonelik ayarları açılamadı. Lütfen App Store veya Google Play hesabınızdan manuel olarak kontrol edin.',
      });
      return;
    }

    trackEvent('subscription_management_opened', { platform: Platform.OS });
    await Linking.openURL(url);
  };

  const getPlanActionLabel = (
    planId: SubscriptionPlanId,
    isCurrent: boolean,
    isDowngrade: boolean,
    availability?: BillingPlanAvailability,
  ) => {
    if (screenLoading && planId !== 'free') {
      return 'Mağaza Kontrol Ediliyor';
    }

    if (isCurrent) {
      return 'Mevcut Paket';
    }

    if (isDowngrade) {
      return 'Düşüş Desteklenmiyor';
    }

    if (planId === 'free') {
      return user ? 'Ücretsiz Başla' : 'Giriş Yap';
    }

    if (!availability?.canPurchase) {
      return availability?.blockReason === 'unsupported-platform'
        ? 'Native Build Gerekli'
        : 'Yakında Aktif';
    }

    if (!user) {
      return 'Giriş Yap ve Satın Al';
    }

    return getPaidPlanCta(planId as PaidSubscriptionPlanId);
  };

  const currentPlanName = subscription ? SUBSCRIPTION_PLANS[subscription.plan].name : null;

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
          />
        )}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Geri Dön</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Üyelik Paketleri</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>İhtiyacınıza göre plan seçin. Ücretli planlar artık native store billing altyapısı üzerinden hazırlanıyor.</Text>
        </View>

        {loadError ? (
          <GlassCard style={styles.loadErrorCard}>
            <Text style={styles.loadErrorTitle}>Bağlantı sorunu</Text>
            <Text style={styles.loadErrorText}>{loadError}</Text>
            <Button
              title="Tekrar Dene"
              onPress={handleRetry}
              variant="secondary"
              loading={screenLoading}
              style={styles.retryButton}
            />
          </GlassCard>
        ) : null}

        <GlassCard style={styles.summaryCard}>
          {screenLoading ? (
            <View style={styles.summaryLoadingState}>
              <ActivityIndicator size="small" color={Colors.primary[500]} />
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Paket ve mağaza bilgileriniz yükleniyor...</Text>
            </View>
          ) : user && subscription ? (
            <>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryHeaderCopy}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Mevcut Paketiniz</Text>
                  <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Şu an {currentPlanName} planını kullanıyorsunuz.</Text>
                </View>
                <View style={[styles.summaryBadge, { backgroundColor: Colors.primary[500] }]}>
                  <Text style={styles.summaryBadgeText}>{currentPlanName}</Text>
                </View>
              </View>
              <Text style={[styles.summaryHelper, { color: colors.textMuted }]}>Yükseltme store satın alma akışıyla ilerleyecek. Daha düşük pakete geçiş bu ekranda kapalıdır.</Text>
              <View style={styles.summaryActions}>
                <Button
                  title="Bilgileri Yenile"
                  onPress={handleRefresh}
                  variant="secondary"
                  loading={refreshing}
                  style={styles.summaryActionButton}
                />
                <TouchableOpacity
                  onPress={handleRestorePurchases}
                  disabled={loading === 'restore'}
                  style={[
                    styles.restoreButton,
                    { borderColor: colors.inputBorder, backgroundColor: colors.surface },
                  ]}
                >
                  {loading === 'restore' ? (
                    <ActivityIndicator size="small" color={Colors.primary[500]} />
                  ) : (
                    <Text style={[styles.restoreButtonText, { color: colors.text }]}>Satın Alımları Geri Yükle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Satın almak için giriş yapın</Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Önce hesabınıza giriş yapın. Ardından ücretsiz planı kullanabilir veya mağaza tarafı hazır olan planları seçebilirsiniz.</Text>
              <View style={styles.summaryActions}>
                <Button
                  title="Bilgileri Yenile"
                  onPress={handleRefresh}
                  variant="secondary"
                  loading={refreshing}
                  style={styles.summaryActionButton}
                />
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={[styles.loginPromptButton, { borderColor: colors.inputBorder, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.loginPromptButtonText, { color: colors.text }]}>Giriş Ekranına Git</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </GlassCard>

        {feedback ? (() => {
          const feedbackStyle = getFeedbackCardStyle(feedback.type);

          return (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: feedbackStyle.backgroundColor,
                  borderColor: feedbackStyle.borderColor,
                },
              ]}
            >
              <Text style={[styles.feedbackTitle, { color: feedbackStyle.titleColor }]}>{feedback.title}</Text>
              <Text style={[styles.feedbackText, { color: feedbackStyle.textColor }]}>{feedback.message}</Text>
            </View>
          );
        })() : null}

        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => {
          const planId = id as SubscriptionPlanId;
          const isPopular = planId === 'premium';
          const isLoading = loading === planId;
          const currentTier = subscription ? PLAN_HIERARCHY[subscription.plan] : -1;
          const thisTier = PLAN_HIERARCHY[planId];
          const isDowngrade = currentTier > thisTier;
          const isCurrent = subscription?.plan === planId;
          const availability = planId === 'free' ? undefined : billingAvailability[planId];
          const billingBlocked = planId !== 'free' && (!availability?.canPurchase || screenLoading);
          const isDisabled = isLoading || isCurrent || (user ? isDowngrade : false) || billingBlocked;
          const footnote = isCurrent
            ? 'Bu paket şu anda hesabınıza tanımlı.'
            : isDowngrade
              ? 'Mevcut planınızdan daha düşük bir pakete bu ekrandan geçiş yapılamaz.'
              : availability?.message ?? null;

          return (
            <GlassCard
              key={planId}
              style={isPopular ? [styles.pricingCard, styles.popularCard] : styles.pricingCard}
            >
              {isPopular ? (
                <LinearGradient
                  colors={[Colors.primary[500], Colors.warm[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.popularBadge}
                >
                  <Text style={styles.popularBadgeText}>⭐ Popüler</Text>
                </LinearGradient>
              ) : null}

              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planCaption, { color: colors.textSecondary }]}>
                    {planId === 'free'
                      ? 'Masal Kutusu’nu denemek için ideal başlangıç planı.'
                      : planId === 'basic'
                        ? 'Düzenli kullanım için dengeli kredi paketi.'
                        : planId === 'premium'
                          ? 'En güçlü deneyim için önerilen seçim.'
                          : 'Yoğun kullanım için en yüksek limitli paket.'}
                  </Text>
                </View>
                {isCurrent ? (
                  <View style={[styles.currentBadge, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    <Text style={styles.currentBadgeText}>Aktif Plan</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>₺{plan.price}</Text>
                {planId !== 'free' ? (
                  <Text style={[styles.priceUnit, { color: colors.textMuted }]}>/ay</Text>
                ) : null}
              </View>
              {planId === 'free' ? (
                <Text style={[styles.freeLabel, { color: colors.textMuted }]}>Her zaman ücretsiz</Text>
              ) : null}

              <View style={styles.creditsRow}>
                <Text style={styles.creditsAmount}>
                  {plan.credits === 999999 ? '∞' : plan.credits}
                </Text>
                <Text style={[styles.creditsPeriod, { color: colors.textSecondary }]}>
                  {plan.creditReset === 'daily'
                    ? 'günlük masal'
                    : plan.creditReset === 'monthly'
                      ? 'aylık masal'
                      : 'sınırsız erişim'}
                </Text>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✅</Text>
                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              {planId !== 'free' && availability?.canPurchase ? (
                <View style={styles.trustBox}>
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                    {getPlanTrustCopy(planId as PaidSubscriptionPlanId)}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => handlePurchase(planId)}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={styles.purchaseContainer}
              >
                {isPopular && !isDisabled ? (
                  <LinearGradient
                    colors={[Colors.primary[500], Colors.warm[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.purchaseBtn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.purchaseBtnText}>
                        {getPlanActionLabel(planId, isCurrent, isDowngrade, availability)}
                      </Text>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[styles.purchaseBtnSecondary, isDisabled && styles.disabledBtn, { borderColor: colors.inputBorder }]}>
                    {isLoading ? (
                      <ActivityIndicator color={Colors.neutral[700]} />
                    ) : (
                      <Text style={[styles.purchaseBtnSecondaryText, { color: isDisabled ? colors.textMuted : colors.text }]}>
                        {getPlanActionLabel(planId, isCurrent, isDowngrade, availability)}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {footnote ? (
                <Text style={[styles.planFootnote, { color: colors.textMuted }]}>{footnote}</Text>
              ) : null}
            </GlassCard>
          );
        })}

        <GlassCard style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>💡 Bilgi</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Ücretli planlar artık doğrudan backend satın alma çağrısı yapmaz. Store SKU tanımları ve backend receipt doğrulama tamamlandığında aynı ekran üzerinden native satın alma açılacaktır.</Text>
          <Text style={[styles.infoContact, { color: colors.textMuted }]}>Sorularınız için: destek@masalkutusu.com</Text>
        </GlassCard>

        <GlassCard style={styles.manageCard}>
          <Text style={[styles.manageTitle, { color: colors.text }]}>Üyeliğinizi nasıl yönetirsiniz?</Text>
          <View style={styles.manageSteps}>
            <Text style={[styles.manageStep, { color: colors.textSecondary }]}>1. Satın alma, yenileme ve iptal işlemleri uygulama mağazanız üzerinden yönetilir.</Text>
            <Text style={[styles.manageStep, { color: colors.textSecondary }]}>2. Mevcut satın alımınız görünmüyorsa önce “Satın Alımları Geri Yükle” seçeneğini kullanın.</Text>
            <Text style={[styles.manageStep, { color: colors.textSecondary }]}>3. Paket değişikliği sonrası bilgiler güncellenmediyse “Bilgileri Yenile” ile mağaza durumunu tekrar çekin.</Text>
          </View>
          <Button
            title={getSubscriptionManagementLabel()}
            onPress={handleOpenSubscriptionManagement}
            variant="secondary"
            fullWidth
          />
          <Text style={[styles.manageHelper, { color: colors.textMuted }]}>İptal ve yenileme ayarları Apple App Store veya Google Play hesabınızdan yönetilir.</Text>
          <Text style={[styles.manageHelper, { color: colors.textMuted }]}>Sorun yaşarsanız önce geri yükleme ve yenileme adımlarını deneyin, sonra destek ekibiyle paylaşın.</Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 40 },

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 30, fontWeight: '700', color: Colors.primary[500], marginBottom: 8 },
  headerSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  loadErrorCard: { marginBottom: 16, gap: 12 },
  loadErrorTitle: { fontSize: 16, fontWeight: '700', color: Colors.error },
  loadErrorText: { fontSize: 14, lineHeight: 20, color: Colors.error },
  retryButton: { alignSelf: 'flex-start' },

  summaryCard: { marginBottom: 16, gap: 12 },
  summaryLoadingState: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryHeaderCopy: { flex: 1 },
  summaryTitle: { fontSize: 20, fontWeight: '700' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  summaryHelper: { fontSize: 12, lineHeight: 18 },
  summaryActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  summaryActionButton: { alignSelf: 'flex-start' },
  restoreButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  restoreButtonText: { fontSize: 14, fontWeight: '600' },
  summaryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  summaryBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  loginPromptButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loginPromptButtonText: { fontSize: 14, fontWeight: '600' },

  feedbackBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  feedbackTitle: { fontSize: 14, fontWeight: '700' },
  feedbackText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },

  pricingCard: {
    marginBottom: 16,
    gap: 14,
  },
  popularCard: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  popularBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  planName: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  planCaption: { fontSize: 13, lineHeight: 20, maxWidth: 240 },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  currentBadgeText: { color: Colors.success, fontSize: 11, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceAmount: { fontSize: 36, fontWeight: '700', color: Colors.primary[500] },
  priceUnit: { fontSize: 14 },
  freeLabel: { fontSize: 12 },

  creditsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  creditsAmount: { fontSize: 28, fontWeight: '700', color: Colors.primary[500] },
  creditsPeriod: { fontSize: 14 },

  featuresList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureCheck: { fontSize: 14, marginTop: 1 },
  featureText: { fontSize: 14, flex: 1, lineHeight: 20 },

  trustBox: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.16)',
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  trustText: { fontSize: 12, lineHeight: 18 },
  purchaseContainer: { marginTop: 4 },
  purchaseBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  purchaseBtnSecondary: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  purchaseBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },
  planFootnote: { fontSize: 12, lineHeight: 18 },

  infoCard: { marginTop: 4 },
  infoTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  infoText: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  infoContact: { fontSize: 13 },
  manageCard: { marginTop: 12, gap: 12 },
  manageTitle: { fontSize: 18, fontWeight: '700' },
  manageSteps: { gap: 8 },
  manageStep: { fontSize: 13, lineHeight: 20 },
  manageHelper: { fontSize: 12, lineHeight: 18 },
});
