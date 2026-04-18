type AnalyticsPayload = Record<string, unknown>;

function sanitizePayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  const eventPayload = sanitizePayload(payload);
  console.info(`[analytics] ${name}`, eventPayload);
}
