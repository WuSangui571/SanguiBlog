package com.sangui.sanguiblog.exception;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.exception.LoginChallengeException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
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
        ex.printStackTrace();
        // Return actual error message for better debugging
        String message = ex.getMessage() != null ? ex.getMessage() : "服务器内部错误";
        return ResponseEntity.internalServerError().body(ApiResponse.fail(message));
    }
}
