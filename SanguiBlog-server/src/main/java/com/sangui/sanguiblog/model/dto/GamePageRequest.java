package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GamePageRequest {
    @NotBlank(message = "标题不能为空")
    @Size(max = 128, message = "标题长度不能超过128个字符")
    private String title;

    @Size(max = 512, message = "描述长度不能超过512个字符")
    private String description;

    private String status;

    private Integer sortOrder;
}
