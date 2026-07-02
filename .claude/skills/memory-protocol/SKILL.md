---
name: memory-protocol
description: >
  Token-minimal iki katmanlı memory protokolü: repo docs/ (canonical karar +
  kanıt) ve Obsidian vault (operasyonel durum). Okuma sırası, tek-yazar kuralı,
  Current Status disiplini ve session kapanışı. Her oturum başında ve memory
  işlemlerinde kullanılır.
---

# Memory Protocol

## İki Katman

- **Katman 1 (repo, canonical)**: `docs/` — karar (ADR), contract, kanıt
  (test/audit raporları). Git ile yaşar.
- **Katman 2 (Obsidian, operasyonel)**: `project-memory/ClaudeTeamMemory/` —
  Current Status, backlog, rol notları, session log.

## Okuma Sırası (token-minimal — asla tüm vault okunmaz)

1. `project-memory/ClaudeTeamMemory/_CLAUDE.md`
2. `01_Projects/<Proje>/Project Brief.md`
3. `01_Projects/<Proje>/Current Status.md`
4. Görevin gerektirdiği rol dosyaları (01_PM … 07_Patterns içinden yalnız ilgili)
5. Gerekirse son session log

Kod tabanı sorusu için: `graphify-out/graph.json` varsa önce `graphify query`.

## Tek-Yazar Kuralı

`project-memory/` altına YALNIZ **memory-steward** yazar; yalnız QA +
Security + Final Review PASS sonrası, kapanışta çalışır. Diğer ajanlar şu
formatla handoff gönderir (şablon: `00_System/HANDOFF-template.md`):

```text
HANDOFF → memory-steward
- target-file / target-section / operation (ADD | UPDATE | DEPRECATE)
- content-summary
- source-evidence: (dosya yolu + test/CI çıktısı)
- status-tag: PASS | PASS_WITH_RISKS | FAIL | BLOCKED
- open-risk / next-step
```

Steward erişilemezse specialist'ler YİNE yazmaz; handoff'lar kuyruklanır,
güvenli kapanış mümkün değilse güncelleme **PENDING** bırakılır.

## Current Status Disiplini

6 zorunlu başlık (hook doğrular — eksikse kapanış reddedilir):
`## Aşama` · `## Son Tamamlanan Görev` · `## Aktif Görev` · `## Blocker` ·
`## Sonraki 3 Adım` · `## Son Commit Kanıtı`

Kısa tutulur; detay rol dosyalarına gider.

## Yazılmayacaklar (hook da tarar)

Secret, API anahtarı, token, credential, `.env` değeri, MCP config içeriği,
kişisel path. Tespit edilirse redakte referansla geçilir.

## Session Kapanışı

Oturum bitmeden `/finish-session`: Current Status güncellenir + session log
yazılır (`08_Session_Logs/`). Sonraki oturumun giriş noktası Current Status'tur.
