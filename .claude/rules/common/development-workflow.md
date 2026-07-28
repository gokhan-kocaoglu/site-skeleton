---
paths:
  - "**/*"
---
# Geliştirme Akışı

> Bu dosya [git-workflow.md](./git-workflow.md)'yi, git işlemlerinden önceki
> tam geliştirme süreciyle genişletir. Uçtan uca gate zinciri için
> `.claude/skills/feature-workflow` skill'ine bak.

## Özellik Geliştirme Adımları

0. **Araştır ve Yeniden Kullan** _(yeni implementasyondan önce zorunlu)_
   - Önce mevcut kod tabanını ara (graph varsa `graphify query`, yoksa Grep)
   - Kütüphane davranışını birincil dokümandan doğrula; sürüm detayını tahmin etme
   - Util yazmadan önce registry'leri kontrol et (npm, Maven Central);
     kanıtlanmış kütüphaneyi elle yazılana tercih et
   - Problemi %80+ çözen uyarlanabilir açık kaynak varsa, porta/sarmalamaya öncelik ver

1. **Önce Plan**
   - **project-manager** ajanıyla implementasyon planı çıkar
   - Bağımlılıkları ve riskleri belirle; fazlara böl
   - Mimari etki varsa **system-architect** + ADR (`adr-decision` skill'i)

2. **TDD Yaklaşımı**
   - Önce test yaz (RED) → geçir (GREEN) → iyileştir (REFACTOR)
   - Kapsam: kademeli eşikler — bkz. [testing.md](./testing.md)

3. **Kod İncelemesi**
   - Kod yazıldıktan hemen sonra **code-reviewer** ajanı
   - CRITICAL ve HIGH bulgular çözülmeden ilerleme yok

4. **Quality Gate + Commit**
   - `pnpm gate` (ve API değiştiyse `mvn verify`) yeşil olmadan commit yok
   - Commit formatı: [git-workflow.md](./git-workflow.md)

5. **İnceleme Öncesi Kontroller**
   - Otomatik kontroller yeşil, conflict çözülmüş, dal güncel
   - Kanıtsız PASS bildirimi yasak: komut çıktısı olmadan "geçti" deme

6. **Merge-Sonrası Memory Kapanışı** _(bağlayıcı sıra — main korumalıdır)_
   - Sıra: implementation dalı → PR → required check'ler → **merge** →
     lokal main güncellenir → merge SHA + PR no + post-merge main CI run
     kaydedilir → `chore/memory-close-<YYYY-MM-DD>-<slug>` dalı → memory
     closure commit'i → seal → memory-only closure PR → merge.
   - Memory closure implementasyon dalında YAPILMAZ; "memory → commit → push"
     eski sırası geçersizdir (Faz 8.3 P0-4).
   - Closure PR terminaldir: kendisi için yeni closure üretmez.
   - Ayrıntı: `memory-protocol` skill'i · `/finish-session`.
