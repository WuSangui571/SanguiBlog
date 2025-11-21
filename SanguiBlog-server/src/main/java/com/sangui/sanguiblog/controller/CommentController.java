package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.model.dto.CreateCommentRequest;
import com.sangui.sanguiblog.service.CommentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/{postId}/comments")
    public ApiResponse<List<CommentDto>> list(@PathVariable Long postId) {
        return ApiResponse.ok(commentService.listByPost(postId));
    }

    @PostMapping("/{postId}/comments")
    public ApiResponse<CommentDto> create(@PathVariable Long postId,
                                          @Valid @RequestBody CreateCommentRequest request,
                                          HttpServletRequest servletRequest) {
        String ip = servletRequest.getRemoteAddr();
        return ApiResponse.ok(commentService.create(postId, request, ip));
    }
}
