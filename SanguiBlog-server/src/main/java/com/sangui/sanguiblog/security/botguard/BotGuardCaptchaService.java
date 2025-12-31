package com.sangui.sanguiblog.security.botguard;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.sangui.sanguiblog.model.dto.GuardCaptchaResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
public class BotGuardCaptchaService {

    private static final int CAPTCHA_LENGTH = 4;
    private static final Duration CAPTCHA_TTL = Duration.ofMinutes(5);
    private static final Duration CAPTCHA_CACHE = Duration.ofSeconds(60);
    private static final Duration CAPTCHA_RATE_LIMIT = Duration.ofSeconds(3);

    private static final char[] CHAR_POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private final SecureRandom random = new SecureRandom();
    private final BotGuardProperties props;

    private final Cache<String, CaptchaEntry> captchaByKey;
    private final Cache<String, Long> captchaRateByIp;
    private final Cache<String, GuardTokenEntry> guardTokenByToken;

    public BotGuardCaptchaService(BotGuardProperties props) {
        this.props = props;
        this.captchaByKey = Caffeine.newBuilder()
                .expireAfterWrite(CAPTCHA_TTL)
                .maximumSize(20000)
                .build();
        this.captchaRateByIp = Caffeine.newBuilder()
                .expireAfterWrite(CAPTCHA_RATE_LIMIT)
                .maximumSize(20000)
                .build();
        this.guardTokenByToken = Caffeine.newBuilder()
                .expireAfterWrite(props.getGuardTtl())
                .maximumSize(Math.max(1000, props.getMaxGuardTokens()))
                .build();
    }

    public GuardCaptchaResponse generateCaptcha(String ip, String userAgent, boolean forceRefresh) {
        String safeIp = ip != null ? ip : "";
        String safeUa = userAgent != null ? userAgent : "";
        String key = safeIp + "|" + safeUa;
        long nowMs = System.currentTimeMillis();

        Long rate = captchaRateByIp.getIfPresent(safeIp);
        if (rate != null) {
            throw new IllegalArgumentException("请求验证码过于频繁，请稍后再试");
        }
        captchaRateByIp.put(safeIp, nowMs);

        CaptchaEntry cached = captchaByKey.getIfPresent(key);
        if (!forceRefresh && cached != null && nowMs - cached.generatedAtMs <= CAPTCHA_CACHE.toMillis()) {
            return new GuardCaptchaResponse(cached.imageBase64, CAPTCHA_TTL.getSeconds());
        }

        String code = randomCode();
        String base64 = buildImageBase64(code);
        captchaByKey.put(key, new CaptchaEntry(code, base64, nowMs));
        return new GuardCaptchaResponse(base64, CAPTCHA_TTL.getSeconds());
    }

    public ResponseCookie verifyAndIssueCookie(String ip, String userAgent, String cSegment, String input) {
        if (!StringUtils.hasText(ip)) {
            throw new IllegalArgumentException("无法识别客户端 IP");
        }
        String safeUa = userAgent != null ? userAgent : "";
        String key = ip + "|" + safeUa;
        CaptchaEntry entry = captchaByKey.getIfPresent(key);
        if (entry == null) {
            throw new IllegalArgumentException("验证码已过期，请重新获取");
        }
        if (!StringUtils.hasText(input) || !entry.code.equalsIgnoreCase(input.trim())) {
            throw new IllegalArgumentException("验证码错误");
        }
        captchaByKey.invalidate(key);

        String token = UUID.randomUUID().toString().replace("-", "");
        guardTokenByToken.put(token, new GuardTokenEntry(hashUa(safeUa), safeSegment(cSegment), Instant.now()));

        return ResponseCookie.from(props.getGuardCookieName(), token)
                .httpOnly(true)
                .secure(props.isGuardCookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(props.getGuardTtl())
                .build();
    }

    public boolean isVerified(String token, String userAgent, String cSegment) {
        if (!StringUtils.hasText(token)) {
            return false;
        }
        GuardTokenEntry entry = guardTokenByToken.getIfPresent(token.trim());
        if (entry == null) {
            return false;
        }
        String safeUa = userAgent != null ? userAgent : "";
        String uaHash = hashUa(safeUa);
        if (!entry.uaHash.equals(uaHash)) {
            return false;
        }
        String seg = safeSegment(cSegment);
        return entry.cSegment.equals(seg);
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
        for (int i = 0; i < 6; i++) {
            g.setColor(new Color(random.nextInt(150), random.nextInt(150), random.nextInt(150)));
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = random.nextInt(width);
            int y2 = random.nextInt(height);
            g.drawLine(x1, y1, x2, y2);
        }
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

    private String hashUa(String ua) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest((ua != null ? ua : "").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } catch (Exception e) {
            return String.valueOf((ua != null ? ua : "").hashCode());
        }
    }

    private String safeSegment(String cSegment) {
        if (!StringUtils.hasText(cSegment)) {
            return "-";
        }
        String trimmed = cSegment.trim();
        return trimmed.length() > 64 ? trimmed.substring(0, 64) : trimmed;
    }

    private record CaptchaEntry(String code, String imageBase64, long generatedAtMs) {}

    private record GuardTokenEntry(String uaHash, String cSegment, Instant issuedAt) {}
}

