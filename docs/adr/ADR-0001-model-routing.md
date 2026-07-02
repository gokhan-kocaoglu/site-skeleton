# ADR-0001: Karmaşıklık Katmanlı Model Yönlendirme ve LLM'siz Bypass

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletteki model dağılımı statiktir: ajan başına sabit model (opus/sonnet/haiku,
bkz. `docs/operations/authority-map.md`). ruflo ise görev başına dinamik yönlendirme
yapar (ADR-026/143): karmaşıklık skoru `< 0.3` → küçük model, `0.3–0.6` → orta,
`> 0.6` → büyük; deterministik dönüşümler (`var-to-const`, `remove-console` gibi
intent allowlist'i) hiç LLM'e gitmeden codemod olarak ~$0 maliyetle uygulanır
(`refs/ruflo/v3/implementation/adrs/ADR-026-agent-booster-model-routing.md`).
Bizim iskelette de deterministik işler (rename, format, taşıma) zaman zaman
gereksiz yere LLM'e gidiyor.

## Decision

İki adım öneriyoruz:

1. **LLM'siz bypass'ı kural olarak sabitle** (bugün uygulanabilir): deterministik
   dönüşümler için script/araç kullanımı zaten `.claude/rules/common/performance.md`'de
   var; buna ruflo'daki gibi açık bir "intent listesi" ekle (rename, import düzenleme,
   format, dosya taşıma, toplu metin değişimi → önce codemod/script dene).
2. **Katmanlı yönlendirmeyi ertele**: görev-başına karmaşıklık skoru (AST + metin
   harmanı) altyapı ister; ajan-başına statik model bağlama bizim ölçeğimizde yeterli.
   Bir projede token maliyeti sorun olursa bu ADR ACCEPTED'a çekilip skor eşikleri
   (`0.3 / 0.6` başlangıç değeri) benimsenir.

## Consequences

- (+) Deterministik işlerde sıfıra yakın maliyet ve daha hızlı dönüş.
- (+) Statik model tablosu basit ve denetlenebilir kalır.
- (−) Dinamik yönlendirme benimsenirse skorlayıcı bakımı ve yanlış-katman riski doğar.
- Takip: intent listesi `token-optimization` skill'ine işlenir.

## Alternatives Considered

- **ruflo'nun tam 3-katman router'ını kurmak**: Reddedildi — MCP tabanlı router +
  skor altyapısı iskeletin "az bağımlılık" ilkesine aykırı; kazanç ölçeğimizde küçük.
- **Her şeyi tek modelde koşturmak**: Reddedildi — maliyet/karmaşıklık dengesi
  ajan-başına statik dağılımla zaten daha iyi.
