package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeAdminDto;
import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeDetailDto;
import com.sangui.sanguiblog.model.dto.AiCustomKnowledgeUpdateRequest;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AiCustomKnowledgeAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/knowledge-documents")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminKnowledgeDocumentController {

    private final AiCustomKnowledgeAdminService knowledgeAdminService;

    @GetMapping
    public ApiResponse<PageResponse<AiCustomKnowledgeAdminDto>> list(@RequestParam(defaultValue = "1") int page,
                                                                     @RequestParam(defaultValue = "20") int size,
                                                                     @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(knowledgeAdminService.list(keyword, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<AiCustomKnowledgeDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(knowledgeAdminService.detail(id));
    }

    @PostMapping(consumes = { "multipart/form-data" })
    public ApiResponse<AiCustomKnowledgeAdminDto> create(@RequestParam(value = "title", required = false) String title,
                                                         @RequestParam(value = "enabled", required = false) Boolean enabled,
                                                         @RequestPart("file") MultipartFile file,
                                                         @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(knowledgeAdminService.create(title, enabled, file, principal != null ? principal.getId() : null));
    }

    @PutMapping("/{id}")
    public ApiResponse<AiCustomKnowledgeDetailDto> update(@PathVariable Long id,
                                                          @Valid @RequestBody AiCustomKnowledgeUpdateRequest request) {
        return ApiResponse.ok(knowledgeAdminService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        knowledgeAdminService.delete(id);
        return ApiResponse.ok();
    }
}
