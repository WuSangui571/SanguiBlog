package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.CommentNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface CommentNotificationRepository extends JpaRepository<CommentNotification, Long> {

    Page<CommentNotification> findByRecipientIdAndIsReadOrderByCreatedAtDesc(Long recipientId, Boolean isRead, Pageable pageable);

    long countByRecipientIdAndIsRead(Long recipientId, Boolean isRead);

    @Modifying
    @Query("update CommentNotification n set n.isRead = true, n.readAt = :now where n.id = :id and n.recipient.id = :userId and n.isRead = false")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") Instant now);

    @Modifying
    @Query("update CommentNotification n set n.isRead = true, n.readAt = :now where n.recipient.id = :userId and n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId, @Param("now") Instant now);
}
