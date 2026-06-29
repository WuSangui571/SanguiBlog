package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiChatSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Optional;

public interface AiChatSessionRepository extends JpaRepository<AiChatSession, Long>, JpaSpecificationExecutor<AiChatSession> {
    List<AiChatSession> findByUserIdOrderByUpdatedAtDescIdDesc(Long userId);

    List<AiChatSession> findByUserIdAndUserVisibleTrueOrderByUpdatedAtDescIdDesc(Long userId);

    Optional<AiChatSession> findByIdAndUserId(Long id, Long userId);

    Optional<AiChatSession> findByIdAndUserIdAndUserVisibleTrue(Long id, Long userId);

    Optional<AiChatSession> findByIdAndGuestVisitorId(Long id, String guestVisitorId);

    @EntityGraph(attributePaths = {"user", "user.role"})
    List<AiChatSession> findAllByOrderByUpdatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"user", "user.role"})
    Optional<AiChatSession> findDetailById(Long id);

    @EntityGraph(attributePaths = {"user", "user.role"})
    Page<AiChatSession> findAll(@Nullable Specification<AiChatSession> spec, Pageable pageable);
}
