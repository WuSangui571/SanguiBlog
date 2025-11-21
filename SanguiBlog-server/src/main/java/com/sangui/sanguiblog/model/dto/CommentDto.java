package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommentDto {
    private Long id;
    private String authorName;
    private String avatar;
    private String content;
    private Integer likes;
    private String time;
}
