package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiChatRequest {

    @NotNull(message = "会话ID不能为空")
    private Long sessionId;

    @NotBlank(message = "消息不能为空")
    @Size(max = 4000, message = "消息长度不能超过4000个字符")
    private String message;

    private AiCurrentPageContextDto currentPageContext;
}
