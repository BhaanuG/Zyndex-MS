package com.zyndex.subscription;

public enum PaymentStatus {
    PENDING,
    PAYMENT_INITIATED,
    PROCESSING,
    SUCCESS,
    FAILED,
    EXPIRED,
    CANCELLED,
    REVIEW_REQUIRED;

    public boolean isTerminal() {
        return this == SUCCESS || this == FAILED || this == EXPIRED || this == CANCELLED;
    }
}
