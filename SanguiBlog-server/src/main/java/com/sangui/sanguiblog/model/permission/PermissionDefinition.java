package com.sangui.sanguiblog.model.permission;

import lombok.Getter;

import java.util.List;
import java.util.stream.Stream;

@Getter
public enum PermissionDefinition {
    POST_VIEW("文章管理", "POSTS", "POST_VIEW", "浏览文章", "访问后台文章列表与详情", List.of("SUPER_ADMIN", "ADMIN", "USER"), 1, 1),
    POST_CREATE("文章管理", "POSTS", "POST_CREATE", "新建文章", "创建并发布新文章", List.of("SUPER_ADMIN", "ADMIN"), 1, 2),
    POST_EDIT("文章管理", "POSTS", "POST_EDIT", "编辑文章", "修改文章内容与元数据", List.of("SUPER_ADMIN", "ADMIN"), 1, 3),
    POST_DELETE("文章管理", "POSTS", "POST_DELETE", "删除文章", "删除或下线文章", List.of("SUPER_ADMIN", "ADMIN"), 1, 4),
    POST_PUBLISH("文章管理", "POSTS", "POST_PUBLISH", "发布/归档文章", "切换文章状态为发布/归档", List.of("SUPER_ADMIN", "ADMIN"), 1, 5),

    COMMENT_VIEW("评论管理", "COMMENTS", "COMMENT_VIEW", "查看评论", "浏览后台评论列表", List.of("SUPER_ADMIN", "ADMIN"), 2, 1),
    COMMENT_CREATE("评论管理", "COMMENTS", "COMMENT_CREATE", "发表评论", "在后台代表官方进行回复", List.of("SUPER_ADMIN", "ADMIN", "USER"), 2, 2),
    COMMENT_REPLY("评论管理", "COMMENTS", "COMMENT_REPLY", "回复评论", "以后台身份回复访客评论", List.of("SUPER_ADMIN", "ADMIN"), 2, 3),
    COMMENT_REVIEW("评论管理", "COMMENTS", "COMMENT_REVIEW", "审核评论", "审核、通过、隐藏评论内容", List.of("SUPER_ADMIN", "ADMIN"), 2, 4),
    COMMENT_DELETE("评论管理", "COMMENTS", "COMMENT_DELETE", "删除评论", "删除任意评论内容", List.of("SUPER_ADMIN"), 2, 5),

    CATEGORY_MANAGE("分类管理", "TAXONOMY", "CATEGORY_MANAGE", "管理分类", "创建/编辑/删除分类", List.of("SUPER_ADMIN", "ADMIN"), 3, 1),
    TAG_MANAGE("标签管理", "TAXONOMY", "TAG_MANAGE", "管理标签", "创建/编辑/删除标签", List.of("SUPER_ADMIN", "ADMIN"), 3, 2),

    ANALYTICS_VIEW("访问日志", "ANALYTICS", "ANALYTICS_VIEW", "查看访问日志", "访问仪表盘与访问日志", List.of("SUPER_ADMIN", "ADMIN"), 4, 1),

    USER_MANAGE("用户管理", "USERS", "USER_MANAGE", "管理用户", "创建/编辑/禁用后台账号", List.of("SUPER_ADMIN"), 5, 1),

    PERMISSION_MANAGE("权限管理", "PERMISSIONS", "PERMISSION_MANAGE", "管理权限", "调整管理员/用户的模块权限", List.of("SUPER_ADMIN"), 6, 1),

    PROFILE_UPDATE("个人资料", "PROFILE", "PROFILE_UPDATE", "修改个人资料", "修改自己的账号资料", List.of("SUPER_ADMIN", "ADMIN", "USER"), 7, 1),

    GAME_MANAGE("小游戏管理", "GAMES", "GAME_MANAGE", "管理小游戏", "上传、更新、删除独立 HTML 游戏页面", List.of("SUPER_ADMIN"), 9, 1),

    SYSTEM_CLEAN_STORAGE("系统维护", "SYSTEM", "SYSTEM_CLEAN_STORAGE", "清理未引用图片", "扫描并删除未被文章/关于页引用的上传图片，仅限超级管理员", List.of("SUPER_ADMIN"), 8, 1);

    private final String moduleLabel;
    private final String moduleCode;
    private final String code;
    private final String actionLabel;
    private final String description;
    private final List<String> defaultRoles;
    private final int moduleOrder;
    private final int actionOrder;

    PermissionDefinition(String moduleLabel,
                         String moduleCode,
                         String code,
                         String actionLabel,
                         String description,
                         List<String> defaultRoles,
                         int moduleOrder,
                         int actionOrder) {
        this.moduleLabel = moduleLabel;
        this.moduleCode = moduleCode;
        this.code = code;
        this.actionLabel = actionLabel;
        this.description = description;
        this.defaultRoles = defaultRoles;
        this.moduleOrder = moduleOrder;
        this.actionOrder = actionOrder;
    }

    public static Stream<PermissionDefinition> streamOrdered() {
        return Stream.of(values())
                .sorted((a, b) -> {
                    int moduleCompare = Integer.compare(a.moduleOrder, b.moduleOrder);
                    if (moduleCompare != 0) return moduleCompare;
                    return Integer.compare(a.actionOrder, b.actionOrder);
                });
    }
}
