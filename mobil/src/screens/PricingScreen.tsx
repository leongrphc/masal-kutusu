import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Colors, BorderRadius } from '../constants/theme';
import {
  SUBSCRIPTION_PLANS,
  PLAN_HIERARCHY,
  API_BASE_URL,
  type SubscriptionPlanId,
} from '../constants/config';

interface Subscription {
  plan: SubscriptionPlanId;
  status: string;
}

export default function PricingScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!session) {
      setSubscription(null);
      setScreenLoading(false);
      return;
    }

    try {
      setScreenLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
    } finally {
      setScreenLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void fetchSubscription();
    }, [fetchSubscription])
  );

  const handlePurchase = async (planId: SubscriptionPlanId) => {
    if (!user || !session) {
      navigation.navigate('Login');
      return;
    }

    if (planId === 'free') {
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Satın alma başarısız');
      }

      await fetchSubscription();
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Satın alma başarısız');
    } finally {
      setLoading(null);
    }
  };

  const getPlanActionLabel = (
    planId: SubscriptionPlanId,
    isCurrent: boolean,
    isDowngrade: boolean,
  ) => {
    if (!user) {
      return planId === 'free' ? 'Giriş Yap' : 'Giriş Yap ve Satın Al';
    }

    if (isCurrent) {
      return 'Mevcut Paket';
    }

    if (isDowngrade) {
      return 'Düşüş Desteklenmiyor';
    }

    if (planId === 'free') {
      return 'Ücretsiz Başla';
    }

    return 'Paketi Seç';
  };

  const currentPlanName = subscription ? SUBSCRIPTION_PLANS[subscription.plan].name : null;

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Geri Dön</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Üyelik Paketleri</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>İhtiyacınıza göre plan seçin, daha fazla masal ve krediye anında ulaşın.</Text>
        </View>

        <GlassCard style={styles.summaryCard}>
          {screenLoading ? (
            <View style={styles.summaryLoadingState}>
              <ActivityIndicator size="small" color={Colors.primary[500]} />
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Paket bilgileriniz yükleniyor...</Text>
            </View>
          ) : user && subscription ? (
            <>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Mevcut Paketiniz</Text>
                  <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Şu an {currentPlanName} planını kullanıyorsunuz.</Text>
                </View>
                <View style={[styles.summaryBadge, { backgroundColor: Colors.primary[500] }]}>
                  <Text style={styles.summaryBadgeText}>{currentPlanName}</Text>
                </View>
              </View>
              <Text style={[styles.summaryHelper, { color: colors.textMuted }]}>Yükseltme işlemi hemen uygulanır. Daha düşük pakete geçiş bu ekranda kapalıdır.</Text>
            </>
          ) : (
            <>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Satın almak için giriş yapın</Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Paket seçimi yapabilir, ardından giriş ekranına geçerek hesabınız üzerinden satın alma işlemini tamamlayabilirsiniz.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={[styles.loginPromptButton, { borderColor: colors.inputBorder, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.loginPromptButtonText, { color: colors.text }]}>Giriş Ekranına Git</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => {
          const planId = id as SubscriptionPlanId;
          const isPopular = planId === 'premium';
          const isLoading = loading === planId;
          const currentTier = subscription ? PLAN_HIERARCHY[subscription.plan] : -1;
          const thisTier = PLAN_HIERARCHY[planId];
          const isDowngrade = currentTier > thisTier;
          const isCurrent = subscription?.plan === planId;
          const isDisabled = isLoading || isCurrent || (user ? isDowngrade : false);

          return (
            <GlassCard
              key={planId}
              style={isPopular ? [styles.pricingCard, styles.popularCard] : styles.pricingCard}
            >
              {isPopular && (
                <LinearGradient
                  colors={[Colors.primary[500], Colors.warm[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.popularBadge}
                >
                  <Text style={styles.popularBadgeText}>⭐ Popüler</Text>
                </LinearGradient>
              )}

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
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    <Text style={styles.currentBadgeText}>Aktif Plan</Text>
                  </View>
                )}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>₺{plan.price}</Text>
                {planId !== 'free' && (
                  <Text style={[styles.priceUnit, { color: colors.textMuted }]}>/ay</Text>
                )}
              </View>
              {planId === 'free' && (
                <Text style={[styles.freeLabel, { color: colors.textMuted }]}>Her zaman ücretsiz</Text>
              )}

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
                      <Text style={styles.purchaseBtnText}>{getPlanActionLabel(planId, isCurrent, isDowngrade)}</Text>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[styles.purchaseBtnSecondary, isDisabled && styles.disabledBtn, { borderColor: colors.inputBorder }]}>
                    {isLoading ? (
                      <ActivityIndicator color={Colors.neutral[700]} />
                    ) : (
                      <Text style={[styles.purchaseBtnSecondaryText, { color: isDisabled ? colors.textMuted : colors.text }]}>
                        {getPlanActionLabel(planId, isCurrent, isDowngrade)}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {(isCurrent || isDowngrade) && (
                <Text style={[styles.planFootnote, { color: colors.textMuted }]}>
                  {isCurrent
                    ? 'Bu paket şu anda hesabınıza tanımlı.'
                    : 'Mevcut planınızdan daha düşük bir pakete bu ekrandan geçiş yapılamaz.'}
                </Text>
              )}
            </GlassCard>
          );
        })}

        <GlassCard style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>💡 Bilgi</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Tüm paketler mevcut backend satın alma akışıyla hemen etkinleşir. Ücretsiz plandan ücretli plana geçiş anında uygulanır.</Text>
          <Text style={[styles.infoContact, { color: colors.textMuted }]}>Sorularınız için: destek@masalkutusu.com</Text>
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

  summaryCard: { marginBottom: 16, gap: 12 },
  summaryLoadingState: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryTitle: { fontSize: 20, fontWeight: '700' },
  summaryText: { fontSize: 14, lineHeight: 21 },
  summaryHelper: { fontSize: 12, lineHeight: 18 },
  summaryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  summaryBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  loginPromptButton: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginPromptButtonText: { fontSize: 14, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

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
});
