package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.GamePageAdminDto;
import com.sangui.sanguiblog.model.dto.GamePageRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.GamePageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/games")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_GAME_MANAGE')")
public class AdminGamePageController {

    private final GamePageService gamePageService;

    @GetMapping
    public ApiResponse<PageResponse<GamePageAdminDto>> list(@RequestParam(defaultValue = "1") int page,
                                                            @RequestParam(defaultValue = "20") int size,
                                                            @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(gamePageService.adminList(keyword, page, size));
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ApiResponse<GamePageAdminDto> create(@Valid @ModelAttribute GamePageRequest request,
                                                @RequestPart("file") MultipartFile file,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        GamePageService.CreateResult result = gamePageService.create(request, file, principal != null ? principal.getId() : null);
        return new ApiResponse<>(true, result.message(), result.data());
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ApiResponse<GamePageAdminDto> update(@PathVariable Long id,
                                                @Valid @ModelAttribute GamePageRequest request,
                                                @RequestPart(value = "file", required = false) MultipartFile file,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(gamePageService.update(id, request, file, principal != null ? principal.getId() : null));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        gamePageService.delete(id);
        return ApiResponse.ok();
    }
}
