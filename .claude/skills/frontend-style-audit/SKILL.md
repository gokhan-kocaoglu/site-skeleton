---
name: frontend-style-audit
description: >
  apps/web ve apps/admin için SALT-OKUNUR stil & motion guardrail taraması:
  inline style, component-içi style, ham hex, Tailwind v3 kalıbı,
  framer-motion importu, reduced-motion eksikliği. Frontend kapanışı, code
  review ve QA gate ÖNCESİ çalıştırılır; checklist + verdict üretir.
---

# Frontend Style Audit

Salt-okunur guardrail taraması: hiçbir dosya değiştirmez; ihlal listesi
(dosya:satır) + verdict üretir.

## Tarama Komutları (read-only)

`apps/web` ve `apps/admin` altında çalıştır. Beklenen: çoğunda **0 eşleşme**.

```bash
# 1. Statik inline style (yasak — istisna: runtime-hesaplanan değer, gerekçe yorumlu)
grep -rnE 'style=\{\{' apps/web apps/admin --include='*.tsx' --include='*.ts'

# 2. Component içi <style> / keyframe (yasak)
grep -rnE '<style|@keyframes' apps/web apps/admin --include='*.tsx' --include='*.ts'

# 3. Ham hex renk (yasak — yalnız packages/design-tokens/tokens.css içinde yasal)
grep -rnE '#[0-9a-fA-F]{3,8}\b' apps/web apps/admin --include='*.tsx' --include='*.ts' --include='*.css'

# 4. Tailwind v3 config sızıntısı (yasak — v4 CSS-first kullanılır)
find apps -name 'tailwind.config.*'

# 5. framer-motion importu (yasak — motion/react standardı)
grep -rnE "from ['\"]framer-motion['\"]" apps --include='*.tsx' --include='*.ts'

# 6. Animasyonlu component'te reduced-motion kontrolü (VAR olmalı)
grep -rln 'useReducedMotion\|prefers-reduced-motion' apps/web apps/admin

# 7. Arbitrary value aşırı kullanımı (gözden geçir — semantic token tercih edilir)
grep -rnE '\[[0-9]+px\]|\[#' apps/web apps/admin --include='*.tsx'

# 8. console.log kalıntısı
grep -rn 'console\.log' apps/web apps/admin --include='*.tsx' --include='*.ts'
```

PowerShell'de Grep aracıyla aynı desenler kullanılabilir; #6 yorum
satırındaki açıklama eşleşmelerini gerçek kullanımdan ayır.

## Manuel Kontrol Listesi

- [ ] Statik `style={{}}` yok (veya izinli istisna + gerekçe yorumu)
- [ ] Component içi `<style>`/keyframe yok
- [ ] Ham hex yok (yalnız `packages/design-tokens/tokens.css`)
- [ ] Tailwind v3 `tailwind.config.*` / `theme.extend` yok; v4 `@theme` var
- [ ] `framer-motion` importu yok; yalnız `motion/react`
- [ ] Animasyonlu component'lerde reduced-motion desteği var
- [ ] SEO-kritik içerik canvas/animasyon-only değil (semantic HTML mevcut)
- [ ] Checkout/auth/admin/form akışları düşük animasyonlu
- [ ] Tasarım aracı kullanıldıysa evidence dosyası mevcut
  (yoksa limitation kaydı — uydurma "kullanıldı" iddiası FAIL nedeni)
- [ ] Token sapması yok (tüm görsel değerler design-tokens üzerinden)

## Verdict

`PASS` / `PASS_WITH_RISKS` / `FAIL` + ihlal listesi (dosya:satır) + öneri.
Blocker ihlal varken kapanışa/commit'e geçilmez.
