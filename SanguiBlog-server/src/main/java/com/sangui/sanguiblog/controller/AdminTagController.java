package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.TagDto;
import com.sangui.sanguiblog.model.dto.TagRequest;
import com.sangui.sanguiblog.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tags")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminTagController {

    private final TagService tagService;

    @GetMapping
    public ApiResponse<List<TagDto>> list() {
        return ApiResponse.ok(tagService.list());
    }

    @PostMapping
    public ApiResponse<TagDto> create(@Valid @RequestBody TagRequest request) {
        return ApiResponse.ok(tagService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<TagDto> update(@PathVariable Long id, @Valid @RequestBody TagRequest request) {
        return ApiResponse.ok(tagService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        tagService.delete(id);
        return ApiResponse.ok();
    }
}
