package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationDto {
    private Long id;
    private Long postId;
    private String postTitle;
    private String postSlug;
    private Long commentId;
    private String commentContent;
    private String from;
    private String avatar;
    private String createdAt;
    private Boolean read;
}
