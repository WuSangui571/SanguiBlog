package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnusedAssetDto {
    /**
     * 相对路径（含 posts/ 或 covers/ 前缀），如 posts/20241201/abc/image.png、covers/my-post/cover.jpg
     */
    private String path;
    /**
     * 可直接预览的 URL，例如 /uploads/posts/... 或 /uploads/covers/...
     */
    private String url;
    private long size;
}
