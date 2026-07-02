package com.skeleton.api.payments;

import java.math.BigDecimal;

/**
 * Template: copy into apps/api/src/main/java/com/skeleton/api/payments/ to activate.
 * Provider-agnostic payment port — the provider decision is deferred
 * (docs/adr/ADR-0007-payment-provider.md, PROPOSED).
 *
 * Amounts are BigDecimal end to end and persisted as NUMERIC(12,2) (binding rule).
 * Webhook verification MUST validate the provider signature before trusting payload.
 */
public interface PaymentProvider {

    record PaymentRequest(String orderPublicId, BigDecimal amount, String currency) {}

    record PaymentResult(boolean success, String providerReference, String failureReason) {}

    /** Reserve the amount on the customer's payment method. */
    PaymentResult authorize(PaymentRequest request);

    /** Capture a previously authorized payment. */
    PaymentResult capture(String providerReference);

    /** Refund a captured payment, fully or partially. */
    PaymentResult refund(String providerReference, BigDecimal amount);

    /** Verify a webhook's authenticity (signature check) before processing it. */
    boolean verifyWebhook(String payload, String signature);
}
