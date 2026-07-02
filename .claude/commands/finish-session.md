---
description: >
  Oturum kapanışı: Current Status'u 6 zorunlu başlıkla günceller, session log
  yazar, kapanış özeti üretir. session-close-validator hook'u eksik başlık
  veya commit kanıtı yoksa kapanışı reddeder.
---

# /finish-session

1. `memory-protocol` skill'ini yükle.
2. **memory-steward** üzerinden `Current Status.md`'yi güncelle — 6 zorunlu
   başlık dolu olmalı: `## Aşama` · `## Son Tamamlanan Görev` ·
   `## Aktif Görev` · `## Blocker` (yoksa "Yok") · `## Sonraki 3 Adım` ·
   `## Son Commit Kanıtı` (hash + mesaj; `git log --oneline -1` çıktısı).
3. Session log yaz: `08_Session_Logs/YYYY-MM-DD-session-<NN>.md`
   (şablon: `00_System/Session-Log-template.md` — özet, değişen dosyalar,
   tamamlanan iş, kararlar, açık riskler/sorular, sonraki 3 adım,
   sonraki oturum başlangıç noktası).
4. Doğrulama: `session-close-validator` hook'u başlıkları ve commit kanıtını
   kontrol eder; eksikse kapanış REDDEDİLİR — eksiği tamamla, yeniden dene.
   (Manuel çalıştırma: `node .claude/hooks/session-close-validator.js
   --project <ProjeAdi>`.)
5. Kullanıcıya kapanış özeti ver: yapılanlar · commit durumu · sonraki adımlar.
