package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.ArchiveSummaryDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.PostDetailDto;
import com.sangui.sanguiblog.model.dto.PostSummaryDto;
import com.sangui.sanguiblog.model.dto.SavePostRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.PostService;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ApiResponse<PageResponse<PostSummaryDto>> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(postService.listPublished(page, size, categoryId, tagId, keyword));
    }

    @GetMapping("/archive/summary")
    public ApiResponse<ArchiveSummaryDto> archiveSummary() {
        return ApiResponse.ok(postService.getArchiveSummary());
    }

    @GetMapping("/archive/month")
    public ApiResponse<PageResponse<PostSummaryDto>> archiveMonth(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(postService.getArchiveMonthPosts(year, month, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<PostDetailDto> detail(@PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String ip = IpUtils.resolveIp(request);
        String userAgent = request.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(postService.getPublishedDetail(id, ip, userAgent, userId));
    }

    @GetMapping("/slug/{slug}")
    public ApiResponse<PostDetailDto> detailBySlug(@PathVariable String slug,
            jakarta.servlet.http.HttpServletRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String ip = IpUtils.resolveIp(request);
        String userAgent = request.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(postService.getPublishedDetailBySlug(slug, ip, userAgent, userId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_POST_CREATE')")
    public ApiResponse<PostDetailDto> create(@Valid @RequestBody SavePostRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long uid = principal != null ? principal.getId() : null;
        return ApiResponse.ok(postService.saveOrUpdate(request, uid));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_POST_EDIT')")
    public ApiResponse<PostDetailDto> update(@PathVariable Long id,
            @Valid @RequestBody SavePostRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        request.setId(id);
        Long uid = principal != null ? principal.getId() : null;
        return ApiResponse.ok(postService.saveOrUpdate(request, uid));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_POST_DELETE')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        postService.delete(id);
        return ApiResponse.ok();
    }
}
