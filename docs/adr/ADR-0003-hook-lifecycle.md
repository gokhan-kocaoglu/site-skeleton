# ADR-0003: Genişletilmiş Hook Yaşam Döngüsü

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletin 7 hook'u PreToolUse/PostToolUse/Stop olaylarını kapsar. ruflo yaşam
döngüsünün tamamını kullanır (`refs/ruflo/.claude/settings.json`):
**SessionStart** → memory restore (oturum açılışında bağlam geri yükleme),
**PreCompact** → `manual`/`auto` matcher'larıyla CLAUDE.md rehberliğinin compaction
öncesi yeniden enjeksiyonu, **SubagentStop** → ajan bitiminde checkpoint/feedback,
**SessionEnd** → kalıcılaştırma. Fail-safe disiplini bizimkiyle aynıdır ve ruflo'da
kod düzeyinde garantilidir: `hook-handler.cjs` `finally { process.exit(0) }` +
5 sn global zamanlayıcı ile HER durumda 0 döner; taşınabilirlik shell değil Node
üzerinden sağlanır (cross-platform handler, ADR-062).

## Decision

Üç genişletme öneriyoruz (hepsi mevcut `hooks/lib/common.js` fail-safe çekirdeğini
kullanır, yeni bağımlılık yok):

1. **SessionStart memory-restore**: oturum açılışında `_CLAUDE.md → Project Brief →
   Current Status` okuma sırasını `additionalContext` olarak enjekte eden hook.
2. **PreCompact yeniden-enjeksiyon**: compaction öncesi Mutlak Kurallar'ı (CLAUDE.md
   çekirdeği) bağlama geri basan hook — uzun oturumda kural erimesini önler.
3. **SubagentStop checkpoint**: ajan bitiminde HANDOFF dosyasının varlığını doğrulayan,
   yoksa uyaran hook (gate zincirinin dosya-tabanlı iletişim sözleşmesini korur).

Fail-safe değişmezi aynen kalır: iç hata → exit 0 + stderr notu; global timeout
eklenir (ruflo'daki 5 sn deseni). Windows/POSIX stratejisi değişmez: hook'lar
yalnız `node .claude/hooks/<ad>.js` ile çağrılır, shell sarmalayıcı kullanılmaz.

## Consequences

- (+) Uzun oturumlarda kural ve bağlam kaybı azalır; ajan zinciri denetlenebilir olur.
- (−) 3 yeni hook = 3 yeni test seti (harness'a ≥3'er fixture eklenmeli).
- Takip: `settings.json` bağlama + `.claude/rules/common/hooks.md` tablosu güncellenir.

## Alternatives Considered

- **ruflo'nun tek merkezi hook-handler'ına geçmek**: Reddedildi — bizim hook-başına-dosya
  modelimiz test edilebilirlik (fixture harness) açısından daha net.
- **Yalnız PreCompact almak**: Değerlendirildi — en yüksek değerli tek parça budur;
  kabul aşamasında kapsam buna daraltılabilir.
