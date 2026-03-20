package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.exception.AiAccessControlException;
import com.sangui.sanguiblog.model.dto.AiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AiChatRequest;
import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.dto.AiChatSessionDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.ai.AiChatService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public ApiResponse<AiChatResponse> chat(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiChatRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return ApiResponse.ok(aiChatService.chat(
                principal != null ? principal.getId() : null,
                request.getSessionId(),
                request.getMessage(),
                request.getCurrentPageContext(),
                request.getLocalHistory(),
                httpRequest,
                httpResponse
        ));
    }

    @PostMapping(path = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiChatRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        try {
            return aiChatService.streamChat(
                    principal != null ? principal.getId() : null,
                    request.getSessionId(),
                    request.getMessage(),
                    request.getCurrentPageContext(),
                    request.getLocalHistory(),
                    httpRequest,
                    httpResponse
            );
        } catch (AiAccessControlException ex) {
            return buildAccessDeniedEmitter(ex);
        }
    }

    @GetMapping("/sessions")
    public ApiResponse<List<AiChatSessionDto>> sessions(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(aiChatService.sessions(principal.getId()));
    }

    @PostMapping("/sessions")
    public ApiResponse<AiChatSessionDto> createSession(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(aiChatService.createSession(principal.getId()));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<Void> deleteSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long sessionId
    ) {
        aiChatService.deleteSession(principal.getId(), sessionId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<AiChatMessageDto>> sessionMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long sessionId
    ) {
        return ApiResponse.ok(aiChatService.sessionMessages(principal.getId(), sessionId));
    }

    private SseEmitter buildAccessDeniedEmitter(AiAccessControlException ex) {
        SseEmitter emitter = new SseEmitter(0L);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("message", ex.getMessage());
        payload.putAll(ex.getData());
        try {
            emitter.send(SseEmitter.event().name("error").data(payload));
        } catch (IOException ignored) {
            // Best effort only.
        }
        emitter.complete();
        return emitter;
    }
}
