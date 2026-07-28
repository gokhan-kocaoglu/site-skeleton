---
description: >
  Yeni feature başlatır: feature-workflow skill'indeki gate zincirini yürütür.
  Gereksinim, UX/API etkisi ve kabul kriterleri netleşmeden kod yazılmaz.
---

# /start-feature

1. `feature-workflow` skill'ini yükle ve gate zincirini başlat.
2. Vault `Current Status` + proje brief'ini oku; feature hedefini yeniden ifade et.
3. **project-manager** ile scope + risk sınıfı + task DAG + kabul kriterleri
   çıkar; planı kullanıcı onayına sun (insan onay noktası).
   PM'nin ürettiği **bütün task card'lar FORMALDİR**: başlık veya gövde
   `TASK CARD` işaretini taşır ve `00_System/Task-Card-template.md` formatını
   kullanır. Formal kartta dört risk alanı (contract-impact · race-condition ·
   auth-boundary · rollback-plani) ZORUNLUDUR; eksikse `task-card-validator`
   kart oluşturmayı exit 2 ile reddeder ("N/A — <gerekçe>" geçerlidir).
4. Onay sonrası zinciri sırayla yürüt: (Architect) → (web ise UX +
   frontend-design-gate) → Developer(lar) → PM diff → QA → Security →
   (web ise SEO + style-audit) → Final review → memory → commit önerisi.
5. Her gate raporu kanıt içerir; FAIL'de remediation döngüsü uygulanır.
