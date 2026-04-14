# Masal Kutusu Mobile

Çocuklar için AI tabanlı hikaye oluşturan React Native uygulaması.

## Özellikler

- 🎯 Yaş grubuna göre özelleştirilmiş hikayeler
- 🎵 Metin-konuşma (TTS) ile ses çıktısı
- 🎨 Açık tema tasarımı
- 🔐 Supabase ile kimlik doğrulama
- 📱 iOS, Android ve Web desteği

## Teknoloji

- **Framework**: React Native & Expo
- **Routing**: Expo Router
- **Backend**: Supabase (Auth & Database)
- **Audio**: Expo AV
- **Language**: TypeScript

## Başlangıç

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Expo CLI (opsiyonel)

### Kurulum

```bash
npm install
```

### Çalıştırma

```bash
npm start          # Expo sunucusunu başlat
npm run android    # Android emülatörde aç
npm run ios        # iOS simülatörde aç
npm run web        # Web tarayıcıda aç
```

## Yapı

```
app/                 # Sayfalar ve layout'lar (Expo Router)
├── auth/            # Login ve register sayfaları
├── tabs/            # Ana uygulama sekmesi
lib/                 # API ve Supabase entegrasyonu
components/          # Yeniden kullanılabilir bileşenler
constants/           # Tema ve konfigürasyon
assets/              # İkonlar ve görseller
```

## Ortam Değişkenleri

`.env.local` dosyası oluşturun:

```
EXPO_PUBLIC_API_URL=your_api_url
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Lisans

MIT
