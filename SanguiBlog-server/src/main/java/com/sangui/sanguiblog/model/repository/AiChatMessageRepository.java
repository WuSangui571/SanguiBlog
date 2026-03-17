package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {
    List<AiChatMessage> findBySessionIdOrderByCreatedAtAscIdAsc(Long sessionId);

    List<AiChatMessage> findBySessionIdOrderByCreatedAtDescIdDesc(Long sessionId, Pageable pageable);
}
