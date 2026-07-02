package com.skeleton.api.payments;

import java.math.BigDecimal;

/**
 * Empty Stripe adapter — intentionally unimplemented until ADR-0007 is ACCEPTED.
 * Implementation checklist: add the Stripe SDK to pom.xml, map PaymentRequest to
 * PaymentIntent, read API keys from environment variables (never from files).
 */
public final class StripePaymentProvider implements PaymentProvider {

    @Override
    public PaymentResult authorize(PaymentRequest request) {
        throw notImplemented();
    }

    @Override
    public PaymentResult capture(String providerReference) {
        throw notImplemented();
    }

    @Override
    public PaymentResult refund(String providerReference, BigDecimal amount) {
        throw notImplemented();
    }

    @Override
    public boolean verifyWebhook(String payload, String signature) {
        throw notImplemented();
    }

    private static UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "Stripe adapter is not implemented — decide via docs/adr/ADR-0007-payment-provider.md");
    }
}
