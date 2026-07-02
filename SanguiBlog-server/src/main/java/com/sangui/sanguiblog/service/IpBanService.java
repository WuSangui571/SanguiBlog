package com.sangui.sanguiblog.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.AdminBannedIpDto;
import com.sangui.sanguiblog.model.dto.AdminCreateIpBanRequest;
import com.sangui.sanguiblog.model.dto.AdminUnbanIpRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.BannedIp;
import com.sangui.sanguiblog.model.entity.IpBanAuditLog;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.BannedIpRepository;
import com.sangui.sanguiblog.model.repository.IpBanAuditLogRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.util.IpUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IpBanService {

    private static final Logger log = LoggerFactory.getLogger(IpBanService.class);
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int MAX_REASON_LENGTH = 512;
    static final String ACTION_BAN = "BAN";
    static final String ACTION_REBAN = "REBAN";
    static final String ACTION_UNBAN = "UNBAN";

    private final BannedIpRepository bannedIpRepository;
    private final IpBanAuditLogRepository ipBanAuditLogRepository;
    private final UserRepository userRepository;

    // 受信 IP -> 是否启用封禁 的短 TTL 缓存，避免每次 auth_request 读库；封禁/解封后即时失效。
    private final Cache<String, Boolean> banStateCache = Caffeine.newBuilder()
            .maximumSize(20_000)
            .expireAfterWrite(java.time.Duration.ofSeconds(30))
            .build();

    @Transactional
    public AdminBannedIpDto createBan(AdminCreateIpBanRequest request, Long actorUserId, String actorClientIp) {
        if (request == null || !StringUtils.hasText(request.getIp())) {
            throw new IllegalArgumentException("IP 不能为空");
        }
        String rawIp = request.getIp().trim();
        if (!IpUtils.isValidSingleIp(rawIp)) {
            throw new IllegalArgumentException("IP 格式非法，仅支持单个 IPv4/IPv6 地址");
        }
        if (rawIp.contains("/")) {
            throw new IllegalArgumentException("暂不支持 CIDR 网段封禁");
        }
        String ip = IpUtils.normalizeIp(rawIp);
        if (IpUtils.isPrivateOrProtected(ip)) {
            throw new IllegalArgumentException("不允许封禁回环/私有/链路本地等受保护地址");
        }
        if (StringUtils.hasText(actorClientIp) && ip.equals(IpUtils.normalizeIp(actorClientIp))) {
            throw new IllegalArgumentException("不允许封禁当前管理员自身的 IP");
        }
        String reason = trimReason(request.getReason());

        Optional<BannedIp> existingOpt = bannedIpRepository.findByIp(ip);
        LocalDateTime now = LocalDateTime.now();
        BannedIp saved;
        String action;
        if (existingOpt.isPresent()) {
            BannedIp existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getEnabled())) {
                // 已启用封禁：幂等返回，不重复写审计
                return toDto(existing);
            }
            // 之前已解封：复用同一行重新启用
            existing.setEnabled(true);
            existing.setReason(reason);
            existing.setUpdatedAt(now);
            existing.setUpdatedBy(loadUser(actorUserId));
            existing.setUnbannedAt(null);
            existing.setUnbannedBy(null);
            existing.setUnbanReason(null);
            saved = bannedIpRepository.save(existing);
            action = ACTION_REBAN;
        } else {
            BannedIp created = new BannedIp();
            created.setIp(ip);
            created.setReason(reason);
            created.setEnabled(true);
            created.setHitCount(0L);
            created.setCreatedAt(now);
            created.setCreatedBy(loadUser(actorUserId));
            created.setUpdatedAt(now);
            created.setUpdatedBy(loadUser(actorUserId));
            saved = bannedIpRepository.save(created);
            action = ACTION_BAN;
        }
        writeAudit(saved.getId(), action, ip, reason, actorUserId, request.getSourcePageViewId());
        invalidate(ip);
        return toDto(saved);
    }

    @Transactional
    public AdminBannedIpDto unban(Long banId, AdminUnbanIpRequest request, Long actorUserId) {
        if (banId == null) {
            throw new IllegalArgumentException("封禁记录 ID 不能为空");
        }
        BannedIp ban = bannedIpRepository.findById(banId)
                .orElseThrow(() -> new NotFoundException("封禁记录不存在"));
        String reason = trimReason(request != null ? request.getUnbanReason() : null);
        LocalDateTime now = LocalDateTime.now();
        ban.setEnabled(false);
        ban.setUpdatedAt(now);
        ban.setUpdatedBy(loadUser(actorUserId));
        ban.setUnbannedAt(now);
        ban.setUnbannedBy(loadUser(actorUserId));
        ban.setUnbanReason(reason);
        BannedIp saved = bannedIpRepository.save(ban);
        writeAudit(saved.getId(), ACTION_UNBAN, saved.getIp(), reason, actorUserId, null);
        invalidate(saved.getIp());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminBannedIpDto> list(int page, int size, String ip, Boolean enabledOnly) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 100);
        String ipFilter = StringUtils.hasText(ip) ? ip.trim() : null;
        boolean enabled = Boolean.TRUE.equals(enabledOnly);
        Page<BannedIp> result = bannedIpRepository.search(ipFilter, enabled, PageRequest.of(p, s));
        java.util.List<AdminBannedIpDto> records = result.getContent().stream()
                .map(this::toDto)
                .toList();
        return new PageResponse<>(records, result.getTotalElements(), result.getNumber() + 1, result.getSize());
    }

    /**
     * Nginx auth_request 内部访问检查。返回 true 表示放行，false 表示已封禁。
     * 命中封禁时累加 hitCount 与 lastHitTime。
     */
    public boolean isAccessAllowed(String ip) {
        if (!StringUtils.hasText(ip)) {
            return true;
        }
        String normalized = IpUtils.normalizeIp(ip);
        Boolean cached = banStateCache.getIfPresent(normalized);
        if (cached != null) {
            if (Boolean.FALSE.equals(cached)) {
                recordHitSafely(normalized);
            }
            return cached;
        }
        Boolean allowed = loadBanState(normalized);
        banStateCache.put(normalized, allowed);
        if (Boolean.FALSE.equals(allowed)) {
            recordHitSafely(normalized);
        }
        return allowed;
    }

    /**
     * 批量解析可见访问记录的封禁状态，返回 ip -> banId（仅启用封禁）。
     * 使用 REQUIRES_NEW 独立事务，避免封禁查询失败污染外层 analytics 事务导致整页 500。
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, readOnly = true)
    public Map<String, Long> resolveEnabledBanIds(Collection<String> ips) {
        if (ips == null || ips.isEmpty()) {
            return Map.of();
        }
        java.util.Set<String> normalized = new java.util.LinkedHashSet<>();
        for (String ip : ips) {
            if (StringUtils.hasText(ip)) {
                normalized.add(IpUtils.normalizeIp(ip));
            }
        }
        if (normalized.isEmpty()) {
            return Map.of();
        }
        Map<String, Long> result = new HashMap<>();
        for (BannedIp ban : bannedIpRepository.findByEnabledTrueAndIpIn(normalized)) {
            result.put(ban.getIp(), ban.getId());
        }
        return result;
    }

    private Boolean loadBanState(String normalizedIp) {
        try {
            return bannedIpRepository.findByIpAndEnabledTrue(normalizedIp).isEmpty();
        } catch (RuntimeException ex) {
            // DB 查询异常时 fail open（放行），仅记录安全元数据，避免单点故障导致全站 403
            log.warn("ip ban state lookup failed, fail open: ip={}", normalizedIp, ex);
            return Boolean.TRUE;
        }
    }

    private void recordHitSafely(String normalizedIp) {
        try {
            bannedIpRepository.incrementHit(normalizedIp, LocalDateTime.now());
        } catch (RuntimeException ex) {
            log.warn("ip ban hit count update failed: ip={}", normalizedIp, ex);
        }
    }

    private void invalidate(String normalizedIp) {
        try {
            banStateCache.invalidate(normalizedIp);
        } catch (RuntimeException ex) {
            log.warn("ip ban cache invalidation failed, short TTL will self-heal: ip={}", normalizedIp, ex);
        }
    }

    private void writeAudit(Long bannedIpId, String action, String ip, String reason, Long actorUserId, Long sourcePageViewId) {
        try {
            IpBanAuditLog audit = new IpBanAuditLog();
            audit.setBannedIpId(bannedIpId);
            audit.setAction(action);
            audit.setIp(ip);
            audit.setReason(reason);
            audit.setActorId(actorUserId);
            audit.setActorUsername(resolveUsername(actorUserId));
            audit.setSourcePageViewId(sourcePageViewId);
            audit.setCreatedAt(LocalDateTime.now());
            ipBanAuditLogRepository.save(audit);
        } catch (RuntimeException ex) {
            log.warn("ip ban audit write failed: action={}, ip={}, actorId={}", action, ip, actorUserId, ex);
        }
    }

    private String resolveUsername(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .map(User::getUsername)
                .orElse(null);
    }

    private User loadUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).orElse(null);
    }

    private String trimReason(String reason) {
        if (!StringUtils.hasText(reason)) {
            return null;
        }
        String trimmed = reason.trim();
        if (trimmed.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException("封禁/解封原因长度不能超过 " + MAX_REASON_LENGTH + " 个字符");
        }
        return trimmed;
    }

    private AdminBannedIpDto toDto(BannedIp ban) {
        Map<Long, String> usernameCache = new LinkedHashMap<>();
        return AdminBannedIpDto.builder()
                .id(ban.getId())
                .ip(ban.getIp())
                .reason(ban.getReason())
                .enabled(Boolean.TRUE.equals(ban.getEnabled()))
                .hitCount(ban.getHitCount() != null ? ban.getHitCount() : 0L)
                .lastHitTime(formatTime(ban.getLastHitTime()))
                .createdAt(formatTime(ban.getCreatedAt()))
                .createdBy(ban.getCreatedById() != null ? ban.getCreatedById() : userIdOf(ban.getCreatedBy()))
                .createdByUsername(usernameOf(ban.getCreatedBy(), usernameCache))
                .updatedAt(formatTime(ban.getUpdatedAt()))
                .updatedBy(ban.getUpdatedById() != null ? ban.getUpdatedById() : userIdOf(ban.getUpdatedBy()))
                .updatedByUsername(usernameOf(ban.getUpdatedBy(), usernameCache))
                .unbannedAt(formatTime(ban.getUnbannedAt()))
                .unbannedBy(ban.getUnbannedById() != null ? ban.getUnbannedById() : userIdOf(ban.getUnbannedBy()))
                .unbannedByUsername(usernameOf(ban.getUnbannedBy(), usernameCache))
                .unbanReason(ban.getUnbanReason())
                .build();
    }

    private Long userIdOf(User user) {
        return user != null ? user.getId() : null;
    }

    private String usernameOf(User user, Map<Long, String> cache) {
        if (user == null) {
            return null;
        }
        if (user.getUsername() != null) {
            return user.getUsername();
        }
        return cache.computeIfAbsent(user.getId(), id -> resolveUsername(id));
    }

    private String formatTime(LocalDateTime time) {
        return time != null ? DATE_TIME_FMT.format(time) : null;
    }
}
