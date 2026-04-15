import React, { useEffect, useState } from 'react';
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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const subResponse = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, { headers });

      if (subResponse.status === 404) {
        await fetch(`${API_BASE_URL}/api/auth/init-subscription`, { method: 'POST', headers });
        const retryResponse = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, { headers });
        if (retryResponse.ok) {
          const subData = await retryResponse.json();
          setSubscription(subData.subscription);
        }
      } else if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      const transResponse = await fetch(`${API_BASE_URL}/api/subscription/transactions?t=${Date.now()}`, { headers });
      if (transResponse.ok) {
        const transData = await transResponse.json();
        setTransactions(transData.transactions);
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (authLoading || loading) {
    return (
      <GradientBackground style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
      </GradientBackground>
    );
  }

  if (!user) return null;

  const creditsPercentage = subscription
    ? (subscription.credits_remaining / subscription.credits_total) * 100
    : 0;

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
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Kontrol Paneli</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              Hoş geldiniz, {user.email}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Button title="Ana Sayfa" onPress={() => navigation.navigate('Home')} variant="secondary" />
            <Button title="Çıkış" onPress={handleSignOut} variant="secondary" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {/* Subscription Card */}
          <GlassCard style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mevcut Paket</Text>
              <View style={[styles.planBadge, { backgroundColor: subscription ? getPlanColor(subscription.plan) : Colors.neutral[500] }]}>
                <Text style={styles.planBadgeText}>
                  {subscription ? getPlanName(subscription.plan) : 'Yükleniyor...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Pricing')}>
              <Text style={styles.upgradeLink}>Paketi Yükselt →</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Credits Card */}
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Kalan Kredi</Text>
            <View style={styles.creditRow}>
              <Text style={styles.creditBig}>{subscription?.credits_remaining ?? 0}</Text>
              <Text style={[styles.creditTotal, { color: colors.textMuted }]}>
                / {subscription?.credits_total ?? 0}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.inputBorder }]}>
              <LinearGradient
                colors={[Colors.primary[500], Colors.warm[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${creditsPercentage}%` as any }]}
              />
            </View>
            {subscription?.credits_reset_date && (
              <Text style={[styles.resetDate, { color: colors.textMuted }]}>
                Yenileme: {formatDate(subscription.credits_reset_date)}
              </Text>
            )}
          </GlassCard>

          {/* Status Card */}
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Abonelik Durumu</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: subscription?.status === 'active' ? Colors.success : Colors.error }
              ]} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {subscription?.status === 'active' ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
            <Text style={[styles.resetDate, { color: colors.textMuted }]}>
              {subscription?.expires_at ? `Bitiş: ${formatDate(subscription.expires_at)}` : 'Süresiz'}
            </Text>
          </GlassCard>
        </View>

        {/* Quick Actions */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hızlı İşlemler</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
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
              onPress={() => navigation.navigate('Pricing')}
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

            <View style={[styles.actionCard, { backgroundColor: 'rgba(255,189,92,0.08)' }]}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.warm[500] }]}>
                <Text style={{ fontSize: 20 }}>💬</Text>
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Destek</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Yardıma mı ihtiyacınız var?</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Transactions */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem Geçmişi</Text>
          {transactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Henüz işlem geçmişiniz bulunmuyor.
            </Text>
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
                    {t.amount > 0 ? '+' : ''}{t.amount}
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
  loadingText: { marginTop: 12, fontSize: 14 },

  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  statsGrid: { gap: 12, marginBottom: 16 },
  statCard: { padding: 20 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, fontWeight: '600' },
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
