import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { supabase } from "@/lib/supabase";
import {
  SUBSCRIPTION_PLANS,
  activateSubscriptionPurchase,
  hasProcessedStoreTransaction,
  type StorePurchaseMetadata,
  type SubscriptionPlanId,
} from "@/lib/subscription";

type ReceiptPlatform = "ios" | "android";

interface ValidateReceiptBody {
  planId?: SubscriptionPlanId;
  platform?: ReceiptPlatform;
  productId?: string;
  transactionId?: string;
  purchaseToken?: string;
  packageNameAndroid?: string;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function getAppleEnvironment() {
  return process.env.APPLE_IAP_ENVIRONMENT === "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

function getAppleBundleId() {
  return process.env.APPLE_BUNDLE_ID || process.env.EXPO_PUBLIC_IOS_BUNDLE_ID;
}

async function validateApplePurchase(body: Required<Pick<ValidateReceiptBody, "productId" | "transactionId" | "purchaseToken">>) {
  const bundleId = getAppleBundleId();
  const appleRootCertificates = process.env.APPLE_ROOT_CERTIFICATES_BASE64;

  if (!bundleId) {
    throw new Error("APPLE_BUNDLE_ID is not set");
  }

  if (!appleRootCertificates) {
    throw new Error("APPLE_ROOT_CERTIFICATES_BASE64 is not set");
  }

  const verifier = new SignedDataVerifier(
    appleRootCertificates
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Buffer.from(value, "base64")),
    true,
    getAppleEnvironment(),
    bundleId,
    process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined,
  );

  const decodedTransaction = await verifier.verifyAndDecodeTransaction(
    body.purchaseToken,
  );

  if (decodedTransaction.bundleId !== bundleId) {
    throw new Error("Apple bundle ID doğrulanamadı.");
  }

  if (decodedTransaction.productId !== body.productId) {
    throw new Error("Apple ürün kimliği eşleşmiyor.");
  }

  if (decodedTransaction.transactionId !== body.transactionId) {
    throw new Error("Apple transaction kimliği eşleşmiyor.");
  }

  return {
    transactionId: decodedTransaction.transactionId ?? body.transactionId,
    originalTransactionId:
      decodedTransaction.originalTransactionId ?? body.transactionId,
    productId: decodedTransaction.productId ?? body.productId,
    purchaseDate: decodedTransaction.purchaseDate
      ? new Date(decodedTransaction.purchaseDate).toISOString()
      : null,
    expiresAt: decodedTransaction.expiresDate
      ? new Date(decodedTransaction.expiresDate).toISOString()
      : null,
    raw: decodedTransaction as Record<string, unknown>,
  };
}

async function validateAndroidPurchase(body: Required<Pick<ValidateReceiptBody, "productId" | "purchaseToken">> & { packageNameAndroid?: string }) {
  const packageName =
    body.packageNameAndroid || process.env.GOOGLE_PLAY_PACKAGE_NAME;

  if (!packageName) {
    throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not set");
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const client = google.androidpublisher({ version: "v3", auth });
  const response = await client.purchases.subscriptionsv2.get({
    packageName,
    token: body.purchaseToken,
  });
  const purchase = response.data;

  if (purchase.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE") {
    throw new Error("Google Play aboneliği aktif değil.");
  }

  const lineItem = purchase.lineItems?.find(
    (item) => item.productId === body.productId,
  );

  if (!lineItem) {
    throw new Error("Google Play ürün kimliği eşleşmiyor.");
  }

  return {
    transactionId:
      lineItem.latestSuccessfulOrderId || purchase.latestOrderId || body.purchaseToken,
    originalTransactionId: purchase.linkedPurchaseToken || null,
    productId: lineItem.productId ?? body.productId,
    purchaseDate: purchase.startTime ?? null,
    expiresAt: lineItem.expiryTime ?? null,
    raw: purchase as Record<string, unknown>,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await request.json()) as ValidateReceiptBody;
    const { planId, platform, productId, transactionId, purchaseToken } = body;

    if (!planId || !(planId in SUBSCRIPTION_PLANS) || planId === "free") {
      return json({ error: "Geçersiz paket." }, 400);
    }

    if (platform !== "ios" && platform !== "android") {
      return json({ error: "Geçersiz platform." }, 400);
    }

    if (!productId || !transactionId || !purchaseToken) {
      return json({ error: "Eksik purchase verisi." }, 400);
    }

    if (await hasProcessedStoreTransaction(transactionId)) {
      return json({ error: "Bu işlem daha önce işlendi." }, 409);
    }

    const storeResult =
      platform === "ios"
        ? await validateApplePurchase({ productId, transactionId, purchaseToken })
        : await validateAndroidPurchase({
            productId,
            purchaseToken,
            packageNameAndroid: body.packageNameAndroid,
          });

    if (await hasProcessedStoreTransaction(storeResult.transactionId)) {
      return json({ error: "Bu işlem daha önce işlendi." }, 409);
    }

    const activationMetadata: StorePurchaseMetadata = {
      platform,
      productId: storeResult.productId,
      transactionId: storeResult.transactionId,
      purchaseToken,
      originalTransactionId: storeResult.originalTransactionId,
      purchaseDate: storeResult.purchaseDate,
      expiresAt: storeResult.expiresAt,
      raw: storeResult.raw,
    };

    const activation = await activateSubscriptionPurchase(
      user.id,
      planId,
      activationMetadata,
    );

    if (!activation.success) {
      return json({ error: activation.error }, 400);
    }

    return json({
      success: true,
      message: "Satın alma doğrulandı ve üyelik aktifleştirildi.",
    });
  } catch (error) {
    console.error("Validate receipt error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Receipt doğrulama başarısız oldu.",
      },
      500,
    );
  }
}
