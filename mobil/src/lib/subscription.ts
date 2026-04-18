import { API_BASE_URL } from '../constants/config';

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function fetchCurrentSubscription<T>(accessToken: string): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Subscription fetch failed');
  }

  const data = await readJson(response);
  return (data.subscription ?? null) as T | null;
}

export async function initializeSubscription(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/init-subscription`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.ok;
}

export async function fetchCurrentSubscriptionWithInitialization<T>(
  accessToken: string,
  retried = false,
): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}/api/subscription/current?t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404 && !retried) {
    const initialized = await initializeSubscription(accessToken);

    if (!initialized) {
      throw new Error('Subscription initialization failed');
    }

    return fetchCurrentSubscriptionWithInitialization<T>(accessToken, true);
  }

  if (!response.ok) {
    throw new Error('Subscription fetch failed');
  }

  const data = await readJson(response);
  return (data.subscription ?? null) as T | null;
}

export async function fetchSubscriptionTransactions<T>(accessToken: string): Promise<T[]> {
  const response = await fetch(`${API_BASE_URL}/api/subscription/transactions?t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Transactions fetch failed');
  }

  const data = await readJson(response);
  return (data.transactions ?? []) as T[];
}
