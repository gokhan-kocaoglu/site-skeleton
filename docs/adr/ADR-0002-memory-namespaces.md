# ADR-0002: TTL'li Tipli Memory Namespace'leri ve Rezerve İsim Kaydı

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletin memory'si dosya tabanlıdır (`project-memory/` vault + `docs/`), tek yazarlı
ve şablonludur; kayıtların ömrü ve türü yönetilmez — eski session log'lar ve geçici
notlar süresiz birikir. ruflo memory'yi tipler ve süreler: kayıt türü enum'u
(`episodic | semantic | procedural | working | cache`), kayıt başına `expiresAt`
TTL'i ve konfig düzeyinde saklama süreleri (`shortTerm: "24h", longTerm: "30d"`)
(`refs/ruflo/v3/@claude-flow/memory/src/types.ts`, `settings.json`). Namespace
isimleri ise serbest metindir; `claude-memories`, `auto-memory` gibi iyi bilinen
isimler koda gömülüdür ama merkezi bir kayıt yoktur — çakışma riski ruflo'da açık
bir zayıflıktır.

## Decision

Vault'a hafif bir tip/ömür disiplini öneriyoruz:

1. **Tip**: her vault kaydı zaten klasörüyle tiplidir (01_PM…08_Session_Logs);
   buna `kalıcı` (karar/pattern) vs `geçici` (session log, handoff) ayrımı eklenir.
2. **TTL**: geçici kayıtlara saklama süresi tanımlanır (öneri: session log 90 gün,
   HANDOFF dosyaları iş kapanınca arşiv). Temizlik memory-steward'ın kapanış
   görevine eklenir — otomatik silme yok, steward önerir, insan onaylar.
3. **Rezerve isim kaydı**: `00_System/naming-conventions.md` tek rezerve-isim
   kaydı ilan edilir; yeni klasör/önek ancak oraya eklenerek açılabilir
   (ruflo'daki dağınık gömülü-isim sorununun önlemi).

## Consequences

- (+) Vault token-minimal kalır; okuma sırası kısa kayıtlarla çalışır.
- (+) İsim çakışması tek dosyadan denetlenir.
- (−) Steward'ın kapanış işi bir adım uzar (temizlik önerisi).
- Takip: `memory-protocol` skill'ine TTL tablosu; naming-conventions'a rezerve bölüm.

## Alternatives Considered

- **ruflo tarzı DB-tabanlı memory backend'i**: Reddedildi — Obsidian/dosya vault'u
  insan-okunur ve git-denetlenebilir; DB katmanı iskelete bağımlılık ekler.
- **TTL'siz devam**: Reddedildi — vault büyüdükçe okuma sırası ve steward maliyeti
  bozulur; ruflo'nun `retention` konfigi tam bu sorunu hedefliyor.
