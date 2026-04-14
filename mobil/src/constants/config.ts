export const SUPABASE_URL = 'https://hllwtfwpvwftylkwlvrs.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHd0ZndwdndmdHlsa3dsdnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTQ5NzIsImV4cCI6MjA4MzM3MDk3Mn0.GHscaMmNAKVElHWQqPUkPwACAqA75cp7jBL0OM8yzoM';

// Web backend'ten API çağrıları için
// Geliştirme ortamında web sunucusunun adresini kullanın
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.106:3000' // Geliştirme (kendi IP adresinizi yazın)
  : 'https://masal.mozkan.com.tr';  // Prodüksiyon

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    credits: 1,
    creditReset: 'daily',
    features: [
      'Günlük 1 masal',
      'Tüm temalar',
      'Sesli anlatım',
      'Temel özellikler',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Temel',
    price: 29.99,
    credits: 50,
    creditReset: 'monthly',
    features: [
      'Aylık 50 masal',
      'Tüm temalar',
      'Sesli anlatım',
      'Öncelikli destek',
      'Reklamsız deneyim',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 79.99,
    credits: 200,
    creditReset: 'monthly',
    features: [
      'Aylık 200 masal',
      'Tüm temalar',
      'Sesli anlatım',
      'Öncelikli destek',
      'Reklamsız deneyim',
      'Özel ses seçenekleri',
      'İndirme özelliği',
    ],
  },
  unlimited: {
    id: 'unlimited',
    name: 'Sınırsız',
    price: 149.99,
    credits: 999999,
    creditReset: 'never',
    features: [
      'Sınırsız masal',
      'Tüm temalar',
      'Sesli anlatım',
      'VIP destek',
      'Reklamsız deneyim',
      'Özel ses seçenekleri',
      'İndirme özelliği',
      'API erişimi',
      'Toplu üretim',
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

export const PLAN_HIERARCHY: Record<SubscriptionPlanId, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

export const EXAMPLE_TOPICS = [
  'Aslan ve ördek arkadaşlığı',
  'Bulutların üzerinde yaşayan kedi',
  'Cesur tavşan ve büyülü orman',
  'Paylaşmayı öğrenen sincap',
  'Yıldızları toplayan küçük kız',
  'Renkli balonlar ülkesi',
];
