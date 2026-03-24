package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.AdminRegistrationInviteDto;
import com.sangui.sanguiblog.model.dto.PublicRegistrationInviteVerifyDto;
import com.sangui.sanguiblog.model.entity.RegistrationInvite;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.RegistrationInviteRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class RegistrationInviteService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final RegistrationInviteRepository registrationInviteRepository;
    private final UserRepository userRepository;

    @Transactional
    public AdminRegistrationInviteDto createInvite(Long creatorUserId, String durationCode) {
        DurationOption option = DurationOption.fromCode(durationCode);
        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new NotFoundException("生成邀请码的用户不存在"));

        Instant now = Instant.now();
        RegistrationInvite invite = new RegistrationInvite();
        invite.setInviteCode(generateUniqueInviteCode());
        invite.setExpiresAt(now.plus(option.getDuration()));
        invite.setCreatedBy(creator);
        invite.setCreatedAt(now);
        invite.setUpdatedAt(now);
        return toAdminDto(registrationInviteRepository.save(invite), option);
    }

    @Transactional(readOnly = true)
    public PublicRegistrationInviteVerifyDto verifyInvite(String inviteCode) {
        RegistrationInvite invite = registrationInviteRepository.findByInviteCodeIgnoreCase(normalizeInviteCode(inviteCode))
                .orElseThrow(() -> new IllegalArgumentException("邀请码不存在或已失效"));
        ensureInviteUsable(invite);
        PublicRegistrationInviteVerifyDto dto = new PublicRegistrationInviteVerifyDto();
        dto.setInviteCode(invite.getInviteCode());
        dto.setExpiresAt(invite.getExpiresAt());
        dto.setExpiresAtLabel(DATE_TIME_FORMATTER.format(invite.getExpiresAt()));
        return dto;
    }

    @Transactional
    public RegistrationInvite lockUsableInvite(String inviteCode) {
        RegistrationInvite invite = registrationInviteRepository.findByInviteCodeForUpdate(normalizeInviteCode(inviteCode))
                .orElseThrow(() -> new IllegalArgumentException("邀请码不存在或已失效"));
        ensureInviteUsable(invite);
        return invite;
    }

    @Transactional
    public void markConsumed(RegistrationInvite invite, User user) {
        invite.setConsumedBy(user);
        invite.setConsumedAt(Instant.now());
        invite.setUpdatedAt(Instant.now());
        registrationInviteRepository.save(invite);
    }

    private void ensureInviteUsable(RegistrationInvite invite) {
        if (invite.getConsumedAt() != null || invite.getConsumedBy() != null) {
            throw new IllegalArgumentException("邀请码已被使用");
        }
        if (invite.getExpiresAt() == null || invite.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("邀请码已过期");
        }
    }

    private String generateUniqueInviteCode() {
        for (int i = 0; i < 20; i++) {
            String candidate = "SG-" + randomSegment() + "-" + randomSegment() + "-" + randomSegment();
            if (!registrationInviteRepository.existsByInviteCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("邀请码生成失败，请稍后重试");
    }

    private String randomSegment() {
        StringBuilder builder = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            builder.append(CODE_CHARS[ThreadLocalRandom.current().nextInt(CODE_CHARS.length)]);
        }
        return builder.toString();
    }

    private String normalizeInviteCode(String inviteCode) {
        if (!StringUtils.hasText(inviteCode)) {
            throw new IllegalArgumentException("请输入邀请码");
        }
        return inviteCode.trim().replace(" ", "").toUpperCase(Locale.ROOT);
    }

    private AdminRegistrationInviteDto toAdminDto(RegistrationInvite invite, DurationOption option) {
        AdminRegistrationInviteDto dto = new AdminRegistrationInviteDto();
        dto.setInviteCode(invite.getInviteCode());
        dto.setDurationCode(option.getCode());
        dto.setDurationLabel(option.getLabel());
        dto.setCreatedAt(invite.getCreatedAt());
        dto.setExpiresAt(invite.getExpiresAt());
        dto.setExpiresAtLabel(DATE_TIME_FORMATTER.format(invite.getExpiresAt()));
        return dto;
    }

    @Getter
    enum DurationOption {
        MINUTES_5("MINUTES_5", "5分钟", Duration.ofMinutes(5)),
        HOURS_1("HOURS_1", "1小时", Duration.ofHours(1)),
        DAYS_1("DAYS_1", "1天", Duration.ofDays(1)),
        DAYS_10("DAYS_10", "10天", Duration.ofDays(10));

        private final String code;
        private final String label;
        private final Duration duration;

        DurationOption(String code, String label, Duration duration) {
            this.code = code;
            this.label = label;
            this.duration = duration;
        }

        static DurationOption fromCode(String code) {
            if (!StringUtils.hasText(code)) {
                return MINUTES_5;
            }
            for (DurationOption option : values()) {
                if (option.code.equalsIgnoreCase(code.trim())) {
                    return option;
                }
            }
            throw new IllegalArgumentException("不支持的邀请码时效选项");
        }
    }
}
