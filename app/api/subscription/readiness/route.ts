import { NextResponse } from "next/server";

type PlatformReadiness = {
  ready: boolean;
  message: string | null;
  missing: string[];
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function getAppleBundleId() {
  return process.env.APPLE_BUNDLE_ID || process.env.EXPO_PUBLIC_IOS_BUNDLE_ID;
}

function getAppleReadiness(): PlatformReadiness {
  const missing: string[] = [];

  if (!getAppleBundleId()) {
    missing.push("APPLE_BUNDLE_ID");
  }

  if (!process.env.APPLE_ROOT_CERTIFICATES_BASE64) {
    missing.push("APPLE_ROOT_CERTIFICATES_BASE64");
  }

  return {
    ready: missing.length === 0,
    message:
      missing.length === 0
        ? null
        : "Apple receipt doğrulama yapılandırması eksik.",
    missing,
  };
}

function getAndroidReadiness(): PlatformReadiness {
  const missing: string[] = [];

  if (!process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    missing.push("GOOGLE_PLAY_PACKAGE_NAME");
  }

  return {
    ready: missing.length === 0,
    message:
      missing.length === 0
        ? null
        : "Google Play receipt doğrulama yapılandırması eksik.",
    missing,
  };
}

export async function GET() {
  const ios = getAppleReadiness();
  const android = getAndroidReadiness();

  return json({
    ready: ios.ready && android.ready,
    platforms: {
      ios,
      android,
    },
  });
}
