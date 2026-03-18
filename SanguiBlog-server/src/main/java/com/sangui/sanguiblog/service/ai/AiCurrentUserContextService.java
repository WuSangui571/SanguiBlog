package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AiCurrentUserContextService {

    public String buildSystemContext(User user) {
        if (user == null) {
            return "";
        }

        String username = trim(user.getUsername());
        String displayName = trim(user.getDisplayName());
        String title = trim(user.getTitle());
        String roleName = resolveRoleName(user.getRole());
        String roleCode = resolveRoleCode(user.getRole());

        StringBuilder builder = new StringBuilder();
        builder.append("当前对话用户信息如下，请在整个对话过程中稳定参考，不要自行编造或随意改变。");
        builder.append(System.lineSeparator());
        builder.append("如果用户询问“我是谁”“我的用户名是什么”“我当前是什么角色”等问题，请优先依据下面这些真实信息回答。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());
        builder.append("【当前登录用户名】").append(username.isEmpty() ? "未提供" : username).append(System.lineSeparator());
        if (StringUtils.hasText(displayName)) {
            builder.append("【当前登录用户显示名】").append(displayName).append(System.lineSeparator());
        }
        if (StringUtils.hasText(title)) {
            builder.append("【当前登录用户头衔】").append(title).append(System.lineSeparator());
        }
        builder.append("【当前登录用户角色】").append(roleName).append(System.lineSeparator());
        builder.append("【当前登录用户角色编码】").append(roleCode);
        return builder.toString().trim();
    }

    private String resolveRoleName(Role role) {
        if (role == null) {
            return "普通用户";
        }
        String name = trim(role.getName());
        return StringUtils.hasText(name) ? name : mapRoleCode(role.getCode());
    }

    private String resolveRoleCode(Role role) {
        String code = role == null ? "" : trim(role.getCode());
        return StringUtils.hasText(code) ? code : "USER";
    }

    private String mapRoleCode(String roleCode) {
        return switch (trim(roleCode)) {
            case "SUPER_ADMIN" -> "超级管理员";
            case "ADMIN" -> "管理员";
            default -> "普通用户";
        };
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
