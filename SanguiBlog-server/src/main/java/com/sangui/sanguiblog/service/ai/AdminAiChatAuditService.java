package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AdminAiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminAiChatAuditService {

    private static final Set<String> VALID_VISIBILITY = Set.of("ALL", "VISIBLE", "HIDDEN");
    private static final Set<String> VALID_IDENTITY = Set.of("ALL", "LOGGED_IN", "GUEST");
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 50;

    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminAiChatSessionDto> listSessions(int page, int size, String visibility, String identity) {
        if (visibility != null && !VALID_VISIBILITY.contains(visibility)) {
            throw new IllegalArgumentException("无效的 visibility 参数：" + visibility);
        }
        if (identity != null && !VALID_IDENTITY.contains(identity)) {
            throw new IllegalArgumentException("无效的 identity 参数：" + identity);
        }

        int p = Math.max(page, DEFAULT_PAGE) - 1;
        int s = Math.min(Math.max(size, 1), MAX_SIZE);

        Specification<AiChatSession> spec = buildAuditSpec(visibility, identity);
        Page<AiChatSession> pageResult = aiChatSessionRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "updatedAt", "id")));

        List<AdminAiChatSessionDto> dtos = pageResult.stream()
                .map(this::toSessionDto)
                .toList();
        return new PageResponse<>(dtos, pageResult.getTotalElements(), pageResult.getNumber() + 1, pageResult.getSize());
    }

    private Specification<AiChatSession> buildAuditSpec(String visibility, String identity) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if ("VISIBLE".equals(visibility)) {
                predicates.add(cb.isNotNull(root.get("user")));
                predicates.add(cb.isTrue(root.get("userVisible")));
            } else if ("HIDDEN".equals(visibility)) {
                predicates.add(cb.or(
                        cb.isNull(root.get("user")),
                        cb.isFalse(root.get("userVisible"))
                ));
            }

            if ("LOGGED_IN".equals(identity)) {
                predicates.add(cb.isNotNull(root.get("user")));
            } else if ("GUEST".equals(identity)) {
                predicates.add(cb.isNull(root.get("user")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
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
                .guest(user == null)
                .guestVisitorId(session.getGuestVisitorId())
                .sessionStartIp(session.getSessionStartIp())
                .latestIp(session.getLatestIp())
                .ipChanged(session.getIpChanged())
                .ipChangedAt(session.getIpChangedAt())
                .userVisible(session.getUserVisible())
                .userHiddenAt(session.getUserHiddenAt())
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
