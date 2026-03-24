package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface AiChatSessionRepository extends JpaRepository<AiChatSession, Long> {
    List<AiChatSession> findByUserIdOrderByUpdatedAtDescIdDesc(Long userId);

    List<AiChatSession> findByUserIdAndUserVisibleTrueOrderByUpdatedAtDescIdDesc(Long userId);

    Optional<AiChatSession> findByIdAndUserId(Long id, Long userId);

    Optional<AiChatSession> findByIdAndUserIdAndUserVisibleTrue(Long id, Long userId);

    Optional<AiChatSession> findByIdAndGuestVisitorId(Long id, String guestVisitorId);

    @EntityGraph(attributePaths = {"user", "user.role"})
    List<AiChatSession> findAllByOrderByUpdatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"user", "user.role"})
    Optional<AiChatSession> findDetailById(Long id);
}
