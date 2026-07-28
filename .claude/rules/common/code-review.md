---
paths:
  - "**/*"
---
# Kod İnceleme Standartları

## Ne Zaman (ZORUNLU tetikleyiciler)

- Kod yazıldıktan veya değiştirildikten sonra
- Paylaşılan dala commit'ten önce
- Güvenlik-hassas kod değiştiğinde (auth, ödeme, kullanıcı verisi)
- Mimari değişikliklerde ve PR merge'inden önce

İnceleme istemeden önce: CI/otomatik kontroller yeşil, conflict çözülmüş,
dal hedef dalla güncel olmalı.

## İnceleme Kontrol Listesi

- [ ] Kod okunabilir, isimlendirme açık
- [ ] Fonksiyonlar odaklı (<50 satır), dosyalar tutarlı (<800 satır)
- [ ] Derin iç içe geçme yok (>4 seviye)
- [ ] Hatalar açıkça ele alınıyor; sessiz yutma yok
- [ ] Hardcoded secret/credential yok
- [ ] console.log / System.out kalıntısı yok
- [ ] Yeni işlevsellik için test var; kapsam eşikleri: [testing.md](testing.md)

## Güvenlik Tetikleyicileri — DUR ve code-reviewer ajanını kullan

Auth/yetkilendirme, kullanıcı girdisi, DB sorguları, dosya sistemi işlemleri,
dış API çağrıları, kriptografi, ödeme/finansal kod.

## Önem Seviyeleri

| Seviye | Anlamı | Aksiyon |
|--------|--------|---------|
| CRITICAL | Güvenlik açığı / veri kaybı riski | **BLOCK** — merge öncesi düzelt |
| HIGH | Bug veya ciddi kalite sorunu | **WARN** — düzeltilmeli |
| MEDIUM | Bakım/okunabilirlik endişesi | **INFO** — değerlendir |
| LOW | Stil, küçük öneri | **NOT** — opsiyonel |

## Karar Kuralı (disposition) — rapor verdict'inden AYRIDIR

Reviewer disposition, incelenen diff hakkındaki tavırdır:

- **Approve**: CRITICAL ve HIGH yok
- **Warning**: yalnız HIGH var (dikkatle merge)
- **Block**: CRITICAL var

Rapor verdict'i (`PASS` / `PASS_WITH_RISKS` / `FAIL`) buna otomatik eşlenmez:
Approve verilse bile **açık MEDIUM/LOW risk varsa rapor verdict'i zorunlu
olarak PASS_WITH_RISKS**'tir. Bağlayıcı tablo: [verdict-policy.md](verdict-policy.md)
kural 5.

## Sık Yakalanan Sorunlar

- Güvenlik: hardcoded credential, SQL injection (string birleştirme),
  XSS (kaçışsız girdi), path traversal, eksik CSRF, auth bypass
- Kalite: uzun fonksiyon/dosya, derin nesting (erken return kullan),
  eksik hata yönetimi, mutasyon, eksik test
- Performans: N+1 sorgu, sayfalama eksikliği, sınırsız sorgu, eksik cache

## Akış

1. `git diff` ile değişiklikleri anla
2. Önce güvenlik listesi, sonra kalite listesi
3. İlgili testleri çalıştır; kapsamı doğrula
4. Detaylı inceleme için **code-reviewer** ajanına delege et

İlişkili: [testing.md](testing.md), [security.md](security.md),
[git-workflow.md](git-workflow.md), [agents.md](agents.md)
