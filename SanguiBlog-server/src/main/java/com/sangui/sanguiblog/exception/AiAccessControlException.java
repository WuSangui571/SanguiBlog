package com.sangui.sanguiblog.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class AiAccessControlException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, Object> data;

    public AiAccessControlException(HttpStatus status, String message, Map<String, Object> data) {
        super(message);
        this.status = status;
        this.data = data == null ? Map.of() : Map.copyOf(data);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, Object> getData() {
        return data;
    }
}
