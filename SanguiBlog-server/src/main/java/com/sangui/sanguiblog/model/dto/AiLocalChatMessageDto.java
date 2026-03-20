package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiLocalChatMessageDto {

    @NotBlank(message = "本地消息角色不能为空")
    @Pattern(regexp = "user|assistant", message = "本地消息角色不合法")
    private String role;

    @NotBlank(message = "本地消息内容不能为空")
    @Size(max = 4000, message = "本地消息长度不能超过 4000 个字符")
    private String content;
}
