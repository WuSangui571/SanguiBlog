package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.CategoryAdminDto;
import com.sangui.sanguiblog.model.dto.CategoryRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<PageResponse<CategoryAdminDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long parentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(categoryService.search(keyword, parentId, page, size));
    }

    @PostMapping
    public ApiResponse<CategoryAdminDto> create(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryAdminDto> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(categoryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ApiResponse.ok();
    }
}
