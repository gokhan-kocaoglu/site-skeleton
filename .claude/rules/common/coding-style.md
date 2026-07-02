---
paths:
  - "**/*"
---
# Kodlama Stili

## Değişmezlik (KRİTİK)

HER ZAMAN yeni nesne üret, mevcut olanı ASLA mutasyona uğratma:

```
YANLIŞ:  modify(original, field, value) → orijinali yerinde değiştirir
DOĞRU:   update(original, field, value) → değişiklikli yeni kopya döner
```

Gerekçe: gizli yan etkileri önler, debug'ı kolaylaştırır, güvenli eşzamanlılık sağlar.

## Temel İlkeler

- **KISS**: Çalışan en basit çözümü tercih et; erken optimizasyon yapma;
  zekice değil, açık kod yaz.
- **DRY**: Tekrarlanan mantığı ortak fonksiyona çıkar; kopyala-yapıştır
  sapmasından kaçın; soyutlamayı gerçek tekrar oluşunca ekle.
- **YAGNI**: İhtiyaç doğmadan özellik/soyutlama kurma; spekülatif genellik yok.

## Dosya Organizasyonu

ÇOK SAYIDA KÜÇÜK DOSYA > AZ SAYIDA BÜYÜK DOSYA:
- Yüksek uyum, düşük bağlaşım
- Tipik 200–400 satır, en fazla 800
- Tip'e göre değil, özellik/domain'e göre organize et

## Hata Yönetimi

- Her katmanda hatayı açıkça ele al; ASLA sessizce yutma
- UI'a dönük kodda kullanıcı-dostu mesaj; sunucuda detaylı bağlam logla

## Girdi Doğrulama

- Sistem sınırlarında HER girdiyi doğrula (kullanıcı, API yanıtı, dosya içeriği)
- Şema-tabanlı doğrulama kullan (Zod / Bean Validation); erken ve net hata ver
- Dış veriye asla güvenme

## İsimlendirme

- Değişken/fonksiyon: `camelCase`, açıklayıcı isim
- Boolean: `is`, `has`, `should`, `can` öneki
- Arayüz/tip/bileşen: `PascalCase`; sabitler: `UPPER_SNAKE_CASE`
- Custom hook: `use` önekiyle `camelCase`

## Kaçınılacak Kod Kokuları

- **Derin nesting**: mantık yığılmaya başlayınca erken return kullan
- **Sihirli sayılar**: eşik/gecikme/limitler için isimli sabit
- **Uzun fonksiyonlar**: net sorumluluklu parçalara böl

## Tamamlanma Öncesi Kontrol

- [ ] Okunabilir ve iyi isimlendirilmiş
- [ ] Fonksiyonlar küçük (<50), dosyalar odaklı (<800)
- [ ] Derin nesting yok; hata yönetimi var
- [ ] Hardcoded değer yok (sabit veya config)
- [ ] Mutasyon yok
