package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminCommentItemDto {
    private Long id;
    private Long postId;
    private String postTitle;
    private String postSlug;
    private Long parentId;
    private Long userId;
    private String authorName;
    private String authorIp;
    private String status;
    private String content;
    private String createdAt;
}
