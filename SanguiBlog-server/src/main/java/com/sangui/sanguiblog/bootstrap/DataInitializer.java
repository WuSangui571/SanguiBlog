package com.sangui.sanguiblog.bootstrap;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String LEGACY_WEAK_PASSWORD = "123456";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionService permissionService;
    @Value("${app.bootstrap.super-admin-password:}")
    private String superAdminPassword;
    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;
    @Value("${app.bootstrap.editor-password:}")
    private String editorPassword;
    @Value("${app.bootstrap.default-password:Sg!2025#Blog!}")
    private String defaultFallbackPassword;

    @Override
    public void run(String... args) {
        Role superAdmin = ensureRole("SUPER_ADMIN", "超级管理员");
        Role admin = ensureRole("ADMIN", "管理员");
        Role userRole = ensureRole("USER", "用户");

        ensureUserPassword("sangui", superAdminPassword, superAdmin);
        ensureUserPassword("admin_user1", adminPassword, admin);
        ensureUserPassword("editor_user2", editorPassword, userRole);

        permissionService.ensureDefaultPermissions();
    }

    private Role ensureRole(String code, String name) {
        Optional<Role> existing = roleRepository.findByCode(code);
        if (existing.isPresent()) {
            return existing.get();
        }
        Role role = new Role();
        role.setCode(code);
        role.setName(name);
        return roleRepository.save(role);
    }

    private void ensureUserPassword(String username, String rawPassword, Role role) {
        userRepository.findByUsername(username).ifPresent(user -> {
            if (needsPasswordReset(user.getPasswordHash())) {
                String resolvedPassword = resolvePassword(rawPassword);
                user.setPasswordHash(passwordEncoder.encode(resolvedPassword));
                if (user.getRole() == null && role != null) {
                    user.setRole(role);
                }
                userRepository.save(user);
            }
        });
    }

    private boolean needsPasswordReset(String encodedPassword) {
        if (!StringUtils.hasText(encodedPassword)) {
            return true;
        }
        try {
            return passwordEncoder.matches(LEGACY_WEAK_PASSWORD, encodedPassword);
        } catch (Exception ignored) {
            return true;
        }
    }

    private String resolvePassword(String configuredPassword) {
        if (StringUtils.hasText(configuredPassword)) {
            return configuredPassword;
        }
        return defaultFallbackPassword;
    }
}
