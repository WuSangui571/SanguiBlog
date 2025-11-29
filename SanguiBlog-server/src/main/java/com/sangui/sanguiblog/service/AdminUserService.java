package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.AdminUserDto;
import com.sangui.sanguiblog.model.dto.AdminUserRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.RoleOptionDto;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final StoragePathResolver storagePathResolver;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserDto> list(String keyword, String roleCode, int page, int size) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 100);
        Specification<User> spec = (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate predicate = cb.conjunction();
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.trim() + "%";
                predicate.getExpressions().add(
                        cb.or(
                                cb.like(root.get("username"), like),
                                cb.like(root.get("displayName"), like),
                                cb.like(root.get("email"), like)
                        )
                );
            }
            if (StringUtils.hasText(roleCode)) {
                predicate.getExpressions().add(
                        cb.equal(root.get("role").get("code"), roleCode.trim().toUpperCase())
                );
            }
            return predicate;
        };
        Page<User> pageResult = userRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<AdminUserDto> dtos = pageResult.stream().map(this::toDto).toList();
        return new PageResponse<>(dtos, pageResult.getTotalElements(), pageResult.getNumber() + 1, pageResult.getSize());
    }

    @Transactional(readOnly = true)
    public AdminUserDto get(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        return toDto(user);
    }

    @Transactional
    public AdminUserDto create(AdminUserRequest request) {
        if (!StringUtils.hasText(request.getPassword())) {
            throw new IllegalArgumentException("请设置初始密码");
        }
        validateUnique(request.getUsername(), request.getEmail(), null);
        Role role = resolveRole(request.getRoleCode());
        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setDisplayName(request.getDisplayName().trim());
        user.setEmail(trimToNull(request.getEmail()));
        user.setTitle(trimToNull(request.getTitle()));
        user.setBio(trimToNull(request.getBio()));
        user.setGithubUrl(trimToNull(request.getGithubUrl()));
        user.setWechatQrUrl(trimToNull(request.getWechatQrUrl()));
        user.setRole(role);
        user.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus().trim() : "ACTIVE");
        user.setAvatarUrl(normalizeAvatarPath(request.getAvatarUrl()));
        Instant now = Instant.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        return toDto(userRepository.save(user));
    }

    @Transactional
    public AdminUserDto update(Long id, AdminUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        validateUnique(request.getUsername(), request.getEmail(), id);
        Role role = resolveRole(request.getRoleCode());
        user.setUsername(request.getUsername().trim());
        user.setDisplayName(request.getDisplayName().trim());
        user.setEmail(trimToNull(request.getEmail()));
        user.setTitle(trimToNull(request.getTitle()));
        user.setBio(trimToNull(request.getBio()));
        user.setGithubUrl(trimToNull(request.getGithubUrl()));
        user.setWechatQrUrl(trimToNull(request.getWechatQrUrl()));
        user.setRole(role);
        user.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus().trim() : user.getStatus());
        String previousAvatar = user.getAvatarUrl();
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(normalizeAvatarPath(request.getAvatarUrl()));
        }
        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);
        if (request.getAvatarUrl() != null
                && previousAvatar != null
                && !Objects.equals(previousAvatar, saved.getAvatarUrl())) {
            deleteLocalAvatar(previousAvatar);
        }
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<RoleOptionDto> listRoles() {
        return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(role -> RoleOptionDto.builder()
                        .id(role.getId())
                        .code(role.getCode())
                        .name(role.getName())
                        .build())
                .toList();
    }

    private void validateUnique(String username, String email, Long currentId) {
        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        userRepository.findByUsernameIgnoreCase(username.trim())
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("用户名已存在");
                });
        if (StringUtils.hasText(email)) {
            userRepository.findByEmailIgnoreCase(email.trim())
                    .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("邮箱已存在");
                    });
        }
    }

    private Role resolveRole(String roleCode) {
        if (!StringUtils.hasText(roleCode)) {
            throw new IllegalArgumentException("请指定角色");
        }
        return roleRepository.findByCode(roleCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("角色不存在"));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private AdminUserDto toDto(User user) {
        String avatar = user.getAvatarUrl();
        if (avatar != null && !avatar.isBlank() && !avatar.startsWith("http")) {
            avatar = "/avatar/" + avatar;
        }
        return AdminUserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .title(user.getTitle())
                .bio(user.getBio())
                .githubUrl(user.getGithubUrl())
                .wechatQrUrl(user.getWechatQrUrl())
                .avatarUrl(avatar)
                .roleCode(user.getRole() != null ? user.getRole().getCode() : null)
                .roleName(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private String normalizeAvatarPath(String incoming) {
        if (!StringUtils.hasText(incoming)) {
            return null;
        }
        String value = incoming.trim();
        if (value.startsWith("/avatar/")) {
            return value.substring("/avatar/".length());
        }
        if (value.startsWith("avatar/")) {
            return value.substring("avatar/".length());
        }
        if (value.contains("/avatar/")) {
            return value.substring(value.indexOf("/avatar/") + "/avatar/".length());
        }
        if (value.startsWith("http")) {
            int idx = value.lastIndexOf('/');
            if (idx >= 0 && idx < value.length() - 1) {
                return value.substring(idx + 1);
            }
        }
        return value;
    }

    private void deleteLocalAvatar(String avatarPath) {
        if (!StringUtils.hasText(avatarPath)) {
            return;
        }
        String relative = avatarPath;
        if (relative.startsWith("/avatar/")) {
            relative = relative.substring("/avatar/".length());
        } else if (relative.startsWith("avatar/")) {
            relative = relative.substring("avatar/".length());
        }
        Path target = storagePathResolver.resolveAvatarFile(relative);
        try {
            if (Files.exists(target)) {
                Files.delete(target);
            }
        } catch (Exception ignored) {
        }
    }
}
