package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentPublicController {

    private final CommentService commentService;

    @GetMapping("/recent")
    public ApiResponse<List<CommentDto>> recent(@RequestParam(value = "size", defaultValue = "5") int size) {
        return ApiResponse.ok(commentService.listRecent(size));
    }
}
