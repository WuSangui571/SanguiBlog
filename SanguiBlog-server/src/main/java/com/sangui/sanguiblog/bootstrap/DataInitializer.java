package com.sangui.sanguiblog.bootstrap;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    public void run(String... args) {
        Role superAdmin = ensureRole("SUPER_ADMIN", "超级管理员");
        Role admin = ensureRole("ADMIN", "管理员");
        Role userRole = ensureRole("USER", "用户");

        ensureUserRole("sangui", superAdmin);
        ensureUserRole("admin_user1", admin);
        ensureUserRole("editor_user2", userRole);

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

    private void ensureUserRole(String username, Role role) {
        if (role == null) {
            return;
        }
        userRepository.findByUsername(username).ifPresent(user -> {
            if (user.getRole() == null) {
                user.setRole(role);
                userRepository.save(user);
            }
        });
    }
}
