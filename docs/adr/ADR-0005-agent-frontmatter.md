# ADR-0005: Zengin Ajan/Skill Frontmatter'ı

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletin ajanları `name/description/tools/model` frontmatter'ı taşır; skill'ler
`name/description` ile yetinir. ruflo'da üç zenginleştirme gözlendi:

1. **`<example>` delegasyon blokları**: ajanın `description` alanına gömülü
   `<example>Context… user… assistant… <commentary>…</commentary></example>`
   senaryoları, orkestratörün "bu işi hangi ajana verayım" kararını örnekle besler
   (`refs/ruflo/.claude/agents/base-template-generator.md`).
2. **Skill başına `allowed-tools`**: skill frontmatter'ında araç kısıtı
   (`refs/ruflo/.claude/skills/github-project-management/SKILL.md`).
3. **Model bağlama**: ruflo'nun kendisi frontmatter'da `model:` KULLANMAZ —
   modeli merkezi router'a bırakır. Bizim iskelet ajan-başına `model:` bağlar;
   bu, ruflo'ya göre daha denetlenebilir bir tercihtir ve korunmalıdır.

## Decision

1. **`<example>` blokları eklensin**: en sık yanlış-delege edilen üç ajandan
   başlayarak (project-manager, code-reviewer, seo-specialist) her ajanın
   `description`'ına 1-2 kısa delegasyon örneği gömülür. 120 satır bütçesi
   korunur; örnekler gövdeden değil frontmatter'dan yer alır.
2. **Skill'lere `allowed-tools` eklensin**: özellikle salt-okunur olması gereken
   skill'ler (memory-protocol, token-optimization) araç kısıtıyla işaretlenir.
3. **`model:` frontmatter'da kalsın**: merkezi router'a taşınmaz (ADR-0001'in
   erteleme kararıyla tutarlı).

## Consequences

- (+) Orkestratör delegasyonu daha isabetli; yanlış ajan çağrısı azalır.
- (+) Skill araç kısıtı, yetki matrisinin (authority-map) skill katmanına uzantısıdır.
- (−) Frontmatter büyür; satır bütçeleri izlenmeli (manifest `maxLines` denetler).
- Takip: 9 ajan + 10 skill frontmatter revizyonu; manifest `requiredKeys` güncellemesi.

## Alternatives Considered

- **Delegasyon örneklerini ayrı dokümanda tutmak**: Reddedildi — orkestratör ajan
  seçerken yalnız frontmatter'ı görür; örnek ancak `description` içinde işe yarar.
- **ruflo gibi model'i frontmatter'dan çıkarmak**: Reddedildi — statik bağlama
  bizim maliyet/denetim modelimizin temelidir (bkz. authority-map).
