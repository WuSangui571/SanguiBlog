package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.TagDto;
import com.sangui.sanguiblog.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ApiResponse<List<TagDto>> list() {
        return ApiResponse.ok(tagService.list());
    }
}
