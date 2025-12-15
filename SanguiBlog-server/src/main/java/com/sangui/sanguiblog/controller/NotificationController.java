package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.NotificationListDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/unread")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<NotificationListDto> unread(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                   @RequestParam(value = "limit", defaultValue = "20") int limit) {
        return ApiResponse.ok(notificationService.listUnread(userPrincipal.getId(), limit));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markRead(@PathVariable("id") Long id,
                                      @AuthenticationPrincipal UserPrincipal userPrincipal) {
        notificationService.markAsRead(id, userPrincipal.getId());
        return ApiResponse.ok();
    }

    @PostMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markAllRead(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        notificationService.markAllAsRead(userPrincipal.getId());
        return ApiResponse.ok();
    }
}
