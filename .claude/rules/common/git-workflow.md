---
paths:
  - "**/*"
---
# Git Akışı

## Commit Mesaj Formatı

```
<tip>: <açıklama>

<opsiyonel gövde>
```

Tipler: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

- Açıklama emir kipinde ve küçük harfle başlar; 72 karakteri aşma.
- Gövdede "ne" değil "neden" anlatılır.

## İnsan Onayı Gereken Noktalar

- `git push` — HER ZAMAN kullanıcı onayıyla
- `push --force`, `reset --hard`, `checkout .`, `clean -f` — tehlikeli;
  hook sorar, gerekçesiz çalıştırma
- Yayınlanmış migration'ı düzenlemek YASAK (yenisini ekle)

## Pull Request Akışı

1. Tüm commit geçmişini analiz et (yalnız son commit değil)
2. `git diff <base-branch>...HEAD` ile toplam değişikliği gör
3. Kapsamlı PR özeti + test planı yaz
4. Yeni dalda `-u` bayrağıyla push et (onay sonrası)

## Dal Disiplini

- Varsayılan dala doğrudan commit yerine iş dalı aç: `feat/<konu>`, `fix/<konu>`
- Dal ömrünü kısa tut; küçük ve sık PR
- `main` korumalıdır: doğrudan push reddedilir, her şey PR'dan geçer.

## Memory Closure Dalı (merge sonrası)

Memory kapanışı feature dalında yapılmaz. Feature PR merge edildikten ve lokal
main güncellendikten SONRA:

```text
chore/memory-close-<YYYY-MM-DD>-<project-slug>
```

- Yalnız `project-memory/**` (+ açıkça izin verilmiş closure kanıtı) taşır;
  implementasyon değişikliği bu PR'a giremez.
- `Son Uygulama Commiti` = gerçek **feature merge commit'i** (+ PR no +
  post-merge main CI run); dal head'i değil.
- **Terminal istisna:** memory-only closure PR kendisi için yeni memory
  closure üretmez — aksi hâlde her closure yeni closure gerektirir (sonsuz
  döngü). Zincir bu PR'ın merge'iyle biter.
- `session-close-validator --closure` dal adını, dirty-path'leri ve merge-SHA
  ancestry'sini doğrular.

> Git öncesi tam geliştirme süreci (plan, TDD, inceleme) için
> [development-workflow.md](./development-workflow.md).
