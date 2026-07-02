---
description: >
  memory-steward'a kontrollü handoff: bekleyen HANDOFF'ları toplar, tek yazar
  kuralıyla vault'u güncelletir. Secret/credential asla memory'ye yazılmaz.
---

# /update-memory

1. `memory-protocol` skill'ini yükle.
2. Oturumdaki bekleyen `HANDOFF → memory-steward` bloklarını topla
   (ajan raporlarından); yoksa güncellenecek içeriği HANDOFF formatına dök.
3. **memory-steward** ajanını çağır; yalnız ilgili dosyalar güncellenir:
   `Current Status.md` · `Backlog.md` · ilgili rol dosyaları ·
   `06_Decisions/` · `07_Patterns/` (tekrarlanabilir çözüm varsa).
4. Kural hatırlatmaları: steward dışında kimse `project-memory/` yazmaz;
   secret/credential/kişisel veri memory'ye girmez; Current Status 6 zorunlu
   başlığını korur.
5. Steward raporunu (dokunulan dosyalar) kullanıcıya özetle.
