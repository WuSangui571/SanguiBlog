package com.sangui.sanguiblog.bootstrap;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionService permissionService;

    @Override
    public void run(String... args) {
        Role superAdmin = ensureRole("SUPER_ADMIN", "超级管理员");
        Role admin = ensureRole("ADMIN", "管理员");
        Role userRole = ensureRole("USER", "用户");

        ensureUserPassword("sangui", "123456", superAdmin);
        ensureUserPassword("admin_user1", "123456", admin);
        ensureUserPassword("editor_user2", "123456", userRole);

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
            if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
                user.setPasswordHash(passwordEncoder.encode(rawPassword));
                if (user.getRole() == null && role != null) {
                    user.setRole(role);
                }
                userRepository.save(user);
            }
        });
    }
}
