# 📚 Masal Kutusu (Story Box) - Türkçe


**Masal Kutusu**, çocuklarınız için yapay zeka destekli, kişiselleştirilmiş ve sesli masallar oluşturan modern bir web uygulamasıdır. Google Gemini AI teknolojisini kullanarak her seferinde benzersiz hikayeler yaratır ve bu hikayeleri seslendirir.

## 🚀 Özellikler

*   **🤖 Yapay Zeka ile Masal Üretimi:** Konu, yaş aralığı (3-5, 6-8), uzunluk ve tema (Arkadaşlık, Cesaret vb.) seçeneklerine göre özelleştirilmiş masallar.
*   **🗣️ Sesli Anlatım:** Üretilen masalların otomatik olarak seslendirilmesi.
*   **🔒 Üyelik Sistemi:** Supabase ile güvenli giriş ve kayıt işlemleri.
*   **✨ Modern Arayüz:** Next.js ve TailwindCSS ile hazırlanmış, animasyonlu ve "glassmorphism" etkili şık tasarım.
*   **💳 Abonelik Yönetimi:** Kredi sistemi ve farklı üyelik paketleri (Ücretsiz, Premium vb.).
*   **📱 Mobil Uyumlu:** Tüm cihazlarda sorunsuz çalışan responsive tasarım.

## 🛠️ Teknolojiler

Bu proje aşağıdaki teknolojiler kullanılarak geliştirilmiştir:

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Dil:** [TypeScript](https://www.typescriptlang.org/)
*   **Stil:** [TailwindCSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
*   **Backend & Auth:** [Supabase](https://supabase.com/)
*   **AI Model:** [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (via `@google/genai`)
*   **State Yönetimi:** React Hooks

## ⚙️ Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Gereksinimler

*   Node.js (v18 veya üzeri)
*   npm veya yarn

### 2. Projeyi Kopyalayın

```bash
git clone https://github.com/kullaniciadi/masal-kutusu.git
cd masal-kutusu
```

### 3. Bağımlılıkları Yükleyin

```bash
npm install
# veya
yarn install
```

### 4. Çevresel Değişkenleri Ayarlayın

Kök dizinde `.env.local` adlı bir dosya oluşturun ve `.env.example` dosyasındaki değerleri kendi API anahtarlarınızla doldurun:

```env
# Google Gemini API Key
GOOGLE_GEMINI_API_KEY=api_key_buraya

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=supabase_url_buraya
NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase_anon_key_buraya
SUPABASE_SERVICE_ROLE_KEY=supabase_service_role_key_buraya
```

### 5. Uygulamayı Başlatın

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

---

# 📚 Masal Kutusu (Story Box) - English

**Masal Kutusu** is a modern web application that generates personalized, audio-narrated fairy tales for children using artificial intelligence. Utilizing Google Gemini AI custom stories are created and narrated uniquely every time.

## 🚀 Features

*   **🤖 AI Story Generation:** Customized stories based on topic, age range (3-5, 6-8), length, and theme (Friendship, Courage, etc.).
*   **🗣️ Audio Narration:** Automatic text-to-speech generation for the created stories.
*   **🔒 Authentication:** Secure login and registration via Supabase.
*   **✨ Modern UI:** Stylish design with animations and glassmorphism effects using Next.js and TailwindCSS.
*   **💳 Subscription Management:** Credit system and various subscription tiers (Free, Premium, etc.).
*   **📱 Mobile Responsive:** Seamless experience across all devices.

## 🛠️ Tech Stack

This project is built using:

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [TailwindCSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
*   **Backend & Auth:** [Supabase](https://supabase.com/)
*   **AI Model:** [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (via `@google/genai`)
*   **State Management:** React Hooks

## ⚙️ Installation & Setup

Follow these steps to run the project locally:

### 1. Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn

### 2. Clone the Repository

```bash
git clone https://github.com/username/masal-kutusu.git
cd masal-kutusu
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Environment Variables

Create a `.env.local` file in the root directory and fill in the values from `.env.example` with your own API keys:

```env
# Google Gemini API Key
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.
