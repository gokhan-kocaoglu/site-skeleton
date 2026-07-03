package com.skeleton.api.payments;

import java.math.BigDecimal;

/**
 * Template: copy into apps/api/src/main/java/com/skeleton/api/payments/ to activate.
 * Provider-agnostic payment port — the provider decision is deferred
 * (docs/adr/ADR-0007-payment-provider.md, PROPOSED; Sprint 4 şerhi: this port is
 * a DRAFT and gets redesigned around the chosen provider's webhook/3DS/partial
 * capture model when the ADR is decided).
 *
 * Amounts are BigDecimal end to end and persisted as NUMERIC(12,2) (binding rule).
 * Webhook verification MUST validate the provider signature before trusting payload.
 *
 * Idempotency: every mutating call takes an idempotencyKey (caller-generated,
 * stored per operation). Retrying with the same key MUST NOT double-charge,
 * double-capture or double-refund — providers expose native support for this
 * (Stripe Idempotency-Key header, Iyzico conversationId).
 */
public interface PaymentProvider {

    /** Lifecycle of a payment as seen through the port. */
    enum PaymentStatus { AUTHORIZED, CAPTURED, FAILED, REFUNDED, PENDING_3DS }

    record PaymentRequest(String orderPublicId, BigDecimal amount, String currency) {}

    /** failureReason is null unless status == FAILED. */
    record PaymentResult(PaymentStatus status, String providerReference, String failureReason) {}

    /** Reserve the amount on the customer's payment method. */
    PaymentResult authorize(PaymentRequest request, String idempotencyKey);

    /** Capture a previously authorized payment. */
    PaymentResult capture(String providerReference, String idempotencyKey);

    /** Refund a captured payment, fully or partially. */
    PaymentResult refund(String providerReference, BigDecimal amount, String idempotencyKey);

    /** Verify a webhook's authenticity (signature check) before processing it. */
    boolean verifyWebhook(String payload, String signature);
}
