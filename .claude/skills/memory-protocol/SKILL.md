---
name: memory-protocol
description: >
  Token-minimal iki katmanlı memory protokolü: repo docs/ (canonical karar +
  kanıt) ve Obsidian vault (operasyonel durum). Okuma sırası, tek-yazar kuralı,
  Current Status disiplini ve MERGE SONRASI session kapanışı. Her oturum başında
  ve memory işlemlerinde kullanılır.
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

Tek-yazar kuralı yalnız Write/Edit için değil **shell için de** geçerlidir:
`project-memory/**` hedefine yazan kabuk komutları (`>`, `>>`, `Set-Content`,
`Out-File`, `Add-Content`, `Tee-Object`, `tee`, `cp`/`copy`/`Copy-Item`,
`mv`/`move`/`Move-Item`) `pre-bash-memory-guard` hook'uyla **ask**'e düşer.

Steward erişilemezse specialist'ler YİNE yazmaz; handoff'lar kuyruklanır,
güvenli kapanış mümkün değilse güncelleme **PENDING** bırakılır.

## Current Status Disiplini

7 zorunlu başlık (hook doğrular — eksikse kapanış reddedilir):
`## Aşama` · `## Son Tamamlanan Görev` · `## Aktif Görev` · `## Blocker` ·
`## Sonraki 3 Adım` · `## Son Uygulama Commiti` · `## Memory Closure Commiti`
(closure commit'i yazım anında henüz yoksa `PENDING — <not>`).

`## Son Uygulama Commiti` feature dalının head'i DEĞİL, gerçek **feature merge
commit'i**dir; aynı bölümde **PR numarası**, **merge SHA** ve **post-merge main
CI run ID/URL** birlikte kaydedilir. Kısa tutulur; detay rol dosyalarına gider.

## Kanıt Yeniden-Üretilebilirliği (bağlayıcı)

Her kanıt dosyası (test raporu, audit, gate çıktısı) üretildiği koşunun
**commit hash'ini** içerir. Commit'lenmemiş kodla üretilen kanıt geçersizdir;
rapor, koşulan working-tree'nin hash'ini `git log --oneline -1` ile kaydeder.
Repo-içi kanıt pre-merge koşuyu gösterir; final zincir dış attestation'da
mühürlenir (`docs/operations/release-attestation.md`).

## Yazılmayacaklar (hook da tarar)

Secret, API anahtarı, token, credential, `.env` değeri, MCP config içeriği,
kişisel path. Tespit edilirse redakte referansla geçilir.

## Session Kapanışı — MERGE SONRASI (bağlayıcı)

Ruleset main'e doğrudan push'u reddeder; bu yüzden memory closure implementasyon
dalında YAPILMAZ. Sıra:

```text
implementation dalı biter → PR açılır → required check'ler yeşil → PR merge
→ lokal main origin/main ile güncellenir
→ merge SHA + PR no + post-merge main CI run kaydedilir
→ güncel main'den chore/memory-close-<yyyy-mm-dd>-<project-slug> dalı açılır
→ memory-steward Current Status + session log yazar → closure commit
→ closure hash Current Status'e yazılır → seal commit
→ memory-only closure PR → required check'ler → merge → süreç biter
```

**Terminal istisna (sonsuz döngü yasağı):** memory-only closure PR kendisi için
yeni bir memory closure ÜRETMEZ. Yalnız `project-memory/**` (+ açıkça izin
verilmiş closure kanıtı) taşır ve governance zincirinin son halkasıdır. Bu
istisna olmadan her memory PR yeni bir memory PR gerektirir.

## Bayat Durum Kalıpları (validator kalıp listesi)

`session-close-validator` şu kalıpları operasyonel bölümlerde (`Aşama`,
`Son Tamamlanan Görev`, `Aktif Görev`, `Blocker`, `Sonraki 3 Adım`,
`Son Uygulama Commiti`) bulursa kapanışı **reddeder** — merge sonrası bekleyen
iş kalamaz:

```text
push bekleniyor · push onayı bekleniyor · onay bekliyor ·
PR açılması bekleniyor · merge bekleniyor · CI bekleniyor · pending
```

`## Memory Closure Commiti` bu taramanın DIŞINDADIR: oradaki kontrollü
`PENDING — closure commit henüz oluşturulmadı` satırı meşru ara durumdur.
Kalıpların kod içi kaynağı: `.claude/hooks/lib/closure-guard.js`.

Closure modunda (`--closure` veya armed Stop bayrağı) ayrıca: closure dalında
olunduğu, çalışma ağacında memory dışı değişiklik bulunmadığı ve kayıtlı merge
SHA'nın `git merge-base --is-ancestor` ile HEAD atası olduğu doğrulanır. Git
yoksa bu katman uyarıyla atlanır; metin kontrolleri koşmaya devam eder.

**Mühür konvansiyonu (milestone/sertifikasyon kapanışı):** closure commit
atıldıktan SONRA steward, Current Status'taki `PENDING — <not>` satırını
gerçek closure hash'iyle değiştirir; tek satırlık
`chore(memory): seal <session> — closure hash <hash>` commit'i atılır.
Mühür commit'i hiçbir kanıt/raporda referanslanmaz — zincir orada sonlanır.
