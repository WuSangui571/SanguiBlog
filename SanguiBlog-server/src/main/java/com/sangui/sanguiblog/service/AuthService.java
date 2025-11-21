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
                "role", user.getRole() != null ? user.getRole().getCode() : "USER"
        ));

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return new LoginResponse(token, toProfile(user));
    }

    public UserProfileDto toProfile(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .title(user.getTitle())
                .bio(user.getBio())
                .avatar(user.getAvatarUrl())
                .github(user.getGithubUrl())
                .wechatQr(user.getWechatQrUrl())
                .role(user.getRole() != null ? user.getRole().getCode() : "USER")
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
}
