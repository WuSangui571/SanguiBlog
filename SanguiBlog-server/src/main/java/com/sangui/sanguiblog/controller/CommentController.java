package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.model.dto.CreateCommentRequest;
import com.sangui.sanguiblog.service.CommentService;
import com.sangui.sanguiblog.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommentDto> create(@PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        String ip = servletRequest.getRemoteAddr();
        return ApiResponse.ok(commentService.create(postId, request, ip, userPrincipal.getId()));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        boolean canModerate = hasAuthority(userPrincipal, "PERM_COMMENT_DELETE");
        commentService.deleteComment(commentId, userPrincipal.getId(), canModerate);
        return ApiResponse.ok();
    }

    @PutMapping("/{postId}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommentDto> update(@PathVariable Long postId,
            @PathVariable Long commentId,
            @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        boolean canModerate = hasAuthority(userPrincipal, "PERM_COMMENT_REVIEW");
        return ApiResponse.ok(commentService.updateComment(commentId, userPrincipal.getId(), request.getContent(), canModerate));
    }

    @lombok.Data
    public static class UpdateCommentRequest {
        private String content;
    }

    private boolean hasAuthority(UserPrincipal principal, String authority) {
        if (principal == null || authority == null || authority.isBlank()) {
            return false;
        }
        return principal.getAuthorities().stream()
                .anyMatch(grantedAuthority -> authority.equals(grantedAuthority.getAuthority()));
    }
}
