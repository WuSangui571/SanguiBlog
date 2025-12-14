package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminPostDetailDto;
import com.sangui.sanguiblog.model.dto.AdminPostUpdateRequest;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.PostAdminDto;
import com.sangui.sanguiblog.model.dto.PostSiblingDto;
import com.sangui.sanguiblog.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
public class AdminPostController {

    private final PostService postService;

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_POST_VIEW')")
    public ApiResponse<PageResponse<PostAdminDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(postService.adminList(keyword, categoryId, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_POST_VIEW')")
    public ApiResponse<AdminPostDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(postService.getAdminDetail(id));
    }

    @GetMapping("/{id}/siblings")
    @PreAuthorize("hasAuthority('PERM_POST_VIEW')")
    public ApiResponse<PostSiblingDto> siblings(@PathVariable Long id) {
        return ApiResponse.ok(postService.findPublishedSiblings(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_POST_EDIT')")
    public ApiResponse<PostAdminDto> update(@PathVariable Long id, @Valid @RequestBody AdminPostUpdateRequest request) {
        return ApiResponse.ok(postService.updateMeta(id, request));
    }
}
