# Masal Kutusu Mobile

Çocuklar için yapay zeka destekli, sesli masallar oluşturan Expo tabanlı React Native uygulaması.

## Özellikler

- 🎯 Yaş grubuna ve temaya göre özelleştirilmiş masallar
- 🎵 Metin-konuşma (TTS) ile sesli çıktı
- 🔐 Supabase ile kimlik doğrulama
- 💳 Paket ve kredi görüntüleme akışı
- 📱 iOS, Android ve Web desteği

## Teknoloji

- **Framework**: Expo + React Native
- **Navigation**: React Navigation
- **Backend**: Supabase Auth + mevcut web API backend'i
- **Audio**: Expo AV
- **Billing**: Expo IAP
- **Language**: TypeScript

## Gereksinimler

- Node.js 18+
- npm
- Expo Go veya yerel emulator/simulator

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` dosyasını kendi değerlerinizle doldurun:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=https://your-api-base-url
EXPO_PUBLIC_IOS_BASIC_SUBSCRIPTION_SKU=basic_monthly_ios_sku
EXPO_PUBLIC_ANDROID_BASIC_SUBSCRIPTION_SKU=basic_monthly_android_sku
EXPO_PUBLIC_IOS_PREMIUM_SUBSCRIPTION_SKU=premium_monthly_ios_sku
EXPO_PUBLIC_ANDROID_PREMIUM_SUBSCRIPTION_SKU=premium_monthly_android_sku
EXPO_PUBLIC_IOS_UNLIMITED_SUBSCRIPTION_SKU=unlimited_monthly_ios_sku
EXPO_PUBLIC_ANDROID_UNLIMITED_SUBSCRIPTION_SKU=unlimited_monthly_android_sku
```

## Çalıştırma

```bash
npm start
npm run android
npm run ios
npm run web
```

## Kontrol Komutları

```bash
npm run typecheck
npm run doctor
npm run check
```

- `typecheck`: TypeScript tip kontrolünü çalıştırır.
- `doctor`: Expo yapılandırmasını ve bağımlılık uyumunu kontrol eder.
- `check`: release öncesi hızlı doğrulama için typecheck + doctor adımlarını birlikte çalıştırır.
- Sentry entegrasyonu eklendiği için Metro yapılandırması `metro.config.js` üzerinden yönetilir.

## Release Akışı

```bash
npm run build:preview:android
npm run build:production:android
npm run build:preview:ios
npm run build:production:ios
npm run submit:production:android
```

Notlar:
- Android production submit için `mobil/google-service-account.json` dosyasını yerel olarak ekleyin. Bu dosya git'e dahil edilmez.
- EAS build çalıştırmadan önce Expo hesabında oturum açmış olmanız gerekir.
- iOS production dağıtımı için Apple tarafı kimlik bilgilerini EAS üzerinde tamamlamanız gerekir.
- Sentry source map upload için `SENTRY_AUTH_TOKEN` ortam değişkenini build ortamında tanımlayın.
- Uygulama içi hata takibi için `EXPO_PUBLIC_SENTRY_DSN` değerini sağlayın; boş bırakılırsa Sentry kapalı çalışır.

## Proje Yapısı

```
App.tsx                      # Provider ve uygulama giriş noktası
src/navigation/              # React Navigation stack yapısı
src/screens/                 # Home, auth, dashboard ve pricing ekranları
src/components/              # Yeniden kullanılabilir UI bileşenleri
src/contexts/                # Auth ve tema context'leri
src/lib/                     # Supabase istemcisi
src/constants/               # Config, tema ve sabit veriler
assets/                      # Uygulama görselleri ve ikonlar
```

## Notlar

- Uygulama backend tarafındaki mevcut API endpoint'lerine bağlanır.
- Environment değişkenleri tanımlı değilse uygulama başlarken hata verir.
- Geliştirme sırasında API adresi olarak erişilebilir bir backend URL'i kullanın.
- Release öncesinde en az `npm run check` komutunu çalıştırın.
- Android submit için gereken servis hesabı anahtarını repo dışı tutun ve yalnızca yerel makinede kullanın.

## Native IAP Kararı

- `PricingScreen` artık ücretli planlar için doğrudan backend `POST /api/subscription/purchase` endpoint'ini çağırmıyor; native billing foundation `mobil/src/lib/billing.ts` üzerinden ilerliyor.
- Ücretli planlar için iOS/Android SKU değerleri environment üzerinden yönetilir ve store ürün sorgusu Expo IAP ile yapılır.
- Şu anda backend receipt doğrulama / abonelik aktivasyon kontratı hazır olmadığı için ücretli CTA'lar güvenli biçimde bloklanır; kullanıcıya neden aktif olmadıkları açıkça gösterilir.
- Gerçek satın alma testi için Expo Go yeterli değildir; development build veya release build gerekir.
- Sonuç olarak store release öncesi hâlâ Apple In-App Purchase + Google Play Billing ürünleri ve backend doğrulama akışı tamamlanmalıdır.

## Crash Reporting Kararı

- Şu anda uygulama hataları çoğunlukla `console.error` ile loglanıyor (`AuthContext`, `HomeScreen`, `DashboardScreen`, `PricingScreen`, `AudioPlayer`) ve store release için uzaktan hata takibi yok.
- Expo tabanlı mevcut yapı için en uygun ilk çözüm Sentry'dir; Expo ve EAS akışıyla uyumludur, release build hata/crash takibi ve source map yükleme desteği sağlar.
- Bu nedenle store release öncesi önerilen yol Sentry entegrasyonu eklemek, DSN bilgisini environment üzerinden yönetmek ve en kritik auth/subscription/story/audio akışlarında hata bağlamı göndermektir.
- Sentry eklenene kadar mevcut durum yalnızca lokal debug seviyesinde görünürlük sağlar; production crash analizi için yeterli değildir.

## Store Release Checklist

Release öncesi minimum kontrol listesi:

- [ ] `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` ve `EXPO_PUBLIC_API_BASE_URL` production değerleri tanımlı.
- [ ] `npm run check` başarılı.
- [ ] EAS için doğru hesap oturumu açık ve production profile hazır.
- [ ] Android submit için `mobil/google-service-account.json` yerelde mevcut.
- [ ] Uygulama ikonları, splash ve bundle/package kimlikleri (`app.json`) doğru.
- [ ] Ücretli planlar store'a çıkacaksa Apple In-App Purchase ve Google Play Billing ürünleri tanımlandı, `EXPO_PUBLIC_IOS_*` / `EXPO_PUBLIC_ANDROID_*` SKU değerleri production ortamında girildi ve backend receipt doğrulama tamamlandı; tamamlanmadıysa ücretli CTA'lar store sürümünde bloklu kaldı.
- [ ] Sentry veya eşdeğer crash reporting çözümü production build'e eklendi.
- [ ] Giriş, kayıt, masal oluşturma, geçmiş, dashboard ve pricing akışları gerçek cihaz/emülatörde smoke test edildi.
- [ ] `npm run build:production:android` ve gerekiyorsa `npm run build:production:ios` ile release build alındı.
- [ ] Store açıklamaları, ekran görüntüleri, gizlilik/policy alanları ve destek iletişimi güncel.

## Lisans

MIT
