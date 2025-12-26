package com.sangui.sanguiblog.exception;

/**
 * 资源不存在（用于返回明确的 404）。
 *
 * 说明：项目统一使用 ApiResponse 作为响应体，交由 GlobalExceptionHandler 映射为 404。
 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
