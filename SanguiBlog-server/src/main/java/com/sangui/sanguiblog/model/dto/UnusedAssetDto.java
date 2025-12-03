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
     * 相对路径（含 posts/ 前缀），如 posts/20241201/abc/image.png
     */
    private String path;
    /**
     * 可直接预览的 URL（/uploads/...）
     */
    private String url;
    private long size;
}
