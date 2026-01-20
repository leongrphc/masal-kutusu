'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message || 'Kayıt başarısız');
      setLoading(false);
    } else {
      // Show email confirmation message
      setRegisteredEmail(email);
      setSuccess(true);
      setLoading(false);
    }
  };

  // If registration successful, show email confirmation message
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <h1 className="text-4xl font-display font-bold gradient-text">📚 Masal Kutusu</h1>
            </Link>
          </div>

          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl font-display font-bold text-neutral-800 dark:text-neutral-100 mb-4">
              E-postanızı Kontrol Edin
            </h2>

            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-primary-800 dark:text-primary-200 font-medium mb-2">
                Kayıt işleminiz başarıyla tamamlandı!
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                <strong>{registeredEmail}</strong> adresine bir onay maili gönderdik.
              </p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">1</span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  E-posta gelen kutunuzu kontrol edin
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">2</span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  E-postadaki onay linkine tıklayın
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">3</span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Hesabınız onaylandıktan sonra giriş yapabilirsiniz
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                💡 E-postayı bulamadınız mı? Spam veya gereksiz klasörünü kontrol edin.
              </p>
            </div>

            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-warm-500 text-white rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Giriş Sayfasına Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-4xl font-display font-bold gradient-text">📚 Masal Kutusu</h1>
          </Link>
          <h2 className="text-2xl font-display font-bold text-neutral-800 dark:text-neutral-100 mb-2">
            Hesap Oluştur
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Ücretsiz hesabınızı oluşturun
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Ad Soyad
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                minLength={6}
                required
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                En az 6 karakter
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Şifre Tekrar
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Kayıt yapılıyor...
                </span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Zaten hesabınız var mı?{' '}
              <Link href={`/login?redirect=${redirect}`} className="text-primary-500 hover:text-primary-600 font-semibold">
                Giriş Yap
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-500">
              Kayıt olarak{' '}
              <Link href="/terms" className="underline hover:text-primary-500">
                Kullanım Koşulları
              </Link>{' '}
              ve{' '}
              <Link href="/privacy" className="underline hover:text-primary-500">
                Gizlilik Politikası
              </Link>
              'nı kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
