package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.PublicRegistrationRequest;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.model.entity.RegistrationInvite;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PublicRegistrationService {

    private static final Pattern ASCII_PRINTABLE = Pattern.compile("^[\\x20-\\x7E]+$");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationInviteService registrationInviteService;
    private final AvatarStorageService avatarStorageService;

    @Transactional
    public UserProfileDto register(PublicRegistrationRequest request, MultipartFile avatar) {
        validateRequest(request, avatar);
        RegistrationInvite invite = registrationInviteService.lockUsableInvite(request.getInviteCode());

        String username = request.getUsername().trim();
        userRepository.findByUsernameIgnoreCase(username)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("用户名已存在");
                });

        Role userRole = roleRepository.findByCode("USER")
                .orElseThrow(() -> new NotFoundException("默认用户角色不存在"));

        String avatarFilename = avatarStorageService.storeAvatar(avatar);

        Instant now = Instant.now();
        User user = new User();
        user.setUsername(username);
        user.setDisplayName(request.getDisplayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(userRole);
        user.setStatus("ACTIVE");
        user.setAvatarUrl(avatarFilename);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        User saved = userRepository.save(user);
        registrationInviteService.markConsumed(invite, saved);
        return toProfile(saved);
    }

    private void validateRequest(PublicRegistrationRequest request, MultipartFile avatar) {
        if (request == null) {
            throw new IllegalArgumentException("注册请求不能为空");
        }
        if (!StringUtils.hasText(request.getInviteCode())) {
            throw new IllegalArgumentException("请输入邀请码");
        }
        if (!StringUtils.hasText(request.getUsername())) {
            throw new IllegalArgumentException("请输入用户名");
        }
        String username = request.getUsername().trim();
        if (username.length() < 3 || username.length() > 32) {
            throw new IllegalArgumentException("用户名长度需在 3-32 之间");
        }
        if (!ASCII_PRINTABLE.matcher(username).matches()) {
            throw new IllegalArgumentException("用户名仅支持英文、数字与常见符号");
        }
        if (!StringUtils.hasText(request.getDisplayName())) {
            throw new IllegalArgumentException("请输入显示名称");
        }
        String displayName = request.getDisplayName().trim();
        if (displayName.length() < 2 || displayName.length() > 32) {
            throw new IllegalArgumentException("显示名称长度需在 2-32 之间");
        }
        if (!StringUtils.hasText(request.getPassword())) {
            throw new IllegalArgumentException("请输入密码");
        }
        if (request.getPassword().length() < 6 || request.getPassword().length() > 64) {
            throw new IllegalArgumentException("密码长度需在 6-64 之间");
        }
        if (!ASCII_PRINTABLE.matcher(request.getPassword()).matches()) {
            throw new IllegalArgumentException("密码仅支持英文、数字与常见符号");
        }
        if (!StringUtils.hasText(request.getConfirmPassword())) {
            throw new IllegalArgumentException("请再次输入密码");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("两次输入的密码不一致");
        }
        avatarStorageService.validateAvatar(avatar);
    }

    private UserProfileDto toProfile(User user) {
        String avatar = user.getAvatarUrl();
        if (avatar != null && !avatar.isBlank()) {
            avatar = "/avatar/" + avatar;
        }
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatar(avatar)
                .role(user.getRole() != null ? user.getRole().getCode().toUpperCase(Locale.ROOT) : "USER")
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
