import { Platform } from 'react-native';
import type {
  ProductSubscription,
  ProductSubscriptionAndroid,
  Purchase,
  PurchaseIOS,
} from 'expo-iap';
import {
  API_BASE_URL,
  PAID_SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_BILLING_SKUS,
  type PaidSubscriptionPlanId,
} from '../constants/config';
import { supabase } from './supabase';

export type BillingBlockReason =
  | 'unsupported-platform'
  | 'sku-missing'
  | 'store-connection-failed'
  | 'product-not-found'
  | 'product-not-available'
  | 'backend-not-ready';

export interface BillingPlanAvailability {
  planId: PaidSubscriptionPlanId;
  sku?: string;
  product: ProductSubscription | null;
  canPurchase: boolean;
  blockReason?: BillingBlockReason;
  message: string | null;
}

export type BillingAvailabilityMap = Record<PaidSubscriptionPlanId, BillingPlanAvailability>;

export interface BillingPurchaseResult {
  status: 'blocked' | 'cancelled' | 'started' | 'error';
  message: string;
}

const BACKEND_RECEIPT_VALIDATION_READY =
  process.env.EXPO_PUBLIC_BILLING_BACKEND_READY === 'true';

let connectionPromise: Promise<void> | null = null;

function isNativeStorePlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getPlanSku(planId: PaidSubscriptionPlanId) {
  const skuConfig = SUBSCRIPTION_BILLING_SKUS[planId];

  if (Platform.OS === 'ios') {
    return skuConfig.ios;
  }

  if (Platform.OS === 'android') {
    return skuConfig.android;
  }

  return undefined;
}

function createBlockedAvailability(
  planId: PaidSubscriptionPlanId,
  blockReason: BillingBlockReason,
  message: string,
  options?: {
    sku?: string;
    product?: ProductSubscription | null;
  },
): BillingPlanAvailability {
  return {
    planId,
    sku: options?.sku,
    product: options?.product ?? null,
    canPurchase: false,
    blockReason,
    message,
  };
}

async function loadExpoIap() {
  return import('expo-iap');
}

