package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.LoginRequest;
import com.sangui.sanguiblog.model.dto.LoginResponse;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (AuthenticationException e) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        String token = jwtUtil.generateToken(user.getUsername(), Map.of(
                "uid", user.getId(),
                "role", user.getRole() != null ? user.getRole().getCode() : "USER"));

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return new LoginResponse(token, toProfile(user));
    }

    public UserProfileDto toProfile(User user) {
        String avatarUrl = user.getAvatarUrl();
        if (avatarUrl != null && !avatarUrl.isBlank() && !avatarUrl.startsWith("http")) {
            avatarUrl = "/avatar/" + avatarUrl;
        }

        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .title(user.getTitle())
                .bio(user.getBio())
                .avatar(avatarUrl)
                .github(user.getGithubUrl())
                .wechatQr(user.getWechatQrUrl())
                .role(user.getRole() != null ? user.getRole().getCode() : "USER")
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    /**
     * Ensure password hash exists for existing users when bootstrap data misses it.
     */
    public void ensurePassword(User user, String rawPassword) {
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
    }

    public UserProfileDto getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        return toProfile(user);
    }

    public UserProfileDto updateProfile(Long userId, com.sangui.sanguiblog.model.dto.UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        if (Boolean.TRUE.equals(request.getVerifyOnly())) {
            if (!StringUtils.hasText(request.getOldPassword())) {
                throw new IllegalArgumentException("请提供原密码");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new IllegalArgumentException("原密码不正确");
            }
            return toProfile(user);
        }

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            userRepository.findByUsernameIgnoreCase(request.getUsername())
                    .filter(existing -> !existing.getId().equals(userId))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("用户名已存在");
                    });
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null) {
            if (!request.getEmail().isBlank()) {
                userRepository.findByEmailIgnoreCase(request.getEmail())
                        .filter(existing -> !existing.getId().equals(userId))
                        .ifPresent(existing -> {
                            throw new IllegalArgumentException("邮箱已存在");
                        });
                user.setEmail(request.getEmail());
            } else {
                user.setEmail(null);
            }
        }

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getTitle() != null) {
            user.setTitle(request.getTitle());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        String previousAvatar = user.getAvatarUrl();
        if (request.getAvatarUrl() != null) {
            String incoming = request.getAvatarUrl();
            String stored = incoming;
            if (incoming.startsWith("/avatar/")) {
                stored = incoming.substring("/avatar/".length());
            } else if (incoming.contains("/avatar/")) {
                stored = incoming.substring(incoming.indexOf("/avatar/") + "/avatar/".length());
            } else if (incoming.startsWith("http")) {
                String trimmed = incoming.substring(incoming.lastIndexOf("/") + 1);
                stored = trimmed;
            }
            user.setAvatarUrl(stored);
        }
        if (request.getGithubUrl() != null) {
            user.setGithubUrl(request.getGithubUrl());
        }
        if (request.getWechatQrUrl() != null) {
            user.setWechatQrUrl(request.getWechatQrUrl());
        }

        if (StringUtils.hasText(request.getNewPassword())) {
            if (!StringUtils.hasText(request.getOldPassword())) {
                throw new IllegalArgumentException("请输入原密码");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new IllegalArgumentException("原密码不正确");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }

        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        if (request.getAvatarUrl() != null
                && previousAvatar != null
                && !previousAvatar.equals(user.getAvatarUrl())) {
            deleteLocalAvatar(previousAvatar);
        }
        return toProfile(user);
    }

    private void deleteLocalAvatar(String avatarPath) {
        if (avatarPath == null || avatarPath.isBlank()) {
            return;
        }
        String relative = avatarPath;
        if (relative.startsWith("/avatar/")) {
            relative = relative.substring("/avatar/".length());
        } else if (relative.startsWith("avatar/")) {
            relative = relative.substring("avatar/".length());
        }
        Path path = Paths.get("src/main/resources/static/avatar", relative);
        try {
            if (Files.exists(path)) {
                Files.delete(path);
            }
        } catch (Exception ignored) {
        }
    }
}
