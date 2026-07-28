# HANDOFF Şablonu

Her ajan görev sonunda bu bloğu üretir; orkestratör sonraki ajanı bu dosya
yollarını referans göstererek çağırır. Memory değişikliği için hedef her
zaman `memory-steward`'dır.

```text
HANDOFF → project-manager
- target-file:      <yazılacak/okunacak dosya yolu>
- target-section:   <dosya içindeki bölüm; yoksa "-">
- operation:        ADD | UPDATE | DEPRECATE
- content-summary:  <1–3 cümle>
- source-evidence:  <dosya yolu + test/CI komut çıktısı referansı>
- status-tag:       PASS | PASS_WITH_RISKS | FAIL | BLOCKED
- open-risk:        <risk; yoksa "Yok">
- next-step:        <sonraki somut adım>
```

> Yukarıdaki hedef bir **örnektir**. Hedef, dokuz geçerli ajan adından biri
> olmak zorundadır (project-manager · system-architect · ux-ui-designer ·
> frontend-developer · backend-developer · seo-specialist · qa-test-specialist ·
> code-reviewer · memory-steward). Boş hedef veya `<...>` biçiminde yer tutucu
> bırakılamaz — `verify-structure` `handoffTargets` kuralı FAIL üretir.

## Kurallar

- `source-evidence` boş bırakılamaz — kanıtsız handoff kabul edilmez.
- `status-tag: FAIL` ise handoff sonraki role değil, remediation için
  PM'ye/orijinal implementer'a döner.
- Bir handoff'ta birden çok target-file olabilir; her biri ayrı satırda
  listelenir.
