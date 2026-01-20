'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from '@/lib/subscription';
import { useAuth } from '@/components/AuthProvider';

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<SubscriptionPlanId, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

interface Subscription {
  plan: SubscriptionPlanId;
  status: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Fetch current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) return;

      try {
        const response = await fetch('/api/subscription/current', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };

    fetchSubscription();
  }, [session]);

  const handlePurchase = async (planId: SubscriptionPlanId) => {
    if (!user || !session) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (planId === 'free') {
      return; // Already free
    }

    setLoading(planId);
    setError(null);

    try {
      const response = await fetch('/api/subscription/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Satın alma başarısız');
      }

      // Success! Redirect to dashboard
      router.push('/dashboard?success=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-semibold">Geri Dön</span>
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-display font-bold gradient-text mb-4">
            Üyelik Paketleri
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Çocuğunuz için sınırsız masallar. Size en uygun paketi seçin.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => {
            const planId = id as SubscriptionPlanId;
            const isPopular = planId === 'premium';
            const isLoading = loading === planId;

            // Check if this is a downgrade
            const currentTier = subscription ? PLAN_HIERARCHY[subscription.plan] : -1;
            const thisTier = PLAN_HIERARCHY[planId];
            const isDowngrade = currentTier > thisTier;
            const isCurrent = subscription?.plan === planId;
            const isDisabled = isLoading || isCurrent || isDowngrade;

            return (
              <div
                key={planId}
                className={`glass-card p-6 relative transition-all duration-300 hover:scale-105 ${
                  isPopular ? 'ring-2 ring-primary-500 scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary-500 to-warm-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      ⭐ Popüler
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-display font-bold text-neutral-800 dark:text-neutral-100 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold gradient-text">
                      ₺{plan.price}
                    </span>
                    {planId !== 'free' && (
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">/ay</span>
                    )}
                  </div>
                  {planId === 'free' && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Her zaman ücretsiz
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-primary-500">
                      {plan.credits === 999999 ? '∞' : plan.credits}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 ml-2">
                      {plan.creditReset === 'daily' ? 'günlük' : plan.creditReset === 'monthly' ? 'aylık' : ''} masal
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-neutral-700 dark:text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(planId)}
                  disabled={isDisabled}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                    isDisabled
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                      : isPopular
                      ? 'bg-gradient-to-r from-primary-500 to-warm-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-2 border-neutral-200 dark:border-neutral-600 hover:border-primary-400 dark:hover:border-primary-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      İşleniyor...
                    </span>
                  ) : isCurrent ? (
                    'Mevcut Paket'
                  ) : isDowngrade ? (
                    'Daha Düşük Paket'
                  ) : (
                    'Satın Al'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ or Info Section */}
        <div className="mt-16 text-center">
          <div className="glass-card p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-display font-bold text-neutral-800 dark:text-neutral-100 mb-4">
              💡 Bilgi
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Tüm paketler otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
              Ücretsiz paketten premium pakete geçiş anında etkinleşir.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Sorularınız için: <a href="mailto:destek@masalkutusu.com" className="text-primary-500 hover:underline">destek@masalkutusu.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
