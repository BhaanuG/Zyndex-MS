package com.zyndex.subscription;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<?> handleApi(ApiException error, jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(error.status).body(Map.of(
            "timestamp", java.time.Instant.now().toString(),
            "status", error.status.value(),
            "error", error.status.getReasonPhrase(),
            "code", error.code != null ? error.code : error.status.name(),
            "message", error.getMessage(),
            "path", request.getRequestURI()
        ));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException error, jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
            "timestamp", java.time.Instant.now().toString(),
            "status", HttpStatus.NOT_FOUND.value(),
            "error", HttpStatus.NOT_FOUND.getReasonPhrase(),
            "code", "NOT_FOUND",
            "message", error.getMessage(),
            "path", request.getRequestURI()
        ));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException error, jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(Map.of(
            "timestamp", java.time.Instant.now().toString(),
            "status", HttpStatus.METHOD_NOT_ALLOWED.value(),
            "error", HttpStatus.METHOD_NOT_ALLOWED.getReasonPhrase(),
            "code", "METHOD_NOT_ALLOWED",
            "message", error.getMessage(),
            "path", request.getRequestURI()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAny(Exception error, jakarta.servlet.http.HttpServletRequest request) {
        log.error("Internal Server Error: ", error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "timestamp", java.time.Instant.now().toString(),
            "status", HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "error", HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
            "code", "INTERNAL_SERVER_ERROR",
            "message", "An unexpected server error occurred.",
            "path", request.getRequestURI()
        ));
    }
}
