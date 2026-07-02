package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminBannedIpDto;
import com.sangui.sanguiblog.model.dto.AdminCreateIpBanRequest;
import com.sangui.sanguiblog.model.dto.AdminUnbanIpRequest;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.ClientIpResolver;
import com.sangui.sanguiblog.service.IpBanService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/security/ip-bans")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminIpBanController {

    private final IpBanService ipBanService;
    private final ClientIpResolver clientIpResolver;

    @GetMapping
    public ApiResponse<PageResponse<AdminBannedIpDto>> list(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "ip", required = false) String ip,
            @RequestParam(value = "enabledOnly", required = false) Boolean enabledOnly) {
        return ApiResponse.ok(ipBanService.list(page, size, ip, enabledOnly));
    }

    @PostMapping
    public ApiResponse<AdminBannedIpDto> create(
            @Valid @RequestBody AdminCreateIpBanRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        Long actorId = principal != null ? principal.getId() : null;
        String actorIp = clientIpResolver.resolve(httpRequest);
        return ApiResponse.ok(ipBanService.createBan(request, actorId, actorIp));
    }

    @PostMapping("/{id}/unban")
    public ApiResponse<AdminBannedIpDto> unban(
            @PathVariable("id") Long id,
            @Valid @RequestBody(required = false) AdminUnbanIpRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long actorId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(ipBanService.unban(id, request, actorId));
    }
}
