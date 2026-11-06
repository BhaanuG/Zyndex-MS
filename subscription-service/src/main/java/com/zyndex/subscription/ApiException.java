package com.zyndex.subscription;

public class ApiException extends RuntimeException {
    public final org.springframework.http.HttpStatus status;
    public final String code;

    public ApiException(org.springframework.http.HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.code = status.name();
    }

    public ApiException(org.springframework.http.HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
