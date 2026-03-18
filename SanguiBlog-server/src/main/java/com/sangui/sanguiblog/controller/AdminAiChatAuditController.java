package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.ai.AdminAiChatAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/ai-chat")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAiChatAuditController {

    private final AdminAiChatAuditService adminAiChatAuditService;

    @GetMapping("/sessions")
    public ApiResponse<List<AdminAiChatSessionDto>> sessions() {
        return ApiResponse.ok(adminAiChatAuditService.listSessions());
    }

    @GetMapping("/sessions/{sessionId}")
    public ApiResponse<AdminAiChatSessionDetailDto> sessionDetail(@PathVariable("sessionId") Long sessionId) {
        return ApiResponse.ok(adminAiChatAuditService.getSessionDetail(sessionId));
    }
}
