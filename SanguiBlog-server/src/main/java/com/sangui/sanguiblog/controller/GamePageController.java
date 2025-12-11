package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.GamePageDetailDto;
import com.sangui.sanguiblog.model.dto.GamePageDto;
import com.sangui.sanguiblog.service.GamePageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GamePageController {

    private final GamePageService gamePageService;

    @GetMapping
    public ApiResponse<List<GamePageDto>> list() {
        return ApiResponse.ok(gamePageService.listActive());
    }

    @GetMapping("/{id}")
    public ApiResponse<GamePageDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(gamePageService.getDetail(id));
    }
}
