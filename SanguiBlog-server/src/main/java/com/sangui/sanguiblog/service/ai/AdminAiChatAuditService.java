package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AdminAiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAiChatAuditService {

    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;

    @Transactional(readOnly = true)
    public List<AdminAiChatSessionDto> listSessions() {
        return aiChatSessionRepository.findAllByOrderByUpdatedAtDescIdDesc().stream()
                .map(this::toSessionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminAiChatSessionDetailDto getSessionDetail(Long sessionId) {
        AiChatSession session = aiChatSessionRepository.findDetailById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI 会话不存在"));

        List<AdminAiChatMessageDto> messages = aiChatMessageRepository.findBySessionIdOrderByCreatedAtAscIdAsc(sessionId).stream()
                .map(this::toMessageDto)
                .toList();

        return AdminAiChatSessionDetailDto.builder()
                .session(toSessionDto(session))
                .messages(messages)
                .build();
    }

    private AdminAiChatSessionDto toSessionDto(AiChatSession session) {
        User user = session.getUser();
        Role role = user != null ? user.getRole() : null;
        return AdminAiChatSessionDto.builder()
                .id(session.getId())
                .title(session.getTitle())
                .lastMessagePreview(session.getLastMessagePreview())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : "")
                .displayName(user != null ? user.getDisplayName() : "")
                .userTitle(user != null ? user.getTitle() : "")
                .roleCode(role != null ? role.getCode() : "")
                .roleName(role != null ? role.getName() : "")
                .build();
    }

    private AdminAiChatMessageDto toMessageDto(AiChatMessage message) {
        return AdminAiChatMessageDto.builder()
                .id(message.getId())
                .sessionId(message.getSession() != null ? message.getSession().getId() : null)
                .role(message.getRole())
                .content(message.getContent())
                .modelName(message.getModelName())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
