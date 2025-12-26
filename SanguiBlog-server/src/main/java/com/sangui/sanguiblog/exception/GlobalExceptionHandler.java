package com.sangui.sanguiblog.exception;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.exception.LoginChallengeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.core.env.Environment;

import java.util.Arrays;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final Environment environment;

    public GlobalExceptionHandler(Environment environment) {
        this.environment = environment;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.fail(ex.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String message = ex.getReason();
        if (message == null || message.isBlank()) {
            message = status >= 500
                    ? (shouldExposeErrorDetail() ? "服务器内部错误" : "服务器内部错误")
                    : "请求失败";
        }
        if (status >= 500 && !shouldExposeErrorDetail()) {
            message = "服务器内部错误";
        }
        return ResponseEntity.status(status).body(ApiResponse.fail(message));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException ex) {
        return ResponseEntity.status(403).body(ApiResponse.fail(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + " " + e.getDefaultMessage())
                .orElse("参数校验失败");
        return ResponseEntity.badRequest().body(ApiResponse.fail(msg));
    }

    @ExceptionHandler(LoginChallengeException.class)
    public ResponseEntity<ApiResponse<Object>> handleLoginChallenge(LoginChallengeException ex) {
        var data = new java.util.HashMap<String, Object>();
        data.put("captchaRequired", ex.isCaptchaRequired());
        data.put("remainingAttempts", ex.getRemainingAttempts());
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage(), data));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception ex) {
        log.error("未捕获异常", ex);
        String message = shouldExposeErrorDetail()
                ? (ex.getMessage() != null ? ex.getMessage() : "服务器内部错误")
                : "服务器内部错误";
        return ResponseEntity.internalServerError().body(ApiResponse.fail(message));
    }

    private boolean shouldExposeErrorDetail() {
        if (environment == null) {
            return false;
        }
        String[] profiles = environment.getActiveProfiles();
        if (profiles == null || profiles.length == 0) {
            return false;
        }
        return Arrays.stream(profiles).anyMatch(p -> "dev".equalsIgnoreCase(p) || "local".equalsIgnoreCase(p));
    }
}
