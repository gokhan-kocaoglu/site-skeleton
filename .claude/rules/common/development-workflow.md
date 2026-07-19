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
