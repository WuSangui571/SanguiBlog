package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.PermissionMatrixDto;
import com.sangui.sanguiblog.model.entity.Permission;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.RolePermission;
import com.sangui.sanguiblog.model.permission.PermissionDefinition;
import com.sangui.sanguiblog.model.repository.PermissionRepository;
import com.sangui.sanguiblog.model.repository.RolePermissionRepository;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Transactional
    public void ensureDefaultPermissions() {
        Map<String, Permission> existing = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getCode, p -> p));

        for (PermissionDefinition definition : PermissionDefinition.values()) {
            Permission permission = existing.computeIfAbsent(definition.getCode(), code -> {
                Permission entity = new Permission();
                entity.setCode(code);
                return entity;
            });
            permission.setName(definition.getActionLabel());
            permission.setDescription(definition.getDescription());
            permissionRepository.save(permission);
        }

        List<Permission> allPermissions = permissionRepository.findAll();
        Map<String, Permission> permissionMap = allPermissions.stream()
                .collect(Collectors.toMap(Permission::getCode, p -> p));

        assignPermissionsToRole("SUPER_ADMIN",
                new LinkedHashSet<>(permissionMap.keySet()), permissionMap);

        assignPermissionsToRole("ADMIN",
                defaultCodesForRole("ADMIN"), permissionMap);

        assignPermissionsToRole("USER",
                defaultCodesForRole("USER"), permissionMap);
    }

    @Transactional(readOnly = true)
    public PermissionMatrixDto buildMatrix() {
        Map<String, Set<String>> rolePermissions = new HashMap<>();
        for (String roleCode : List.of("SUPER_ADMIN", "ADMIN", "USER")) {
            rolePermissions.put(roleCode,
                    new HashSet<>(permissionsForRole(roleCode)));
        }

        List<PermissionMatrixDto.ModuleDto> modules = PermissionDefinition.streamOrdered()
                .collect(Collectors.groupingBy(
                        PermissionDefinition::getModuleCode,
                        LinkedHashMap::new,
                        Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> PermissionMatrixDto.ModuleDto.builder()
                        .module(entry.getKey())
                        .label(entry.getValue().get(0).getModuleLabel())
                        .description(buildModuleDescription(entry.getValue().get(0).getModuleCode()))
                        .actions(entry.getValue().stream()
                                .sorted(Comparator.comparingInt(PermissionDefinition::getActionOrder))
                                .map(def -> PermissionMatrixDto.ActionDto.builder()
                                        .code(def.getCode())
                                        .label(def.getActionLabel())
                                        .description(def.getDescription())
                                        .superAdmin(true)
                                        .admin(rolePermissions.getOrDefault("ADMIN", Set.of()).contains(def.getCode()))
                                        .user(rolePermissions.getOrDefault("USER", Set.of()).contains(def.getCode()))
                                        .build())
                                .toList())
                        .build())
                .toList();

        return PermissionMatrixDto.builder()
                .modules(modules)
                .build();
    }

    @Transactional
    public void updateRolePermissions(String roleCode, List<String> permissionCodes) {
        String normalized = roleCode.toUpperCase(Locale.ROOT);
        if ("SUPER_ADMIN".equals(normalized)) {
            throw new IllegalArgumentException("超级管理员权限不可修改");
        }
        if (!List.of("ADMIN", "USER").contains(normalized)) {
            throw new IllegalArgumentException("只允许调整管理员或普通用户的权限");
        }

        List<Permission> permissions = permissionRepository.findByCodeIn(permissionCodes);
        Set<String> validCodes = permissions.stream().map(Permission::getCode).collect(Collectors.toSet());
        permissionCodes.forEach(code -> {
            if (!validCodes.contains(code)) {
                throw new IllegalArgumentException("未知的权限编码：" + code);
            }
        });

        Map<String, Permission> permissionMap = permissions.stream()
                .collect(Collectors.toMap(Permission::getCode, p -> p));
        assignPermissionsToRole(normalized, new HashSet<>(permissionCodes), permissionMap);
    }

    @Transactional(readOnly = true)
    public List<String> permissionsForRole(String roleCode) {
        if ("SUPER_ADMIN".equalsIgnoreCase(roleCode)) {
            return permissionRepository.findAll().stream()
                    .map(Permission::getCode)
                    .toList();
        }
        List<String> codes = rolePermissionRepository.findByRole_Code(roleCode).stream()
                .map(rp -> rp.getPermission().getCode())
                .toList();
        if (codes.isEmpty()) {
            return new ArrayList<>(defaultCodesForRole(roleCode));
        }
        return codes;
    }

    @Transactional(readOnly = true)
    public List<String> permissionsForUser(Role role) {
        if (role == null) {
            return List.of();
        }
        return permissionsForRole(role.getCode());
    }

    private void assignPermissionsToRole(String roleCode, Set<String> codes, Map<String, Permission> permissionMap) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new IllegalArgumentException("角色不存在：" + roleCode));
        if (permissionMap.isEmpty()) {
            permissionMap.putAll(permissionRepository.findAll().stream()
                    .collect(Collectors.toMap(Permission::getCode, p -> p)));
        }
        List<RolePermission> existing = rolePermissionRepository.findByRole_Id(role.getId());
        Map<String, RolePermission> existingMap = existing.stream()
                .collect(Collectors.toMap(rp -> rp.getPermission().getCode(), rp -> rp));

        // add missing
        for (String code : codes) {
            if (!existingMap.containsKey(code)) {
                Permission permission = permissionMap.computeIfAbsent(code, c ->
                        permissionRepository.findByCode(c)
                                .orElseThrow(() -> new IllegalArgumentException("未知权限：" + c)));
                RolePermission rp = new RolePermission();
                rp.setRole(role);
                rp.setPermission(permission);
                rp.setId(new com.sangui.sanguiblog.model.entity.RolePermissionId(role.getId(), permission.getId()));
                rolePermissionRepository.save(rp);
            }
        }

        // remove extras
        for (RolePermission rp : existing) {
            if (!codes.contains(rp.getPermission().getCode())) {
                rolePermissionRepository.delete(rp);
            }
        }
    }

    private String buildModuleDescription(String moduleCode) {
        return switch (moduleCode) {
            case "POSTS" -> "文章的创建、编辑、发布与删除权限";
            case "COMMENTS" -> "评论审核、回复与删除相关权限";
            case "TAXONOMY" -> "分类与标签维护";
            case "ANALYTICS" -> "仪表盘/数据分析访问权限";
            case "USERS" -> "后台账号的增删改查";
            case "PERMISSIONS" -> "调整角色权限矩阵";
            case "PROFILE" -> "个人资料修改与安全设置";
            default -> "";
        };
    }

    private LinkedHashSet<String> defaultCodesForRole(String roleCode) {
        return PermissionDefinition.streamOrdered()
                .filter(def -> def.getDefaultRoles().contains(roleCode))
                .map(PermissionDefinition::getCode)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