async function ensureBillingConnection() {
  if (!isNativeStorePlatform()) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = loadExpoIap()
      .then(({ initConnection }) => initConnection())
      .then(() => undefined)
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

function isPurchaseIOS(purchase: Purchase): purchase is PurchaseIOS {
  return purchase.platform === 'ios' || purchase.store === 'apple';
}

function getPurchasePlatform(purchase: Purchase): 'ios' | 'android' {
  return isPurchaseIOS(purchase) ? 'ios' : 'android';
}

function getPurchaseTransactionId(purchase: Purchase) {
  return purchase.transactionId ?? purchase.id;
}

function getPurchaseToken(purchase: Purchase) {
  return purchase.purchaseToken ?? null;
}

async function validateReceiptWithBackend(planId: PaidSubscriptionPlanId, purchase: Purchase) {
  const {
    finishTransaction,
  } = await loadExpoIap();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }

  const purchaseToken = getPurchaseToken(purchase);
  const transactionId = getPurchaseTransactionId(purchase);

  if (!purchaseToken || !transactionId) {
    throw new Error('Satın alma verisi eksik döndü.');
  }

  const response = await fetch(`${API_BASE_URL}/api/subscription/validate-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      planId,
      platform: getPurchasePlatform(purchase),
      productId: purchase.productId,
      transactionId,
      purchaseToken,
      packageNameAndroid: !isPurchaseIOS(purchase) ? purchase.packageNameAndroid ?? undefined : undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Receipt doğrulama başarısız oldu.');
  }

  await finishTransaction({
    purchase,
    isConsumable: false,
  });
}

export async function getBillingAvailability(
  planId: PaidSubscriptionPlanId,
): Promise<BillingPlanAvailability> {
  if (!isNativeStorePlatform()) {
    return createBlockedAvailability(
      planId,
      'unsupported-platform',
      'Mağaza satın alma akışı yalnızca iOS ve Android uygulama buildlerinde çalışır.',
    );
  }

  const sku = getPlanSku(planId);

  if (!sku) {
    return createBlockedAvailability(
      planId,
      'sku-missing',
      'Bu plan için mağaza ürün kimliği henüz tanımlanmadı.',
    );
  }

  try {
    await ensureBillingConnection();
    const { fetchProducts } = await loadExpoIap();
    const products = await fetchProducts({ skus: [sku], type: 'subs' });
    const product = (products?.find((item) => item.id === sku) ?? null) as ProductSubscription | null;

    if (!product) {
      return createBlockedAvailability(
        planId,
        'product-not-found',
        'Mağaza ürünü bulundu olarak dönmedi. SKU yayına alındıktan sonra tekrar deneyin.',
        { sku },
      );
    }

    if (Platform.OS === 'android') {
      const androidProduct = product as ProductSubscriptionAndroid;

      if (androidProduct.productStatusAndroid && androidProduct.productStatusAndroid !== 'ok') {
        return createBlockedAvailability(
          planId,
          'product-not-available',
          androidProduct.productStatusAndroid === 'not-found'
            ? 'Google Play bu ürün kaydını bulamadı.'
            : 'Google Play bu kullanıcı için aktif bir teklif döndürmedi.',
          { sku, product },
        );
      }
    }

    if (!BACKEND_RECEIPT_VALIDATION_READY) {
      return createBlockedAvailability(
        planId,
        'backend-not-ready',
        'Store ürünleri için backend receipt doğrulama ve abonelik aktivasyonu henüz tamamlanmadı.',
        { sku, product },
      );
    }

    return {
      planId,
      sku,
      product,
      canPurchase: true,
      message: null,
    };
  } catch {
    return createBlockedAvailability(
      planId,
      'store-connection-failed',
      'Mağaza bağlantısı kurulamadı. Expo Go yerine development build veya release build kullanın.',
      { sku },
    );
  }
}

export async function getAllBillingAvailability(): Promise<BillingAvailabilityMap> {
  const entries = await Promise.all(
    PAID_SUBSCRIPTION_PLAN_IDS.map(async (planId) => [planId, await getBillingAvailability(planId)] as const),
  );

  return Object.fromEntries(entries) as BillingAvailabilityMap;
}

export async function startPlanPurchase(
  planId: PaidSubscriptionPlanId,
): Promise<BillingPurchaseResult> {
  const availability = await getBillingAvailability(planId);

  if (!availability.canPurchase || !availability.sku) {
    return {
      status: 'blocked',
      message: availability.message ?? 'Satın alma şu anda kullanılamıyor.',
    };
  }

  try {
    const { requestPurchase, ErrorCode } = await loadExpoIap();

    const purchase = await requestPurchase({
      request: {
        apple: { sku: availability.sku },
        google: { skus: [availability.sku] },
      },
      type: 'subs',
    });

    const resolvedPurchase = Array.isArray(purchase) ? purchase[0] : purchase;

    if (!resolvedPurchase) {
      return {
        status: 'error',
        message: 'Satın alma başlatıldı ancak mağaza işlem verisi dönmedi.',
      };
    }

    await validateReceiptWithBackend(planId, resolvedPurchase);

    return {
      status: 'started',
      message: 'Satın alma doğrulandı ve üyeliğiniz güncellendi.',
    };
  } catch (error) {
    const purchaseError = error as { code?: string; message?: string };
    const { ErrorCode } = await loadExpoIap();

    if (purchaseError.code === ErrorCode.UserCancelled) {
      return {
        status: 'cancelled',
        message: 'Satın alma kullanıcı tarafından iptal edildi.',
      };
    }

    if (
      purchaseError.code === ErrorCode.ItemUnavailable ||
      purchaseError.code === ErrorCode.SkuNotFound
    ) {
      return {
        status: 'blocked',
        message: 'Seçilen mağaza ürünü şu anda satın alınamıyor.',
      };
    }

    return {
      status: 'error',
      message: purchaseError.message ?? 'Satın alma başlatılamadı.',
    };
  }
}
