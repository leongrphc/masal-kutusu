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

## Lisans

MIT
