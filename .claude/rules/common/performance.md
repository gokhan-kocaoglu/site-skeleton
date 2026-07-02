---
paths:
  - "**/*"
---
# Performans ve Token Disiplini

## Model Yönlendirme Stratejisi

| Model | Kullanım |
|-------|----------|
| **haiku** | Hafif, sık çağrılan işler: memory-steward, format/özet işleri |
| **sonnet** | Ana geliştirme işi: developer/QA/UX/SEO ajanları |
| **opus** | En derin muhakeme: PM planlaması, mimari karar, kod inceleme |

Deterministik dönüşümlerde (rename, format, taşıma) LLM'e hiç gitme —
script yaz veya araç kullan.

## Graph-Önce-Grep

- `graphify-out/graph.json` varsa kod tabanı soruları için önce
  `graphify query "<soru>"` çalıştır; ham grep taramasından önce dene.
- Kod değişikliğinden sonra `graphify update .` (yalnız AST, LLM maliyeti yok).
- Ayrıntı: `.claude/skills/graphify` ve `token-optimization` skill'i.

## Bağlam Penceresi Yönetimi

Bağlam penceresinin son %20'sinde şunlara BAŞLAMA:
- Büyük ölçekli refaktör
- Çok dosyaya yayılan özellik implementasyonu
- Karmaşık etkileşim debug'ı

Düşük bağlam duyarlı işler (tek dosya düzenleme, bağımsız util, doküman
güncellemesi) her zaman güvenlidir.

## Memory Okuma Sırası (token-minimal)

`_CLAUDE.md → Project Brief → Current Status → rol dosyaları` — asla tüm
vault okunmaz. Ayrıntı: `memory-protocol` skill'i.

## Build Sorun Giderme

Build kırılırsa: hata mesajını analiz et → küçük adımlarla düzelt → her
düzeltmeden sonra doğrula. Aynı hatayı iki kez alıyorsan kök nedene in,
deneme-yanılma döngüsüne girme.
