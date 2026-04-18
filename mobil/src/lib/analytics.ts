import * as Sentry from '@sentry/react-native';

type AnalyticsPayload = Record<string, unknown>;

function sanitizePayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function getEventLevel(name: string, payload: AnalyticsPayload) {
  if (name.includes('failed') || payload.status === 'error') {
    return 'error' as const;
  }

  if (payload.status === 'blocked' || payload.status === 'cancelled') {
    return 'warning' as const;
  }

  return 'info' as const;
}

function shouldCaptureMessage(name: string, payload: AnalyticsPayload) {
  return name.includes('failed') || payload.status === 'error';
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  const eventPayload = sanitizePayload(payload);
  const level = getEventLevel(name, eventPayload);

  Sentry.addBreadcrumb({
    category: 'analytics',
    message: name,
    data: eventPayload,
    level,
  });

  if (shouldCaptureMessage(name, eventPayload)) {
    Sentry.captureMessage(`[analytics] ${name}`, level);
  }

  console.info(`[analytics] ${name}`, eventPayload);
}
