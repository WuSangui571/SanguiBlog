package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class AiCurrentPageContextDto {

    private String pageType;

    private String title;

    private String excerpt;

    private String content;

    private String url;

    private Integer imageCount;
}
