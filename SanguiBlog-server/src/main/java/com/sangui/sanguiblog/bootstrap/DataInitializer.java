package com.sangui.sanguiblog.bootstrap;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 仅负责确保基础角色与权限存在，不再为固定用户名自动分配角色，避免误升权。
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionService permissionService;

    @Override
    public void run(String... args) {
        ensureRole("SUPER_ADMIN", "超级管理员");
        ensureRole("ADMIN", "管理员");
        ensureRole("USER", "用户");

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
}
