import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client
// Uses service role key if available (bypasses RLS), otherwise uses anon key
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  },
);

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Ücretsiz",
    price: 0,
    credits: 1,
    creditReset: "daily",
    features: [
      "Günlük 1 masal",
      "Tüm temalar",
      "Sesli anlatım",
      "Temel özellikler",
    ],
  },
  basic: {
    id: "basic",
    name: "Temel",
    price: 29.99,
    credits: 50,
    creditReset: "monthly",
    features: [
      "Aylık 50 masal",
      "Tüm temalar",
      "Sesli anlatım",
      "Öncelikli destek",
      "Reklamsız deneyim",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 79.99,
    credits: 200,
    creditReset: "monthly",
    features: [
      "Aylık 200 masal",
      "Tüm temalar",
      "Sesli anlatım",
      "Öncelikli destek",
      "Reklamsız deneyim",
      "Özel ses seçenekleri",
      "İndirme özelliği",
    ],
  },
  unlimited: {
    id: "unlimited",
    name: "Sınırsız",
    price: 149.99,
    credits: 999999,
    creditReset: "never",
    features: [
      "Sınırsız masal",
      "Tüm temalar",
      "Sesli anlatım",
      "VIP destek",
      "Reklamsız deneyim",
      "Özel ses seçenekleri",
      "İndirme özelliği",
      "API erişimi",
      "Toplu üretim",
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

// Plan hierarchy (lower number = lower tier)
const PLAN_HIERARCHY: Record<SubscriptionPlanId, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

// Get user's subscription
export async function getUserSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }

  return data as Database["public"]["Tables"]["subscriptions"]["Row"];
}

// Check if user has credits
export async function checkUserCredits(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return false;
  }

  // Check if credits need reset (for free plan)
  if (subscription.plan === "free" && subscription.credits_reset_date) {
    const resetDate = new Date(subscription.credits_reset_date);
    if (resetDate <= new Date()) {
      // Reset credits
      const updateData: Database["public"]["Tables"]["subscriptions"]["Update"] =
        {
          credits_remaining: subscription.credits_total,
          credits_reset_date: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

      await supabaseAdmin
        .from("subscriptions")
        // @ts-ignore - Supabase type inference issue
        .update(updateData)
        .eq("user_id", userId);

      return true;
    }
  }

  return subscription.credits_remaining > 0;
}

// Deduct credit from user
export async function deductCredit(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return { success: false, error: "Aktif abonelik bulunamadı." };
  }

  if (subscription.credits_remaining <= 0) {
    return { success: false, error: "Kredi limitiniz doldu." };
  }

  // Deduct credit
  const deductData: Database["public"]["Tables"]["subscriptions"]["Update"] = {
    credits_remaining: subscription.credits_remaining - 1,
  };

  const { error: updateError } = await supabaseAdmin
    .from("subscriptions")
    // @ts-ignore - Supabase type inference issue
    .update(deductData)
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error deducting credit:", updateError);
    return { success: false, error: "Kredi düşülemedi." };
  }

  // Log transaction
  const transactionData: Database["public"]["Tables"]["transactions"]["Insert"] =
    {
      user_id: userId,
      type: "usage",
      amount: -1,
      description: "Masal oluşturma",
      metadata: { timestamp: new Date().toISOString() },
    };

  const { error: usageTransactionError } = await supabaseAdmin
    .from("transactions")
    // @ts-ignore - Supabase type inference issue
    .insert(transactionData);

  if (usageTransactionError) {
    console.error("Error logging usage transaction:", usageTransactionError);
    return { success: false, error: "İşlem geçmişine kayıt atılamadı." };
  }

  return { success: true };
}

// Purchase subscription (fake payment for now)
export async function purchaseSubscription(
  userId: string,
  planId: SubscriptionPlanId,
): Promise<{ success: boolean; error?: string }> {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    return { success: false, error: "Geçersiz paket." };
  }

  // Check current subscription
  const currentSubscription = await getUserSubscription(userId);
  if (currentSubscription) {
    const currentTier =
      PLAN_HIERARCHY[currentSubscription.plan as SubscriptionPlanId];
    const newTier = PLAN_HIERARCHY[planId];

    // Prevent downgrade
    if (newTier < currentTier) {
      return {
        success: false,
        error:
          "Daha düşük bir pakete geçiş yapamazsınız. Mevcut paketiniz sona erene kadar bekleyebilir veya destek ile iletişime geçebilirsiniz.",
      };
    }

    // Prevent buying the same plan
    if (newTier === currentTier && currentSubscription.plan === planId) {
      return {
        success: false,
        error: "Zaten bu paketi kullanıyorsunuz.",
      };
    }
  }

  const now = new Date();
  const expiresAt =
    planId === "free"
      ? null
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const creditsResetDate =
    planId === "free"
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
      : planId === "unlimited"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Update or create subscription
  const upsertData: Database["public"]["Tables"]["subscriptions"]["Insert"] = {
    user_id: userId,
    plan: planId,
    status: "active",
    credits_remaining: plan.credits,
    credits_total: plan.credits,
    credits_reset_date: creditsResetDate?.toISOString() || null,
    started_at: now.toISOString(),
    expires_at: expiresAt?.toISOString() || null,
  };

  const { error: upsertError } = await supabaseAdmin
    .from("subscriptions")
    // @ts-ignore - Supabase type inference issue
    .upsert(upsertData, {
      onConflict: "user_id",
    });

  if (upsertError) {
    console.error("Error purchasing subscription:", upsertError);
    return { success: false, error: "Satın alma işlemi başarısız." };
  }

  // Log transaction
  const purchaseTransactionData: Database["public"]["Tables"]["transactions"]["Insert"] =
    {
      user_id: userId,
      type: "purchase",
      amount: plan.credits,
      description: `${plan.name} paket satın alımı`,
      metadata: {
        plan_id: planId,
        price: plan.price,
        timestamp: now.toISOString(),
      },
    };

  const { error: purchaseTransactionError } = await supabaseAdmin
    .from("transactions")
    // @ts-ignore - Supabase type inference issue
    .insert(purchaseTransactionData);

  if (purchaseTransactionError) {
    console.error(
      "Error logging purchase transaction:",
      purchaseTransactionError,
    );
    return { success: false, error: "Satın alma kaydı oluşturulamadı." };
  }

  return { success: true };
}

// Get user's transaction history
export async function getUserTransactions(userId: string, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data;
}
