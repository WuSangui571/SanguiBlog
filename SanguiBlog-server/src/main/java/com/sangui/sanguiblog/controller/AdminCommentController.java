package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminCommentItemDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.CommentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
public class AdminCommentController {

    private final CommentService commentService;

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_COMMENT_VIEW')")
    public ApiResponse<PageResponse<AdminCommentItemDto>> list(
            @RequestParam(value = "postId", required = false) Long postId,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ApiResponse.ok(commentService.searchComments(
                postId,
                keyword,
                normalizeStatus(status),
                page,
                size));
    }

    @PutMapping("/{commentId}")
    @PreAuthorize("hasAuthority('PERM_COMMENT_REVIEW')")
    public ApiResponse<AdminCommentItemDto> update(@PathVariable Long commentId,
            @RequestBody AdminUpdateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if ((request.getContent() == null || request.getContent().trim().isEmpty())
                && (request.getStatus() == null || request.getStatus().trim().isEmpty())) {
            throw new IllegalArgumentException("请至少更新内容或状态");
        }
        Long operatorId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(commentService.updateCommentAsAdmin(
                commentId,
                request.getContent(),
                normalizeStatus(request.getStatus()),
                operatorId));
    }

    @DeleteMapping("/{commentId}")
    @PreAuthorize("hasAuthority('PERM_COMMENT_DELETE')")
    public ApiResponse<Void> delete(@PathVariable Long commentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long actorId = principal != null ? principal.getId() : null;
        commentService.deleteComment(null, commentId, actorId, true);
        return ApiResponse.ok();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toUpperCase(java.util.Locale.ROOT);
        if ("ALL".equals(normalized)) {
            return null;
        }
        return normalized;
    }

    @Data
    public static class AdminUpdateCommentRequest {
        private String content;
        private String status;
    }
}
