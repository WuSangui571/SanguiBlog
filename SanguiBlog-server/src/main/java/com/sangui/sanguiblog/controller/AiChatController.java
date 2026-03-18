package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AiChatRequest;
import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.dto.AiChatSessionDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.ai.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public ApiResponse<AiChatResponse> chat(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiChatRequest request
    ) {
        return ApiResponse.ok(aiChatService.chat(
                principal.getId(),
                request.getSessionId(),
                request.getMessage(),
                request.getCurrentPageContext()
        ));
    }

    @PostMapping(path = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiChatRequest request
    ) {
        return aiChatService.streamChat(
                principal.getId(),
                request.getSessionId(),
                request.getMessage(),
                request.getCurrentPageContext()
        );
    }

    @GetMapping("/sessions")
    public ApiResponse<List<AiChatSessionDto>> sessions(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(aiChatService.sessions(principal.getId()));
    }

    @PostMapping("/sessions")
    public ApiResponse<AiChatSessionDto> createSession(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(aiChatService.createSession(principal.getId()));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<AiChatMessageDto>> sessionMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long sessionId
    ) {
        return ApiResponse.ok(aiChatService.sessionMessages(principal.getId(), sessionId));
    }
}
