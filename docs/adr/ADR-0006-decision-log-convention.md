# ADR-0006: Bileşen Başına Karar Günlüğü Konvansiyonu

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletin tüm ADR'leri tek merkezi günlükte yaşar (`docs/adr/ADR-NNNN-*.md`).
ruflo iki katman kullanır: merkezi günlükler (`v3/docs/adr/ADR-NNN-*`) VE her
plugin'in kendi `docs/adrs/0001-<slug>-contract.md` günlüğü — ilk kayıt o
bileşenin "sözleşmesini" tanımlar (`refs/ruflo/plugins/ruflo-core/docs/adrs/`).
Ajanlara ADR'ler bağlayıcı sözleşme olarak okutulur ("the ADR wins on
architectural decisions"). Gözlenen zayıflık: ruflo'nun iki merkezi dizini
arasında numara çakışmaları var (iki ayrı `ADR-027-*` gibi) — çok-günlüklü
düzenin bilinen riski.

## Decision

1. **Merkezi günlük tek numara otoritesi kalır**: `docs/adr/ADR-NNNN-*.md`,
   numaralar tekil ve ardışık; `adr-decision` skill'i yalnız buraya yazar.
   (ruflo'daki numara çakışması sınıfı böylece imkânsızlaşır.)
2. **Bileşen sözleşmesi deseni sınırlı alınır**: bir `templates/` modülü gerçek
   projede AKTİVE edildiğinde, aktivasyon kararı merkezi günlükte bileşen-önekli
   başlıkla açılır (ör. `ADR-00NN-payments-activation.md`) ve modülün README'sine
   geri-bağlantı eklenir. Ayrı `docs/adrs/` alt-günlükleri AÇILMAZ.
3. **ADR'lerin bağlayıcılığı kurallaşır**: `.claude/rules/common/patterns.md`'e
   "mimari çelişkide ACCEPTED ADR kazanır" cümlesi eklenir (ruflo'nun
   ajan-sözleşmesi ilkesinin damıtımı).

## Consequences

- (+) Tek numara uzayı: çakışma yok, `ls docs/adr/` tam kronoloji verir.
- (+) Şablon modülleri aktive eden projeler karar izini merkezde bulur.
- (−) Çok büyüyen projede merkezi günlük kalabalıklaşabilir; bileşen öneki ve
  index README'siyle hafifletilir.
- Takip: `adr-decision` skill'ine bileşen-önekli adlandırma notu.

## Alternatives Considered

- **ruflo tarzı bileşen-başına ayrı `docs/adrs/` günlükleri**: Reddedildi —
  ruflo'da bile numara çakışması üretti; bizim ölçekte dağılma maliyeti,
  yerellik kazancından büyük.
- **ADR'leri yalnız vault'ta (06_Decisions) tutmak**: Reddedildi — vault
  operasyoneldir ve proje-bazlıdır; kararın canonical evi repo'dur (brief §5).
