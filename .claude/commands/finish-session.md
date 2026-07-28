---
description: >
  Oturum kapanışı: feature PR MERGE EDİLDİKTEN SONRA güncel main'den açılan
  closure dalında Current Status'u 7 zorunlu başlıkla günceller, session log
  yazar, closure + seal commit'lerini atar. session-close-validator eksik
  başlık, bayat durum ifadesi veya yanlış dal/ancestry görürse kapanışı reddeder.
---

# /finish-session

Memory closure **MERGE SONRASI** yapılır (Faz 8.3 P0-4): main korunmalıdır,
doğrudan push reddedilir, ve merge öncesi yazılan bir durum dosyası daha
mürekkebi kurumadan bayatlar.

## Ön koşullar (sekizi de doğrulanır; biri eksikse DUR)

1. Feature PR **merge edildi**.
2. Lokal main güncel: `git switch main; git pull --ff-only origin main`.
3. Feature **merge SHA** biliniyor (dal head'i değil).
4. **PR numarası** biliniyor.
5. **Post-merge main CI run ID/URL** biliniyor.
6. Closure dalı güncel main'den açıldı:
   `git switch -c chore/memory-close-<YYYY-MM-DD>-<project-slug>`.
7. Memory yazımı yalnız **memory-steward** üzerinden (tek-yazar; shell dahil).
8. Closure PR terminaldir — kendisi için yeni closure üretmez.

## Adımlar

1. `memory-protocol` skill'ini yükle.
2. Kapanış bayrağını kur: `.claude/hooks/.session-close-pending` dosyasına
   proje adını yaz (tek satır). Stop hook'u yalnız bu bayrak varken doğrular;
   doğrulama geçince bayrağı kendisi siler.
3. **memory-steward** üzerinden `Current Status.md`'yi güncelle — 7 zorunlu
   başlık dolu olmalı: `## Aşama` · `## Son Tamamlanan Görev` ·
   `## Aktif Görev` · `## Blocker` (yoksa "Yok") · `## Sonraki 3 Adım` ·
   `## Son Uygulama Commiti` (**feature merge commit'i** + PR no + post-merge
   main CI run ID/URL) · `## Memory Closure Commiti` (bu kapanışın commiti
   henüz atılmadığı için `PENDING — closure commit henüz oluşturulmadı`).
   "push/onay/merge/CI bekleniyor" tipi ifade KALAMAZ — validator reddeder.
4. Session log yaz: `08_Session_Logs/YYYY-MM-DD-session-<NN>.md`
   (şablon: `00_System/Session-Log-template.md`).
5. Doğrulama: `node .claude/hooks/session-close-validator.js --project <Proje>
   --closure` — başlık, bayat-durum, dal, dirty-path ve merge-SHA ancestry
   kontrolleri koşar; eksikse kapanış REDDEDİLİR.
6. **Memory closure commit'i:** yalnız `project-memory/**` (+ varsa memory
   kanıt dosyaları) kapsayan ayrı commit:
   `chore(memory): close session <YYYY-MM-DD>`.
7. **Mühür:** closure commit'ten SONRA Current Status'taki `PENDING — <not>`
   satırı gerçek closure hash'iyle değiştirilir ve tek satırlık mühür
   commit'i atılır: `chore(memory): seal <session> — closure hash <hash>`.
   Mühür commit'i hiçbir kanıt/raporda referanslanmaz — zincir orada sonlanır.
8. **Kapanış-sonrası tarama:** `node scripts/verify-structure.mjs` koş —
   kanıt raporları ve memory dosyaları gate koşusundan SONRA yazıldığı için
   yasak-pattern taraması onları ancak burada görür (CI #15 dersi). FAIL
   çıkarsa düzelt ve closure commit'ini amend etme; yeni fix commit'i at.
9. **Memory-only closure PR** aç (insan onaylı push) → required check'ler →
   merge. Bu PR için YENİ closure açılmaz; süreç burada biter.
10. Kullanıcıya kapanış özeti ver: yapılanlar · merge SHA + PR no + CI run ·
    closure ve seal hash'leri · sonraki adımlar.
