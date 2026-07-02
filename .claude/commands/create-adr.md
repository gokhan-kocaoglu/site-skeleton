---
description: >
  Mimari karar kaydı (ADR) üretir: adr-decision skill'ini başlatır,
  system-architect'e trade-off analizi yaptırır, docs/adr/ altına numaralı
  ADR yazar.
---

# /create-adr

1. `adr-decision` skill'ini yükle.
2. Karar konusunu netleştir (tek ADR = tek karar).
3. **system-architect** ajanına trade-off analizi yaptır
   (artılar/eksiler/alternatifler/net hüküm).
4. Sıradaki numarayla `docs/adr/ADR-<NNNN>-<kebab-baslik>.md` yaz
   (format: `docs/adr/ADR-0000-template.md`); statü `PROPOSED`.
5. Kullanıcı onayıyla `ACCEPTED` işaretle; vault kaydı için
   `HANDOFF → memory-steward` üret (06_Decisions linki).
