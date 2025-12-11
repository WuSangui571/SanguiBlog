package com.sangui.sanguiblog.exception;

import lombok.Getter;

@Getter
public class LoginChallengeException extends RuntimeException {
    private final boolean captchaRequired;
    private final int remainingAttempts;

    public LoginChallengeException(String message, boolean captchaRequired, int remainingAttempts) {
        super(message);
        this.captchaRequired = captchaRequired;
        this.remainingAttempts = Math.max(remainingAttempts, 0);
    }
}
