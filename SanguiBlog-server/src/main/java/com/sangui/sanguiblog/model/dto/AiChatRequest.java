package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AiChatRequest {

    private Long sessionId;

    @NotBlank(message = "消息不能为空")
    @Size(max = 4000, message = "消息长度不能超过 4000 个字符")
    private String message;

    private AiCurrentPageContextDto currentPageContext;

    @Size(max = 12, message = "本地上下文消息不能超过 12 条")
    private List<AiLocalChatMessageDto> localHistory;
}
