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
4. Onay sonrası zinciri sırayla yürüt: (Architect) → (web ise UX +
   frontend-design-gate) → Developer(lar) → PM diff → QA → Security →
   (web ise SEO + style-audit) → Final review → memory → commit önerisi.
5. Her gate raporu kanıt içerir; FAIL'de remediation döngüsü uygulanır.
