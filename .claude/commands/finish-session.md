---
description: >
  Oturum kapanışı: Current Status'u 7 zorunlu başlıkla günceller, session log
  yazar, ayrı memory-closure commit'i atar. session-close-validator hook'u
  eksik başlık veya commit kanıtı yoksa kapanışı reddeder.
---

# /finish-session

Kapanış İKİ ayrı commit'ten oluşur (Faz 8.1, audit #9): önce uygulama
commit'i, sonra memory yazımı, en sonda ayrı memory-closure commit'i.

1. `memory-protocol` skill'ini yükle.
2. **Uygulama commit'i tamamlanmış olmalı** — oturumun kod/doc değişiklikleri
   commit'li değilse önce onları commit'le (insan onayıyla). Hash'i not al.
3. Kapanış bayrağını kur: `.claude/hooks/.session-close-pending` dosyasına
   proje adını yaz (tek satır). Stop hook'u yalnız bu bayrak varken doğrulama
   yapar; doğrulama geçince bayrağı kendisi siler.
4. **memory-steward** üzerinden `Current Status.md`'yi güncelle — 7 zorunlu
   başlık dolu olmalı: `## Aşama` · `## Son Tamamlanan Görev` ·
   `## Aktif Görev` · `## Blocker` (yoksa "Yok") · `## Sonraki 3 Adım` ·
   `## Son Uygulama Commiti` (adım 2'deki hash + mesaj) ·
   `## Memory Closure Commiti` (bu kapanışın commiti henüz atılmadığı için
   `PENDING — <not>` yazılır; bir önceki kapanış hash'i biliniyorsa o da eklenir).
5. Session log yaz: `08_Session_Logs/YYYY-MM-DD-session-<NN>.md`
   (şablon: `00_System/Session-Log-template.md`).
6. Doğrulama: `session-close-validator` başlıkları ve commit kanıtını
   kontrol eder; eksikse kapanış REDDEDİLİR. (Manuel:
   `node .claude/hooks/session-close-validator.js --project <ProjeAdi>`.)
7. **Memory closure commit'i:** yalnız `project-memory/**` (+ varsa memory
   kanıt dosyaları) kapsayan ayrı commit — mesaj formatı:
   `chore(memory): close session <YYYY-MM-DD>` (insan onayıyla push).
8. **Mühür (milestone/sertifikasyon kapanışında zorunlu):** closure
   commit'ten SONRA Current Status'taki `PENDING — <not>` satırı gerçek
   closure hash'iyle değiştirilir ve tek satırlık mühür commit'i atılır:
   `chore(memory): seal <session> — closure hash <hash>`. Mühür commit'i
   hiçbir kanıt/raporda referanslanmaz — zincir orada sonlanır.
9. **Kapanış-sonrası tarama:** `node scripts/verify-structure.mjs` koş —
   kanıt raporları ve memory dosyaları gate koşusundan SONRA yazıldığı için
   yasak-pattern taraması onları ancak burada görür (CI #15 dersi). FAIL
   çıkarsa düzelt ve closure commit'ini amend etme; yeni fix commit'i at.
10. Kullanıcıya kapanış özeti ver: yapılanlar · iki commit'in hash'leri ·
    sonraki adımlar.
