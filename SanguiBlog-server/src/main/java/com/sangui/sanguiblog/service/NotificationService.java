package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.NotificationDto;
import com.sangui.sanguiblog.model.dto.NotificationListDto;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.CommentNotification;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CommentNotificationRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final CommentNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void createForComment(Comment comment) {
        if (comment == null || comment.getPost() == null) {
            return;
        }
        Post post = comment.getPost();
        User postAuthor = post.getAuthor();
        Long actorId = comment.getUser() != null ? comment.getUser().getId() : null;

        Set<Long> targetIds = new HashSet<>();
        if (postAuthor != null && postAuthor.getId() != null && !postAuthor.getId().equals(actorId)) {
            targetIds.add(postAuthor.getId());
        }
        if (comment.getParent() != null && comment.getParent().getUser() != null) {
            Long parentAuthorId = comment.getParent().getUser().getId();
            if (parentAuthorId != null && !parentAuthorId.equals(actorId)) {
                targetIds.add(parentAuthorId);
            }
        }

        if (targetIds.isEmpty()) {
            return;
        }

        String excerpt = buildExcerpt(comment.getContent());
        String authorName = comment.getAuthorName() == null || comment.getAuthorName().isBlank()
                ? "访客"
                : comment.getAuthorName();
        String authorAvatar = normalizeAvatar(comment.getUser() != null ? comment.getUser().getAvatarUrl() : comment.getAuthorAvatarUrl());
        Instant now = Instant.now();
        List<User> recipients = userRepository.findAllById(targetIds);
        for (User recipient : recipients) {
            CommentNotification notification = new CommentNotification();
            notification.setRecipient(recipient);
            notification.setComment(comment);
            notification.setPost(post);
            notification.setCommentAuthorName(authorName);
            notification.setCommentExcerpt(excerpt);
            notification.setCommentAuthorAvatar(authorAvatar);
            notification.setIsRead(false);
            notification.setCreatedAt(now);
            notificationRepository.save(notification);
        }
    }

    @Transactional(readOnly = true)
    public NotificationListDto listUnread(Long userId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        PageRequest page = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CommentNotification> result = notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(userId, false, page);
        List<NotificationDto> items = result.stream().map(this::toDto).toList();
        long total = notificationRepository.countByRecipientIdAndIsRead(userId, false);
        return NotificationListDto.builder()
                .items(items)
                .total(total)
                .build();
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        if (notificationId == null || userId == null) {
            return;
        }
        int updated = notificationRepository.markAsRead(notificationId, userId, Instant.now());
        if (updated == 0) {
            throw new IllegalArgumentException("通知不存在或已处理");
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId == null) {
            return;
        }
        notificationRepository.markAllAsRead(userId, Instant.now());
    }

    private NotificationDto toDto(CommentNotification notification) {
        String time = notification.getCreatedAt() != null
                ? TIME_FMT.format(notification.getCreatedAt().atZone(ZoneId.systemDefault()))
                : "";
        String avatar = normalizeAvatar(notification.getCommentAuthorAvatar());
        if ((avatar == null || avatar.isBlank()) && notification.getComment() != null) {
            if (notification.getComment().getUser() != null) {
                avatar = normalizeAvatar(notification.getComment().getUser().getAvatarUrl());
            }
            if ((avatar == null || avatar.isBlank()) && notification.getComment().getAuthorAvatarUrl() != null) {
                avatar = normalizeAvatar(notification.getComment().getAuthorAvatarUrl());
            }
        }
        return NotificationDto.builder()
                .id(notification.getId())
                .postId(notification.getPost() != null ? notification.getPost().getId() : null)
                .postTitle(notification.getPost() != null ? notification.getPost().getTitle() : null)
                .postSlug(notification.getPost() != null ? notification.getPost().getSlug() : null)
                .commentId(notification.getComment() != null ? notification.getComment().getId() : null)
                .commentContent(notification.getCommentExcerpt())
                .from(notification.getCommentAuthorName())
                .avatar(avatar)
                .createdAt(time)
                .read(Boolean.TRUE.equals(notification.getIsRead()))
                .build();
    }

    private String buildExcerpt(String content) {
        if (content == null) {
            return "";
        }
        String condensed = content.replaceAll("\\s+", " ").trim();
        int max = 150;
        return condensed.length() > max ? condensed.substring(0, max) + "..." : condensed;
    }

    private String normalizeAvatar(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        if (trimmed.startsWith("/avatar/") || trimmed.startsWith("avatar/")) {
            return trimmed.startsWith("/") ? trimmed : ("/" + trimmed);
        }
        if (trimmed.startsWith("/uploads/avatar/") || trimmed.startsWith("uploads/avatar/")) {
            return trimmed.startsWith("/") ? trimmed : ("/" + trimmed);
        }
        // treat bare filename as avatar stored under /avatar/
        return "/avatar/" + trimmed.replaceAll("^/+", "");
    }
}
