# New Feature Report

## Analiz Kapsamı
- `feature-adviser.md` yöntemi temel alınarak mevcut mobil uygulama durumu yeniden değerlendirildi.
- Son tamamlanan geliştirmeler sonrası yeni fırsat alanları özellikle şu yüzeylerde incelendi:
  - HomeScreen üst alanı ve üretim giriş deneyimi
  - Bottom tab gezinme görünümü
  - Pricing sonrası self-service üyelik akışı
  - Dashboard işlem geçmişi görünürlüğü
  - Story history retention yüzeyi
  - Analytics temel katmanı

## Durum Özeti
Uygulama son iterasyonlarda güvenilirlik, görünür hata yönetimi ve retention açısından ciddi biçimde güçlendi. Artık en büyük kazanım alanı altyapı eksiklerinden çok **algılanan kalite**, **responsive polish**, **self-service üyelik derinliği** ve **ölçümleme verisini gerçek karar desteğine dönüştürmek** tarafında.

## Önceliklendirilmiş Yeni Fırsatlar

| Öncelik | Öneri | Neden önemli | Tahmini efor | Etkilenen alan |
|---|---|---|---|---|
| P1 | Home header’ı küçük ekranlar için kompaktlaştır | Kredi badge + hesap alanı dar ekranlarda sıkışıyor; ilk izlenim ve kullanılabilirlik etkileniyor | 1-2 saat | `src/screens/HomeScreen.tsx` |
| P1 | Bottom tab görünümünü modernleştir | Alt gezinme uygulamanın sürekli görünen ana yüzeyi; mevcut emoji ikonlar ürün kalitesini zayıf hissettiriyor | 2-4 saat | `src/navigation/AppNavigator.tsx`, yeni icon bileşeni |
| P1 | Store yönetimine doğrudan yönlendirme ekle | Self-service yardım katmanı var ama kullanıcıyı ilgili mağaza yönetimi yüzeyine götüren net aksiyon yok | 0.5-1 gün | Pricing / Dashboard |
| P2 | Analytics event’lerini gerçek telemetry aracına bağla | Şu an temel event noktaları var ama yalnız console seviyesinde; ürün kararları için merkezi görünürlük yok | 0.5-1 gün | `src/lib/analytics.ts` |
| P2 | Story history için filtreleme ekle | Favori, son oluşturulan ve sesli içerik arasında gezinmek retention değerini artırır | 0.5-1 gün | `src/screens/StoryHistoryScreen.tsx` |
| P2 | Dashboard transaction filtreleme ekle | İşlem geçmişi artık daha açıklayıcı; sonraki adım tür bazlı filtre ve tarih daraltması | 0.5-1 gün | `src/screens/DashboardScreen.tsx` |
| P3 | Pricing sonrası success state’i daha kalıcı hale getir | Şu an feedback kartı var; daha belirgin başarı rozeti veya geçici state güveni artırabilir | 2-3 saat | `src/screens/PricingScreen.tsx` |

## En Önemli Riskler

### 1. Responsive üst alan kalitesi
- **Seviye:** Orta
- **Durum:** Home üst bar küçük ekranlarda daralıyor.
- **Risk:** Kullanıcı daha ilk bakışta arayüzü sıkışık ve amatör algılayabilir.
- **Öneri:** Kredi badge’i kompaktlaştır, hesap CTA’sını daralt, spacing’i optimize et.

### 2. Gezinme kalitesinin ürün algısına etkisi
- **Seviye:** Orta
- **Durum:** Bottom tab halen emoji tabanlı ve sade.
- **Risk:** Ürün fonksiyonel olsa da premium algısı zayıf kalır.
- **Öneri:** İkon dili, active state ve tab bar yüksekliğini iyileştir.

### 3. Ölçümleme verisinin sınırlı kalması
- **Seviye:** Düşük-Orta
- **Durum:** Event noktaları var ama merkezi araca bağlı değil.
- **Risk:** Funnel darboğazları izlenemez.
- **Öneri:** Analytics katmanını Sentry breadcrumb veya ayrı telemetry hattına bağla.

## Önerilen Uygulama Sırası
1. Home header responsive düzeltmesi
2. Bottom tab görünümünün modernizasyonu
3. Pricing/Dashboard self-service yönlendirme derinliği
4. Analytics event’lerini merkezi görünürlüğe bağlama
5. Story history ve transaction filtreleme

## İlk Uygulama Dilimi
Bu rapordan sonra ilk uygulanacak iş olarak:
- Home header taşmasını çöz
- kredi badge’i küçült
- tab bar ikonlarını ve active state görünümünü modernleştir

Bu iki adım birlikte uygulamanın en görünür yüzeylerinde kalite etkisi yaratır.
