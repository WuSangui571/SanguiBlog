package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.NotificationDto;
import com.sangui.sanguiblog.model.dto.NotificationListDto;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.CommentNotification;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CommentNotificationRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
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
    private final CommentRepository commentRepository;

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
        Long mentionedUserId = resolveMentionedUserId(comment.getContent());
        if (mentionedUserId != null && !mentionedUserId.equals(actorId)) {
            targetIds.add(mentionedUserId);
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
            if (comment.getUser() != null && recipient.getId().equals(comment.getUser().getId())) {
                continue; // 不提醒自己
            }
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
        Page<CommentNotification> result = notificationRepository.findVisibleUnread(userId, false, page);
        List<NotificationDto> items = result.stream().map(this::toDto).toList();
        long total = notificationRepository.countVisibleUnread(userId, false);
        return NotificationListDto.builder()
                .items(items)
                .total(total)
                .build();
    }

    @Transactional(readOnly = true)
    public NotificationListDto listAll(Long userId, int page, int size) {
        int safePage = Math.max(page, 1) - 1;
        int safeSize = Math.min(Math.max(size, 1), 50);
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CommentNotification> result = notificationRepository.findVisibleAll(userId, pageable);
        List<NotificationDto> items = result.stream().map(this::toDto).toList();
        long total = notificationRepository.countVisibleAll(userId);
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
        // 如果已读或不存在，直接忽略，避免前端重复点击时抛错
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId == null) {
            return;
        }
        notificationRepository.markAllAsRead(userId, Instant.now());
    }

    @Transactional
    public int backfillForUser(Long userId) {
        if (userId == null) return 0;
        deduplicateForUser(userId);
        Set<Long> commentIds = new HashSet<>();
        commentRepository.findByPostAuthorId(userId).forEach(c -> commentIds.add(c.getId()));
        commentRepository.findByParentUserId(userId).forEach(c -> commentIds.add(c.getId()));
        // comments that @mention the user
        userRepository.findById(userId).ifPresent(user -> {
            String display = user.getDisplayName();
            String username = user.getUsername();
            commentRepository.findAll().forEach(c -> {
                if (isMentioned(c, display, username)) {
                    commentIds.add(c.getId());
                }
            });
        });
        if (commentIds.isEmpty()) return 0;

        List<Comment> comments = commentRepository.findAllById(commentIds);
        int created = 0;
        Instant now = Instant.now();
        for (Comment c : comments) {
            if (c.getUser() != null && userId.equals(c.getUser().getId())) {
                continue; // 自己的评论不补全
            }
            if (notificationRepository.existsByRecipientIdAndCommentId(userId, c.getId())) continue;
            CommentNotification n = new CommentNotification();
            n.setRecipient(userRepository.findById(userId).orElse(null));
            if (n.getRecipient() == null) continue;
            n.setComment(c);
            n.setPost(c.getPost());
            n.setCommentAuthorName(c.getAuthorName() == null || c.getAuthorName().isBlank() ? "访客" : c.getAuthorName());
            n.setCommentExcerpt(buildExcerpt(c.getContent()));
            n.setCommentAuthorAvatar(normalizeAvatar(c.getAuthorAvatarUrl()));
            n.setIsRead(true);
            n.setCreatedAt(c.getCreatedAt() != null ? c.getCreatedAt() : now);
            n.setReadAt(now);
            notificationRepository.save(n);
            created++;
        }
        return created;
    }

    private void deduplicateForUser(Long userId) {
        List<CommentNotification> list = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        if (list == null || list.size() < 2) return;
        Set<Long> seenComment = new HashSet<>();
        List<CommentNotification> duplicates = new java.util.ArrayList<>();
        for (CommentNotification n : list) {
            Long cid = n.getComment() != null ? n.getComment().getId() : null;
            if (cid == null) continue;
            if (!seenComment.add(cid)) {
                duplicates.add(n);
            }
        }
        if (!duplicates.isEmpty()) {
            notificationRepository.deleteAllInBatch(duplicates);
        }
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
        if (trimmed.startsWith("/uploads/avatar/") || trimmed.startsWith("uploads/avatar/")) {
            return trimmed.startsWith("/") ? trimmed : ("/" + trimmed);
        }
        if (trimmed.startsWith("/avatar/") || trimmed.startsWith("avatar/")) {
            String name = trimmed.replaceFirst("^/?avatar/", "");
            return "/uploads/avatar/" + name;
        }
        // treat bare filename as avatar stored under uploads/avatar
        String name = trimmed.replaceAll("^/+", "");
        return "/uploads/avatar/" + name;
    }

    /**
     * 尝试从评论内容中解析 @mention 的用户 ID（匹配用户名或显示名，忽略大小写）
     */
    private Long resolveMentionedUserId(String content) {
        if (content == null) return null;
        String prefix = extractMention(content);
        if (prefix == null) return null;
        // 先按用户名匹配
        return userRepository.findByUsernameIgnoreCase(prefix)
                .map(User::getId)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> !StringUtils.isBlank(u.getDisplayName()))
                        .filter(u -> prefix.equalsIgnoreCase(u.getDisplayName()))
                        .map(User::getId)
                        .findFirst()
                        .orElse(null));
    }

    private String extractMention(String content) {
        String trimmed = content.trim();
        if (!trimmed.startsWith("@")) return null;
        // 取到首个空格或冒号
        String body = trimmed.substring(1);
        int stop = body.indexOf(' ');
        int colon = body.indexOf(':');
        int cnColon = body.indexOf('：');
        int idx = -1;
        for (int val : new int[]{colon, cnColon, stop}) {
            if (val >= 0 && (idx == -1 || val < idx)) {
                idx = val;
            }
        }
        String name = idx >= 0 ? body.substring(0, idx) : body;
        name = name.trim();
        return name.isEmpty() ? null : name;
    }

    private boolean isMentioned(Comment c, String displayName, String username) {
        if (c == null || c.getContent() == null) return false;
        String mention = extractMention(c.getContent());
        if (mention == null) return false;
        if (!StringUtils.isBlank(username) && mention.equalsIgnoreCase(username)) return true;
        return !StringUtils.isBlank(displayName) && mention.equalsIgnoreCase(displayName);
    }
}
