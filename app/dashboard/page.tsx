"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null,
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      };

      // Fetch subscription
      const subResponse = await fetch(
        `/api/subscription/current?t=${Date.now()}`,
        {
          cache: "no-store",
          headers,
        },
      );

      // If subscription not found, try to initialize it
      if (subResponse.status === 404) {
        await fetch("/api/auth/init-subscription", {
          method: "POST",
          headers,
        });
        // Retry fetching subscription
        const retryResponse = await fetch(
          `/api/subscription/current?t=${Date.now()}`,
          {
            cache: "no-store",
            headers,
          },
        );
        if (retryResponse.ok) {
          const subData = await retryResponse.json();
          setSubscription(subData.subscription);
        }
      } else if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      // Fetch transactions
      const transResponse = await fetch(
        `/api/subscription/transactions?t=${Date.now()}`,
        {
          cache: "no-store",
          headers,
        },
      );
      if (transResponse.ok) {
        const transData = await transResponse.json();
        setTransactions(transData.transactions);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const creditsPercentage = subscription
    ? (subscription.credits_remaining / subscription.credits_total) * 100
    : 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Süresiz";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "bg-neutral-500";
      case "basic":
        return "bg-blue-500";
      case "premium":
        return "bg-purple-500";
      case "unlimited":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      default:
        return "bg-neutral-500";
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "free":
        return "Ücretsiz";
      case "basic":
        return "Temel";
      case "premium":
        return "Premium";
      case "unlimited":
        return "Sınırsız";
      default:
        return plan;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-neutral-100 mb-2">
              Kontrol Paneli
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Hoş geldiniz, {user.email}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="btn-secondary">
              Ana Sayfa
            </Link>
            <button onClick={handleSignOut} className="btn-secondary">
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Subscription Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Mevcut Paket
              </h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${subscription ? getPlanColor(subscription.plan) : "bg-neutral-500"}`}
              >
                {subscription
                  ? getPlanName(subscription.plan)
                  : "Yükleniyor..."}
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center text-primary-500 hover:text-primary-600 font-semibold text-sm"
            >
              Paketi Yükselt →
            </Link>
          </div>

          {/* Credits Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
              Kalan Kredi
            </h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold gradient-text">
                {subscription?.credits_remaining ?? 0}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                / {subscription?.credits_total ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-warm-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${creditsPercentage}%` }}
              ></div>
            </div>
            {subscription?.credits_reset_date && (
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Yenileme: {formatDate(subscription.credits_reset_date)}
              </p>
            )}
          </div>

          {/* Expiry Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
              Abonelik Durumu
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${subscription?.status === "active" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                {subscription?.status === "active" ? "Aktif" : "Pasif"}
              </span>
            </div>
            {subscription?.expires_at ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Bitiş: {formatDate(subscription.expires_at)}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Süresiz
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-display font-bold text-neutral-800 dark:text-neutral-100 mb-4">
            Hızlı İşlemler
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary-50 to-warm-50 dark:from-primary-900/20 dark:to-warm-900/20 hover:scale-105 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl">
                ✨
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                  Masal Oluştur
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Yeni bir hikaye yarat
                </p>
              </div>
            </Link>

            <Link
              href="/pricing"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-secondary-50 to-purple-50 dark:from-secondary-900/20 dark:to-purple-900/20 hover:scale-105 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-500 flex items-center justify-center text-white text-2xl">
                💎
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                  Paket Yükselt
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Daha fazla masal
                </p>
              </div>
            </Link>

            <button className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-warm-50 to-yellow-50 dark:from-warm-900/20 dark:to-yellow-900/20 hover:scale-105 transition-all">
              <div className="w-12 h-12 rounded-full bg-warm-500 flex items-center justify-center text-white text-2xl">
                💬
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                  Destek
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Yardıma mı ihtiyacınız var?
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-bold text-neutral-800 dark:text-neutral-100 mb-4">
            İşlem Geçmişi
          </h3>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-500">
                Henüz işlem geçmişiniz bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Tarih
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Açıklama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Tip
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Miktar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">
                        {new Date(transaction.created_at).toLocaleDateString(
                          "tr-TR",
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">
                        {transaction.description}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === "purchase"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : transaction.type === "usage"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : transaction.type === "refund"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}
                        >
                          {transaction.type === "purchase"
                            ? "Satın Alma"
                            : transaction.type === "usage"
                              ? "Kullanım"
                              : transaction.type === "refund"
                                ? "İade"
                                : "Bonus"}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-semibold ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
