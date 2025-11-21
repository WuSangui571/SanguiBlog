package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/site")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;

    @GetMapping("/meta")
    public ApiResponse<SiteMetaDto> meta() {
        return ApiResponse.ok(siteService.meta());
    }
}
