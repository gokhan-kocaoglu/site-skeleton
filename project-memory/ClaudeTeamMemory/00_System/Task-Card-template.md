# Task Card Şablonu

PM her specialist'e bu kartı verir. Belirsiz "projeyi incele" görevi yasak;
ajan sohbet geçmişini miras almaz — gerekli karar, sınır ve kanıt kartta yazılır.

```text
TASK CARD
- gorev-adi:
- ajan:                 (project-manager | system-architect | ux-ui-designer |
                         frontend-developer | backend-developer | seo-specialist |
                         qa-test-specialist | code-reviewer | memory-steward)
- faz:                  (Scope | Contract | Implementation | QA | Security |
                         Final Review | Closure)
- risk-sinifi:          (LOW | MEDIUM | HIGH)
- risk-tetikleyiciler:  (PM listesinden; yoksa "yok")
- mod:                  (Writer | Read-only)
- hedef:                (tek cümlelik amaç)
- girdiler:             (okunacak dosyalar/raporlar)
- owned-files:          (yazabileceği dosyalar — tek sahip kuralı)
- read-only-files:
- forbidden-files:      (en az: project-memory/** herkese; + göreve özel)
- kabul-kriterleri:     (komutla kanıtlanabilir)
- bagimliliklar:        (blockedBy görevler)
- handoff-hedefi:       (sonraki rol)
- escalation-tetikleyicileri:
- durma-kosulu:
```

## Risk Analizi Alanları (doldurulması zorunlu; "N/A — <gerekçe>" kabul)

```text
- contract-impact:      (API/tip sözleşmesi etkileniyor mu? nasıl?)
- race-condition:       (eşzamanlılık/yarış riski var mı? nerede?)
- auth-boundary:        (auth/yetki sınırına dokunuyor mu?)
- rollback-plani:       (geri alma nasıl yapılır?)
```

`task-card-validator` hook'u bu dört alanın dolu (veya gerekçeli N/A)
olduğunu doğrular. Boş bırakmak kartı geçersiz kılar.
