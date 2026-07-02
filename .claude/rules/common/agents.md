---
paths:
  - "**/*"
---
# Ajan Orkestrasyonu

## Takım

Ajan tanımları `.claude/agents/` altındadır. Orkestratör ana oturumdur; ajanlar
birbirleriyle HANDOFF dosyaları üzerinden konuşur (şablon: vault `00_System/`).

| Ajan | Görev | Model |
|------|-------|-------|
| project-manager | Planlama, task DAG, diff kontrolü | opus |
| system-architect | Mimari kararlar, ADR | opus |
| ux-ui-designer | UX akışı, wireframe, tasarım gate | sonnet |
| frontend-developer | web/admin geliştirme | sonnet |
| backend-developer | api geliştirme, migration | sonnet |
| seo-specialist | SEO denetimi (yalnız web işleri) | sonnet |
| qa-test-specialist | Test yazımı, quality gate | sonnet |
| code-reviewer | Kod + güvenlik incelemesi | opus |
| memory-steward | project-memory tek yazarı | haiku |

## Anında Delegasyon (kullanıcı onayı gerekmez)

1. Karmaşık özellik talebi → **project-manager**
2. Mimari karar → **system-architect**
3. Kod yazıldı/değişti → **code-reviewer**
4. Test/`quality-gate` işi → **qa-test-specialist**
5. `project-memory/` yazımı → YALNIZ **memory-steward**

## Paralel Çalıştırma

Bağımsız işler için ajanları HER ZAMAN aynı mesajda paralel başlat:

```markdown
# DOĞRU: 3 ajan tek mesajda paralel
1. Ajan 1: auth modülü güvenlik analizi
2. Ajan 2: cache katmanı performans incelemesi
3. Ajan 3: util fonksiyonları type-check

# YANLIŞ: Gereksiz sıralı çalıştırma
```

## Çok-Perspektifli Analiz

Karmaşık problemlerde rolleri bölünmüş alt-ajanlar kullan:
- Olgusal denetçi (yalnız kanıt)
- Kıdemli mühendis (tasarım)
- Güvenlik uzmanı
- Tutarlılık ve tekrar denetçisi

## Sınırlar

- Her ajan yalnız `docs/operations/authority-map.md` içindeki yollarına yazar.
- Gate zinciri sırası `feature-workflow` skill'inde tanımlıdır; atlama yok.
