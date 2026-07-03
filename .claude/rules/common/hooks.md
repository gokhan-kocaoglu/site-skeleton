---
paths:
  - "**/*"
---
# Hook Sistemi

## Hook Tipleri

- **PreToolUse**: Araç çalışmadan önce (doğrulama, engelleme, sorma)
- **PostToolUse**: Araç çalıştıktan sonra (uyarı, otomatik kontrol)
- **TaskCreated**: Görev oluşturulduğunda (matcher YOK; blok = stderr + exit 2)
- **Stop**: Oturum kapanışında (final doğrulama)

## Fail-Safe Felsefesi (değişmez kural)

- Hook'un iç hatası (parse hatası, beklenmedik girdi) → **exit 0, izin ver**;
  stderr'e not düş. Hook asla kendi bug'ı yüzünden işi kilitleyemez.
- Yalnızca KANITLANMIŞ ihlal engellenir; şüphe varsa **ask**'e düş.
- Hook'lar Node.js'tir (`node "$CLAUDE_PROJECT_DIR/.claude/hooks/<ad>.js"`),
  yalnız stdlib kullanır; yol her zaman `$CLAUDE_PROJECT_DIR` üzerinden çözülür.

## Bu Repodaki Hook'lar (bağlama: `.claude/settings.json`)

| Hook | Tetik | Karar |
|------|-------|-------|
| pre-write-secret-scan | Write/Edit | Secret deseni → **deny** |
| pre-bash-git-guard | Bash | Tehlikeli git → **ask** |
| post-edit-style-guard | Edit/Write (tsx/css) | Ham hex, inline style, framer-motion → uyarı |
| memory-writer-guard | Write/Edit (project-memory/**) | Yazar steward değilse → **ask** |
| task-card-validator | TaskCreated | Kart alanı bozuksa **blok** (stderr + exit 2); hiç yoksa hatırlatma |
| session-close-validator | Stop / manuel | Current Status başlıkları + commit kanıtı yoksa kapanışı reddet |
| graph-first-reminder | Grep/grep-Bash | Graph varsa "graphify query kullan" hatırlatır |

## İzin Modu

- `dangerously-skip-permissions` ASLA kullanılmaz.
- Serbest/soru/yasak komut listeleri `settings.json` `permissions` bloğundadır;
  hook'larla bilinçli örtüşür (derinlemesine savunma).

## Görev Takibi

Çok adımlı işlerde todo/görev aracını kullan: adımları küçük tut, sırayı ve
eksikleri görünür kıl; yanlış yorumlanan gereksinim erken yakalanır.
