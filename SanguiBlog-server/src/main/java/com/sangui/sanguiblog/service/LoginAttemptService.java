package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.CaptchaResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private static final int CAPTCHA_LENGTH = 4;
    private static final int FAIL_THRESHOLD = 3;
    private static final Duration FAIL_WINDOW = Duration.ofMinutes(10);
    private static final Duration CAPTCHA_TTL = Duration.ofMinutes(5);
    private static final Duration CAPTCHA_CACHE = Duration.ofSeconds(60);
    private static final Duration CAPTCHA_RATE_LIMIT = Duration.ofSeconds(5);

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>(); // key: ip
    private final Map<String, CaptchaHolder> captchaCache = new ConcurrentHashMap<>(); // key: ip|ua
    private final SecureRandom random = new SecureRandom();
    private static final char[] CHAR_POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    public void onFailure(String ip) {
        if (!StringUtils.hasText(ip)) return;
        Attempt attempt = attempts.computeIfAbsent(ip, k -> new Attempt());
        Instant now = Instant.now();
        if (attempt.lastFailAt != null && Duration.between(attempt.lastFailAt, now).compareTo(FAIL_WINDOW) > 0) {
            attempt.failCount = 0;
        }
        attempt.failCount++;
        attempt.lastFailAt = now;
    }

    public void onSuccess(String ip) {
        if (!StringUtils.hasText(ip)) return;
        attempts.remove(ip);
    }

    public boolean isCaptchaRequired(String ip) {
        Attempt attempt = attempts.get(ip);
        if (attempt == null) return false;
        Instant now = Instant.now();
        boolean inWindow = attempt.lastFailAt != null && Duration.between(attempt.lastFailAt, now).compareTo(FAIL_WINDOW) <= 0;
        boolean hitThreshold = attempt.failCount >= FAIL_THRESHOLD && inWindow;
        boolean captchaValid = attempt.captchaCode != null && attempt.captchaExpireAt != null && attempt.captchaExpireAt.isAfter(now);
        return hitThreshold || captchaValid;
    }

    public int remainingAttempts(String ip) {
        Attempt attempt = attempts.get(ip);
        if (attempt == null || attempt.lastFailAt == null) return FAIL_THRESHOLD;
        Instant now = Instant.now();
        if (Duration.between(attempt.lastFailAt, now).compareTo(FAIL_WINDOW) > 0) {
            return FAIL_THRESHOLD;
        }
        return Math.max(FAIL_THRESHOLD - attempt.failCount, 0);
    }

    public boolean validateCaptcha(String ip, String input) {
        Attempt attempt = attempts.get(ip);
        if (attempt == null || attempt.captchaCode == null || attempt.captchaExpireAt == null) {
            return false;
        }
        if (attempt.captchaExpireAt.isBefore(Instant.now())) {
            return false;
        }
        if (!StringUtils.hasText(input)) {
            return false;
        }
        return attempt.captchaCode.equalsIgnoreCase(input.trim());
    }

    public CaptchaResponse generateCaptcha(String ip, String userAgent) {
        String ua = userAgent != null ? userAgent : "";
        String cacheKey = ip + "|" + ua;
        Instant now = Instant.now();

        // 速率限制
        CaptchaHolder holder = captchaCache.get(cacheKey);
        if (holder != null && holder.generatedAt != null
                && Duration.between(holder.generatedAt, now).compareTo(CAPTCHA_RATE_LIMIT) < 0) {
            throw new IllegalArgumentException("请求验证码过于频繁，请稍后再试");
        }

        // 缓存 60s 内复用
        if (holder != null && holder.generatedAt != null
                && Duration.between(holder.generatedAt, now).compareTo(CAPTCHA_CACHE) <= 0
                && holder.imageBase64 != null && holder.code != null) {
            return new CaptchaResponse(holder.imageBase64, CAPTCHA_TTL.getSeconds(), true, remainingAttempts(ip));
        }

        Attempt attempt = attempts.computeIfAbsent(ip, k -> new Attempt());
        attempt.failCount = Math.max(attempt.failCount, FAIL_THRESHOLD); // 一旦触发过失败，保持需要验证码
        String code = randomCode();
        attempt.captchaCode = code;
        attempt.captchaExpireAt = Instant.now().plus(CAPTCHA_TTL);
        String base64 = buildImageBase64(code);
        captchaCache.put(cacheKey, new CaptchaHolder(code, base64, now));
        return new CaptchaResponse(base64, CAPTCHA_TTL.getSeconds(), true, remainingAttempts(ip));
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CAPTCHA_LENGTH);
        for (int i = 0; i < CAPTCHA_LENGTH; i++) {
            sb.append(CHAR_POOL[random.nextInt(CHAR_POOL.length)]);
        }
        return sb.toString();
    }

    private String buildImageBase64(String code) {
        final int width = 120;
        final int height = 46;
        System.setProperty("java.awt.headless", "true");
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        // 干扰线
        for (int i = 0; i < 6; i++) {
            g.setColor(new Color(random.nextInt(150), random.nextInt(150), random.nextInt(150)));
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = random.nextInt(width);
            int y2 = random.nextInt(height);
            g.drawLine(x1, y1, x2, y2);
        }
        // 扭曲文字
        g.setFont(new Font("Arial", Font.BOLD, 30));
        for (int i = 0; i < code.length(); i++) {
            AffineTransform original = g.getTransform();
            double angle = (random.nextDouble() - 0.5) * 0.5;
            g.rotate(angle, 20 + i * 25, 30);
            g.setColor(new Color(50 + random.nextInt(150), 50 + random.nextInt(150), 50 + random.nextInt(150)));
            g.drawString(String.valueOf(code.charAt(i)), 18 + i * 25, 32 + random.nextInt(6));
            g.setTransform(original);
        }
        g.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("生成验证码失败");
        }
    }

    private static class Attempt {
        int failCount = 0;
        Instant lastFailAt;
        String captchaCode;
        Instant captchaExpireAt;
    }

    private record CaptchaHolder(String code, String imageBase64, Instant generatedAt) {}
}
