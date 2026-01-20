'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AudioPlayer from '@/components/AudioPlayer';
import Link from 'next/link';

interface StoryResult {
  story: string;
  audioBase64: string;
  mimeType: string;
  meta?: {
    totalTime: number;
    storyGenerationTime: number;
    ttsGenerationTime: number;
    storyLength: number;
  };
}

interface Subscription {
  plan: 'free' | 'basic' | 'premium' | 'unlimited';
  credits_remaining: number;
  credits_total: number;
}

const EXAMPLE_TOPICS = [
  'Aslan ve ördek arkadaşlığı',
  'Bulutların üzerinde yaşayan kedi',
  'Cesur tavşan ve büyülü orman',
  'Paylaşmayı öğrenen sincap',
  'Yıldızları toplayan küçük kız',
  'Renkli balonlar ülkesi'
];

export default function Home() {
  const { user, session, signOut } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [topic, setTopic] = useState('');
  const [ageRange, setAgeRange] = useState<'3-5' | '6-8'>('3-5');
  const [length, setLength] = useState<'short' | 'medium'>('short');
  const [theme, setTheme] = useState<'friendship' | 'courage' | 'sharing' | 'emotions'>('friendship');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch subscription on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) {
        setLoadingSubscription(false);
        return;
      }

      try {
        const response = await fetch('/api/subscription/current', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [session]);

  const handleGenerate = async () => {
    // Check if user is logged in
    if (!user || !session) {
      setError('Masal üretmek için giriş yapmalısınız.');
      setTimeout(() => {
        router.push('/login?redirect=/');
      }, 2000);
      return;
    }

    if (!topic.trim()) {
      setError('Lütfen bir konu girin.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic,
          ageRange,
          length,
          theme,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if user needs to upgrade
        if (data.needsUpgrade) {
          setShowUpgradeModal(true);
        }
        throw new Error(data.error || 'Bir hata oluştu');
      }

      setResult(data);

      // Refresh subscription to update credits
      const subResponse = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyStory = () => {
    if (result?.story) {
      navigator.clipboard.writeText(result.story);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateStory = () => {
    setResult(null);
    handleGenerate();
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8 noise-overlay">
      <div className="max-w-4xl mx-auto pt-12 sm:pt-20">
          {/* Navigation Bar */}
          <nav className="flex items-center justify-between mb-8 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="text-3xl">📚</div>
              <span className="text-xl font-display font-bold gradient-text">Masal Kutusu</span>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {!loadingSubscription && subscription && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-warm-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {subscription.credits_remaining} kredi
                        </span>
                      </div>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-warm-500 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                  >
                    Hesabım
                  </Link>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    Çıkış
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-warm-500 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                  >
                    Kayıt Ol
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Header */}
          <header className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="text-5xl sm:text-6xl">📚</div>
              <h1 className="text-4xl sm:text-6xl font-display font-bold gradient-text">
                Masal Kutusu
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 font-medium max-w-2xl mx-auto mb-4">
              Çocuğunuz için yapay zeka destekli, sesli masallar oluşturun
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-warm-500 text-white rounded-full text-sm font-semibold shadow-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Yapay Zeka ile desteklenmiş çocuklara özel masallar.</span>
            </div>
          </header>

          {/* Input Card */}
          <div className="glass-card p-6 sm:p-8 mb-8 animate-slide-up space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                Masal Konusu
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Örn: Aslan ve ördek arkadaşlığı"
                className="input-field"
                maxLength={120}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 text-right">
                {topic.length}/120 karakter
              </div>
            </div>

            {/* Example Topic Chips */}
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                Hızlı Örnekler
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_TOPICS.map((example) => (
                  <button
                    key={example}
                    onClick={() => setTopic(example)}
                    className={`chip ${topic === example ? 'chip-selected' : ''}`}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Settings - Length & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Length */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                  Uzunluk
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLength('short')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      length === 'short'
                        ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:scale-105'
                    }`}
                  >
                    📖 Kısa
                    <span className="block text-xs opacity-80 mt-1">~2 dakika</span>
                  </button>
                  <button
                    onClick={() => setLength('medium')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      length === 'medium'
                        ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:scale-105'
                    }`}
                  >
                    📚 Orta
                    <span className="block text-xs opacity-80 mt-1">~3-4 dakika</span>
                  </button>
                </div>
              </div>

              {/* Age Range */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                  Yaş Aralığı
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAgeRange('3-5')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      ageRange === '3-5'
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:scale-105'
                    }`}
                  >
                    🧒 3-5 yaş
                  </button>
                  <button
                    onClick={() => setAgeRange('6-8')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      ageRange === '6-8'
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:scale-105'
                    }`}
                  >
                    👧 6-8 yaş
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Gelişmiş Seçenekler
              </button>

              {showAdvanced && (
                <div className="mt-4 grid grid-cols-1 gap-4 animate-slide-down">
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                      🎨 Tema
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-full py-3 px-4 bg-white dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-warm-400 dark:focus:border-warm-500 transition-all"
                    >
                      <option value="friendship">🤝 Arkadaşlık</option>
                      <option value="courage">🦁 Cesaret</option>
                      <option value="sharing">🎁 Paylaşmak</option>
                      <option value="emotions">❤️ Duygular</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="btn-primary w-full relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Masal Oluşturuluyor... (Bu işlem 30-40 saniye sürebilir)</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Masalı Oluştur ve Seslendir </span>
				  
                </span>
				
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 animate-scale-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card p-8">
                <div className="skeleton h-8 w-3/4 mb-4"></div>
                <div className="skeleton h-4 w-full mb-2"></div>
                <div className="skeleton h-4 w-full mb-2"></div>
                <div className="skeleton h-4 w-5/6"></div>
              </div>
              <div className="glass-card p-6">
                <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4"></div>
                <div className="skeleton h-2 w-full mb-4"></div>
                <div className="skeleton h-10 w-full"></div>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && !loading && (
            <div className="space-y-6">
              {/* Story Text */}
              <div className="glass-card p-6 sm:p-8 animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold gradient-text">
                    Masalınız Hazır! 📖
                  </h2>
                  <button
                    onClick={handleCopyStory}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Kopyala
                      </>
                    )}
                  </button>
                </div>
                <div className="prose dark:prose-invert max-w-none custom-scrollbar max-h-96 overflow-y-auto">
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-lg whitespace-pre-wrap">
                    {result.story}
                  </p>
                </div>

                {/* Meta Info */}
                {result.meta && (
                  <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Toplam: {(result.meta.totalTime / 1000).toFixed(1)}s
                    </div>
                    <div>Hikaye: {result.meta.storyLength} karakter</div>
                  </div>
                )}
              </div>

              {/* Audio Player */}
              <AudioPlayer
                audioBase64={result.audioBase64}
                mimeType={result.mimeType}
              />

              {/* Regenerate Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleRegenerateStory}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yeni Masal Üret
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 text-center space-y-4 text-sm text-neutral-500 dark:text-neutral-500">
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Çocuk güvenliği önceliğimiz</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Verileriniz saklanmaz</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span>Her gün ücretsiz 1 hikaye.</span>
              </div>
            </div>
            <p className="text-xs">
              Her masal benzersizdir ve çocuğunuza özeldir, daha fazla hikaye oluşturmak için paketlerimize göz atmayı unutmayın.
            </p>
          </footer>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card max-w-md w-full p-8 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-warm-400 to-warm-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-display font-bold gradient-text mb-2">
                Kredi Limitine Ulaştınız
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Daha fazla masal oluşturmak için paketinizi yükseltin
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-warm-500 text-white rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Paketleri Görüntüle
              </Link>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="block w-full py-3 px-4 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-semibold text-center shadow-sm hover:shadow-md transition-all"
              >
                Kapat
              </button>
            </div>

            <div className="text-xs text-center text-neutral-500 dark:text-neutral-500">
              {subscription?.plan === 'free' && (
                <p>Ücretsiz plan: Günde 1 masal. Yarın yeni krediniz yüklenecek.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
