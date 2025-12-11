package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GamePageRequest {
    @NotBlank(message = "���ⲻ��Ϊ��")
    @Size(max = 128, message = "���ⳤ�Ȳ��ܳ���128���ַ�")
    private String title;

    @Size(max = 512, message = "�������Ȳ��ܳ���512���ַ�")
    private String description;

    private String status;

    private Integer sortOrder;
}

