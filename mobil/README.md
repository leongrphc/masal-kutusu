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

## Lisans

MIT
