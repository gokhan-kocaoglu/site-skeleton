---
name: token-optimization
description: >
  Context hijyeni ve token disiplini: yalnız gerekli dosyayı okuma,
  graph-önce-grep, model routing, /compact--/clear zamanlaması, ajan çıktısı
  odaklılığı. Uzun oturumlarda ve çok-ajanlı işlerde uygulanır.
---

# Token Optimization

## Okuma Disiplini

- Yalnız görevin gerektirdiği dosyaları oku; "her ihtimale karşı" okuma yok.
- Memory okuma sırasına uy (`memory-protocol` skill'i); asla tüm vault okunmaz.
- Uzun bağlamı role özel dosyalara özetleyerek taşı; brief'i her yere kopyalama.

## Graph-Önce-Grep

`graphify-out/graph.json` varsa kod tabanı soruları için önce
`graphify query "<soru>"`; ilişki için `graphify path`, kavram için
`graphify explain`. Ham grep taraması son çare. Kod değişikliğinden sonra
`graphify update .` (yalnız AST, LLM maliyeti yok).
Ayrıntı: `.claude/skills/graphify`.

## Model Routing

Tablo: `.claude/rules/common/performance.md` — planlama/mimari/inceleme →
opus; implementasyon/QA/UX/SEO → sonnet; memory-steward → haiku.
Deterministik dönüşümde (rename, format, toplu taşıma) LLM'e hiç gitme:
script yaz.

## Oturum Hijyeni

- Uzun oturumda `/compact`; konu tamamen değişince `/clear`.
- Bağlam penceresinin son %20'sinde büyük refaktöre/çok dosyalı işe BAŞLAMA;
  tek dosyalık işler güvenlidir.
- Checkpoint ≠ git: asıl güvenlik ağı sık ve küçük commit'lerdir.

## Ajan Çıktısı Disiplini

- Subagent çıktısı görev odaklı ve yapılandırılmış olur (HANDOFF formatı);
  sohbet geçmişi anlatılmaz.
- Task card'a yalnız gerekli karar/sınır/kanıt yazılır; tüm geçmiş değil.
- Current Status bir sonraki oturumun giriş noktasıdır — kısa tut.

## MCP Diyeti

Yeni MCP eklemeden önce sor: "bu bir skill/CLI ile çözülür mü?" Az MCP =
sağlıklı context (hedef: <10 MCP, <80 tool).
