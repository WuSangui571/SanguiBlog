package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.CommentNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface CommentNotificationRepository extends JpaRepository<CommentNotification, Long> {

    Page<CommentNotification> findByRecipientIdAndIsReadOrderByCreatedAtDesc(Long recipientId, Boolean isRead, Pageable pageable);

    long countByRecipientIdAndIsRead(Long recipientId, Boolean isRead);

    Page<CommentNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    long countByRecipientId(Long recipientId);

    List<CommentNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    @Modifying
    @Query("update CommentNotification n set n.isRead = true, n.readAt = :now where n.id = :id and n.recipient.id = :userId and n.isRead = false")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") Instant now);

    @Modifying
    @Query("update CommentNotification n set n.isRead = true, n.readAt = :now where n.recipient.id = :userId and n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId, @Param("now") Instant now);

    boolean existsByRecipientIdAndCommentId(Long recipientId, Long commentId);

    @Query("select n from CommentNotification n where n.recipient.id = :uid and n.isRead = :read and (n.comment.user.id is null or n.comment.user.id <> :uid) order by n.createdAt desc")
    Page<CommentNotification> findVisibleUnread(@Param("uid") Long uid, @Param("read") boolean read, Pageable pageable);

    @Query("select count(n) from CommentNotification n where n.recipient.id = :uid and n.isRead = :read and (n.comment.user.id is null or n.comment.user.id <> :uid)")
    long countVisibleUnread(@Param("uid") Long uid, @Param("read") boolean read);

    @Query("select n from CommentNotification n where n.recipient.id = :uid and (n.comment.user.id is null or n.comment.user.id <> :uid) order by n.createdAt desc")
    Page<CommentNotification> findVisibleAll(@Param("uid") Long uid, Pageable pageable);

    @Query("select count(n) from CommentNotification n where n.recipient.id = :uid and (n.comment.user.id is null or n.comment.user.id <> :uid)")
    long countVisibleAll(@Param("uid") Long uid);
}
