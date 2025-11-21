package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CategoryTreeDto;
import com.sangui.sanguiblog.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/tree")
    public ApiResponse<List<CategoryTreeDto>> tree() {
        return ApiResponse.ok(categoryService.tree());
    }
}
