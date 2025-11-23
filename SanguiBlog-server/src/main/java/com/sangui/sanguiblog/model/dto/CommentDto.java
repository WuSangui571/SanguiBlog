package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CommentDto {
    private Long id;
    private Long userId;
    private String authorName;
    private String avatar;
    private String content;
    private Integer likes;
    private Long parentId;
    private List<CommentDto> replies;
    private String time;
}
