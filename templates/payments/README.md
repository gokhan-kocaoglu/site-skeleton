# Payments Template (provider-agnostic port)

Provider choice is deliberately deferred — see `docs/adr/ADR-0007-payment-provider.md`
(PROPOSED). The skeleton ships the port only; adapters stay empty until the ADR
is decided per project.

## Contents

| File | Role |
|------|------|
| `PaymentProvider.java` | The port: authorize / capture / refund / verifyWebhook, `PaymentStatus` enum, per-call `idempotencyKey` |
| `IyzicoPaymentProvider.java` | Empty adapter (throws `UnsupportedOperationException`) |
| `StripePaymentProvider.java` | Empty adapter (throws `UnsupportedOperationException`) |

## Activation

1. Decide the provider: move ADR-0007 to ACCEPTED (or write a superseding ADR).
2. Copy the three files into `apps/api/src/main/java/com/skeleton/api/payments/`.
3. Implement the chosen adapter; add the provider SDK to `apps/api/pom.xml`.
4. Enable the coupon module if the site is paid (`templates/db/coupons.sql`) —
   coupon passivation must share the payment-confirmation transaction.
5. Webhook secrets go to environment variables, NEVER into files
   (see `.claude/rules/common/security.md`).
6. When implementing `verifyWebhook`, compare signatures with a
   **constant-time** comparison (e.g. `MessageDigest.isEqual`), never
   `String.equals`. Persist each operation's `idempotencyKey` so retries can
   be recognized across restarts.

Money is `BigDecimal` end to end, persisted as `NUMERIC(12,2)` (binding rule).

> Sprint 4 şerhi (ADR-0007): bu port bir TASLAKTIR. Sağlayıcı seçiminde port,
> sağlayıcının webhook / 3DS / partial-capture modeline göre yeniden tasarlanır.
