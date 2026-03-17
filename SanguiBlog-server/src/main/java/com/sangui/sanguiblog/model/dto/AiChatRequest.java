package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiChatRequest {

    @NotBlank(message = "不能为空")
    @Size(max = 4000, message = "长度不能超过 4000 个字符")
    private String message;
}
