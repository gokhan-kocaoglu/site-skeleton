# ClaudeTeamMemory — Vault Kuralları

Bu vault, ajan takımının **operasyonel hafızasıdır** (katman 2). Canonical
karar ve kanıt repo `docs/` altındadır (katman 1); vault onları tekrarlamaz,
işaret eder.

## Okuma Sırası (token-minimal — asla tüm vault okunmaz)

1. Bu dosya (`_CLAUDE.md`)
2. `01_Projects/<Proje>/Project Brief.md`
3. `01_Projects/<Proje>/Current Status.md`
4. Görevin gerektirdiği rol dosyaları (yalnız ilgili olanlar)
5. Gerekirse son session log

## Tek Yazar Kuralı

Bu vault'a YALNIZ **memory-steward** ajanı yazar (kapanışta, QA + Security +
Final Review PASS sonrası). Diğer ajanlar `HANDOFF → memory-steward` gönderir
(şablon: `00_System/HANDOFF-template.md`).

## Klasör Düzeni

- `00_System/` — şablonlar ve vault konvansiyonları (proje bağımsız)
- `01_Projects/<Proje>/` — proje başına bir klasör; `_TEMPLATE` kopyalanarak
  açılır (`/new-project` komutu)
  - Kök: `Project Brief.md` · `Current Status.md` · `Backlog.md`
  - Rol klasörleri: `01_PM` · `02_UX_UI` · `03_Backend` · `04_Frontend` ·
    `05_QA` · `06_Decisions` · `07_Patterns` · `08_Session_Logs`

## Current Status Disiplini

7 zorunlu başlık (hook doğrular): `## Aşama` · `## Son Tamamlanan Görev` ·
`## Aktif Görev` · `## Blocker` · `## Sonraki 3 Adım` · `## Son Uygulama Commiti` ·
`## Memory Closure Commiti`. Kısa tut; detay rol dosyalarına.

## Yazılmayacaklar (ihlal = hook bloğu)

Secret, API anahtarı, token, credential, `.env` değeri, MCP config içeriği,
kişisel path. Gerekirse redakte referans kullan.

## İsimlendirme

`00_System/naming-conventions.md` dosyasına bak.
