import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

export interface StorePurchaseMetadata {
  platform: "ios" | "android";
  productId: string;
  transactionId: string;
  purchaseToken: string;
  originalTransactionId?: string | null;
  purchaseDate?: string | null;
  expiresAt?: string | null;
  raw?: Record<string, unknown>;
}

const PLAN_HIERARCHY: Record<SubscriptionPlanId, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

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

export async function checkUserCredits(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return false;
  }

  if (subscription.plan === "free" && subscription.credits_reset_date) {
    const resetDate = new Date(subscription.credits_reset_date);
    if (resetDate <= new Date()) {
      const updateData: Database["public"]["Tables"]["subscriptions"]["Update"] = {
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

  const transactionData: Database["public"]["Tables"]["transactions"]["Insert"] = {
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

function getPlanDates(planId: SubscriptionPlanId, now: Date) {
  const expiresAt =
    planId === "free"
      ? null
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const creditsResetDate =
    planId === "free"
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : planId === "unlimited"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return { expiresAt, creditsResetDate };
}

async function validateSubscriptionChange(
  userId: string,
  planId: SubscriptionPlanId,
): Promise<
  | { success: true; plan: (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanId] }
  | { success: false; error: string }
> {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    return { success: false, error: "Geçersiz paket." };
  }

  const currentSubscription = await getUserSubscription(userId);
  if (currentSubscription) {
    const currentTier =
      PLAN_HIERARCHY[currentSubscription.plan as SubscriptionPlanId];
    const newTier = PLAN_HIERARCHY[planId];

    if (newTier < currentTier) {
      return {
        success: false,
        error:
          "Daha düşük bir pakete geçiş yapamazsınız. Mevcut paketiniz sona erene kadar bekleyebilir veya destek ile iletişime geçebilirsiniz.",
      };
    }

    if (newTier === currentTier && currentSubscription.plan === planId) {
      return {
        success: false,
        error: "Zaten bu paketi kullanıyorsunuz.",
      };
    }
  }

  return { success: true, plan };
}

export async function hasProcessedStoreTransaction(transactionId: string) {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("id, user_id")
    .eq("metadata->>transactionId", transactionId)
    .limit(1);

  if (error) {
    console.error("Error checking transaction idempotency:", error);
    throw error;
  }

  return Boolean(data && data.length > 0);
}

export async function activateSubscriptionPurchase(
  userId: string,
  planId: SubscriptionPlanId,
  metadata?: StorePurchaseMetadata,
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateSubscriptionChange(userId, planId);

  if (!validation.success) {
    return validation;
  }

  const now = new Date();
  const { expiresAt, creditsResetDate } = getPlanDates(planId, now);

  const upsertData: Database["public"]["Tables"]["subscriptions"]["Insert"] = {
    user_id: userId,
    plan: planId,
    status: "active",
    credits_remaining: validation.plan.credits,
    credits_total: validation.plan.credits,
    credits_reset_date: creditsResetDate?.toISOString() || null,
    started_at: now.toISOString(),
    expires_at: metadata?.expiresAt || expiresAt?.toISOString() || null,
  };

  const { error: upsertError } = await supabaseAdmin
    .from("subscriptions")
    // @ts-ignore - Supabase type inference issue
    .upsert(upsertData, {
      onConflict: "user_id",
    });

  if (upsertError) {
    console.error("Error activating subscription:", upsertError);
    return { success: false, error: "Satın alma işlemi başarısız." };
  }

  const purchaseTransactionData: Database["public"]["Tables"]["transactions"]["Insert"] = {
    user_id: userId,
    type: "purchase",
    amount: validation.plan.credits,
    description: `${validation.plan.name} paket satın alımı`,
    metadata: {
      planId,
      price: validation.plan.price,
      timestamp: now.toISOString(),
      ...(metadata
        ? {
            platform: metadata.platform,
            productId: metadata.productId,
            transactionId: metadata.transactionId,
            purchaseToken: metadata.purchaseToken,
            originalTransactionId: metadata.originalTransactionId ?? null,
            purchaseDate: metadata.purchaseDate ?? null,
            expiresAt: metadata.expiresAt ?? null,
            raw: metadata.raw ?? null,
          }
        : {
            source: "legacy-api",
          }),
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

export async function purchaseSubscription(
  userId: string,
  planId: SubscriptionPlanId,
): Promise<{ success: boolean; error?: string }> {
  return activateSubscriptionPurchase(userId, planId);
}

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
