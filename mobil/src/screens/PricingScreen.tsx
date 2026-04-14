import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Colors, BorderRadius } from '../constants/theme';
import {
  SUBSCRIPTION_PLANS, PLAN_HIERARCHY, API_BASE_URL,
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
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (err) {
        console.error('Subscription fetch error:', err);
      }
    };
    fetchSubscription();
  }, [session]);

  const handlePurchase = async (planId: SubscriptionPlanId) => {
    if (!user || !session) {
      navigation.navigate('Login');
      return;
    }

    if (planId === 'free') return;

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

      navigation.navigate('Dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Geri Dön</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Üyelik Paketleri</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Çocuğunuz için sınırsız masallar. Size en uygun paketi seçin.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Pricing Cards */}
        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => {
          const planId = id as SubscriptionPlanId;
          const isPopular = planId === 'premium';
          const isLoading = loading === planId;
          const currentTier = subscription ? PLAN_HIERARCHY[subscription.plan] : -1;
          const thisTier = PLAN_HIERARCHY[planId];
          const isDowngrade = currentTier > thisTier;
          const isCurrent = subscription?.plan === planId;
          const isDisabled = isLoading || isCurrent || isDowngrade;

          return (
            <GlassCard
              key={planId}
              style={[
                styles.pricingCard,
                isPopular && styles.popularCard,
              ]}
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

              <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
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
                  {plan.creditReset === 'daily' ? 'günlük' : plan.creditReset === 'monthly' ? 'aylık' : ''} masal
                </Text>
              </View>

              {plan.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✅</Text>
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => handlePurchase(planId)}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={{ marginTop: 16 }}
              >
                {isPopular && !isDisabled ? (
                  <LinearGradient
                    colors={[Colors.primary[500], Colors.warm[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.purchaseBtn, isDisabled && styles.disabledBtn]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.purchaseBtnText}>Satın Al</Text>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[styles.purchaseBtnSecondary, isDisabled && styles.disabledBtn, { borderColor: colors.inputBorder }]}>
                    {isLoading ? (
                      <ActivityIndicator color={Colors.neutral[700]} />
                    ) : (
                      <Text style={[styles.purchaseBtnSecondaryText, { color: isDisabled ? colors.textMuted : colors.text }]}>
                        {isCurrent ? 'Mevcut Paket' : isDowngrade ? 'Daha Düşük Paket' : 'Satın Al'}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </GlassCard>
          );
        })}

        {/* Info */}
        <GlassCard style={{ marginTop: 16 }}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>💡 Bilgi</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Tüm paketler otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
            Ücretsiz paketten premium pakete geçiş anında etkinleşir.
          </Text>
          <Text style={[styles.infoContact, { color: colors.textMuted }]}>
            Sorularınız için: destek@masalkutusu.com
          </Text>
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

  header: { alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 30, fontWeight: '700', color: Colors.primary[500], marginBottom: 8 },
  headerSub: { fontSize: 15, textAlign: 'center' },

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
    alignItems: 'center',
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

  planName: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  priceAmount: { fontSize: 36, fontWeight: '700', color: Colors.primary[500] },
  priceUnit: { fontSize: 14 },
  freeLabel: { fontSize: 12, marginBottom: 8 },

  creditsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 20 },
  creditsAmount: { fontSize: 28, fontWeight: '700', color: Colors.primary[500] },
  creditsPeriod: { fontSize: 14 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, alignSelf: 'flex-start' },
  featureCheck: { fontSize: 14, marginTop: 1 },
  featureText: { fontSize: 14, flex: 1 },

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
  purchaseBtnSecondaryText: { fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },

  infoTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  infoText: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  infoContact: { fontSize: 13 },
});
