package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminCommentItemDto;
import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.model.dto.CreateCommentRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final Set<String> REVIEWABLE_STATUS = Set.of("APPROVED", "PENDING", "REJECTED", "SPAM");
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<CommentDto> listByPost(Long postId) {
        List<Comment> comments = commentRepository.findByPostIdAndStatusOrderByCreatedAtDesc(postId, "APPROVED");
        List<CommentDto> allDtos = comments.stream().map(this::toDto).toList();

        // Build tree structure
        java.util.Map<Long, CommentDto> dtoMap = allDtos.stream()
                .collect(java.util.stream.Collectors.toMap(CommentDto::getId, dto -> dto));

        List<CommentDto> rootComments = new java.util.ArrayList<>();

        for (CommentDto dto : allDtos) {
            if (dto.getParentId() != null) {
                CommentDto parent = dtoMap.get(dto.getParentId());
                if (parent != null) {
                    if (parent.getReplies() == null) {
                        parent.setReplies(new java.util.ArrayList<>());
                    }
                    parent.getReplies().add(dto);
                }
            } else {
                rootComments.add(dto);
            }
        }

        // Sort replies by time (oldest first for conversation flow)
        for (CommentDto dto : allDtos) {
            if (dto.getReplies() != null) {
                dto.getReplies().sort(java.util.Comparator.comparing(CommentDto::getTime));
            }
        }

        return rootComments;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminCommentItemDto> searchComments(Long postId,
            String keyword,
            String status,
            int page,
            int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);

        Specification<Comment> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (postId != null) {
                predicates.add(cb.equal(root.get("post").get("id"), postId));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase(Locale.ROOT)));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("content")), pattern),
                        cb.like(cb.lower(root.get("authorName")), pattern)));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Comment> result = commentRepository.findAll(specification, pageable);
        List<AdminCommentItemDto> records = result.stream()
                .map(this::toAdminItem)
                .toList();
        return new PageResponse<>(records, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional
    public CommentDto create(Long postId, CreateCommentRequest request, String ip, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("文章不存在"));

        Comment comment = new Comment();
        comment.setPost(post);

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("父评论不存在"));
            comment.setParent(parent);
        }

        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                comment.setUser(user);
                // If user is logged in, use their display name and avatar
                comment.setAuthorName(user.getDisplayName());
                comment.setAuthorAvatarUrl(user.getAvatarUrl());
            } else {
                comment.setAuthorName(request.getAuthorName());
                comment.setAuthorAvatarUrl(request.getAvatarUrl());
            }
        } else {
            comment.setAuthorName(request.getAuthorName());
            comment.setAuthorAvatarUrl(request.getAvatarUrl());
        }

        comment.setContent(request.getContent());
        comment.setAuthorIp(ip);
        comment.setStatus("APPROVED");
        comment.setLikeCount(0);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        comment.setCreatedAt(now.toInstant());
        comment.setUpdatedAt(now.toInstant());

        Comment saved = commentRepository.save(comment);
        post.setCommentsCount((post.getCommentsCount() == null ? 0 : post.getCommentsCount()) + 1);
        postRepository.save(post);
        notificationService.createForComment(saved);
        return toDto(saved);
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId, Long userId, boolean isAdmin) {
        Comment comment = requireComment(commentId, postId);

        // Check permission: user must own the comment OR be admin
        if (!isAdmin && (comment.getUser() == null || !comment.getUser().getId().equals(userId))) {
            throw new SecurityException("无权删除此评论");
        }

        Post post = comment.getPost();
        commentRepository.delete(comment);

        // Decrement post comment count
        if (post.getCommentsCount() != null && post.getCommentsCount() > 0) {
            post.setCommentsCount(post.getCommentsCount() - 1);
            postRepository.save(post);
        }
    }

    @Transactional
    public CommentDto updateComment(Long postId, Long commentId, Long userId, String newContent) {
        return updateComment(postId, commentId, userId, newContent, false);
    }

    @Transactional
    public CommentDto updateComment(Long postId, Long commentId, Long userId, String newContent, boolean isAdmin) {
        Comment updated = updateCommentInternal(postId, commentId, userId, isAdmin, newContent, null);
        return toDto(updated);
    }

    @Transactional
    public AdminCommentItemDto updateCommentAsAdmin(Long commentId, String newContent, String status, Long operatorId) {
        Comment updated = updateCommentInternal(null, commentId, operatorId, true, newContent, status);
        return toAdminItem(updated);
    }

    @Transactional(readOnly = true)
    public List<CommentDto> listRecent(int size) {
        int limit = Math.min(Math.max(size, 1), 20);
        Page<Comment> page = commentRepository.findByStatusOrderByCreatedAtDesc("APPROVED", PageRequest.of(0, limit));
        return page.stream()
                .map(comment -> {
                    CommentDto dto = toDto(comment);
                    dto.setReplies(null);
                    return dto;
                })
                .toList();
    }

    private Comment updateCommentInternal(Long postId, Long commentId, Long userId, boolean isAdmin, String newContent, String status) {
        Comment comment = requireComment(commentId, postId);
        if (!isAdmin) {
            if (comment.getUser() == null || userId == null || !comment.getUser().getId().equals(userId)) {
                throw new SecurityException("无权编辑此评论");
            }
        }
        boolean hasContent = newContent != null && !newContent.trim().isEmpty();
        if (!hasContent && (status == null || status.isBlank())) {
            throw new IllegalArgumentException("内容不能为空");
        }
        if (hasContent) {
            comment.setContent(newContent.trim());
        }
        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toUpperCase(Locale.ROOT);
            if (!REVIEWABLE_STATUS.contains(normalized)) {
                throw new IllegalArgumentException("不支持的评论状态：" + status);
            }
            comment.setStatus(normalized);
        }
        comment.setUpdatedAt(Instant.now());
        return commentRepository.save(comment);
    }

    private Comment requireComment(Long commentId, Long postId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("评论不存在"));
        if (postId != null) {
            Long actualPostId = comment.getPost() != null ? comment.getPost().getId() : null;
            if (actualPostId == null || !postId.equals(actualPostId)) {
                throw new IllegalArgumentException("评论不属于当前文章");
            }
        }
        return comment;
    }

    private AdminCommentItemDto toAdminItem(Comment comment) {
        String createdAt = comment.getCreatedAt() != null
                ? TIME_FMT.format(comment.getCreatedAt().atZone(ZoneId.systemDefault()))
                : "";
        return AdminCommentItemDto.builder()
                .id(comment.getId())
                .postId(comment.getPost() != null ? comment.getPost().getId() : null)
                .postTitle(comment.getPost() != null ? comment.getPost().getTitle() : null)
                .postSlug(comment.getPost() != null ? comment.getPost().getSlug() : null)
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .userId(comment.getUser() != null ? comment.getUser().getId() : null)
                .authorName(comment.getAuthorName())
                .authorIp(comment.getAuthorIp())
                .status(comment.getStatus())
                .content(comment.getContent())
                .createdAt(createdAt)
                .build();
    }

    private CommentDto toDto(Comment comment) {
        String time = comment.getCreatedAt() != null
                ? TIME_FMT.format(comment.getCreatedAt().atZone(ZoneId.systemDefault()))
                : "";

        String avatarUrl = null;
        if (comment.getUser() != null) {
            avatarUrl = comment.getUser().getAvatarUrl();
        }
        if ((avatarUrl == null || avatarUrl.isBlank()) && comment.getAuthorAvatarUrl() != null) {
            avatarUrl = comment.getAuthorAvatarUrl();
        }
        if (avatarUrl != null && !avatarUrl.isBlank() && !avatarUrl.startsWith("http")) {
            if (avatarUrl.startsWith("/avatar/")) {
                avatarUrl = avatarUrl.substring("/avatar/".length());
            } else if (avatarUrl.startsWith("avatar/")) {
                avatarUrl = avatarUrl.substring("avatar/".length());
            }
            avatarUrl = "/avatar/" + avatarUrl;
        }

        return CommentDto.builder()
                .id(comment.getId())
                .userId(comment.getUser() != null ? comment.getUser().getId() : null)
                .authorName(comment.getAuthorName())
                .avatar(avatarUrl)
                .content(comment.getContent())
                .likes(comment.getLikeCount() == null ? 0 : comment.getLikeCount())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .replies(new java.util.ArrayList<>())
                .time(time)
                .postId(comment.getPost() != null ? comment.getPost().getId() : null)
                .postTitle(comment.getPost() != null ? comment.getPost().getTitle() : null)
                .postSlug(comment.getPost() != null ? comment.getPost().getSlug() : null)
                .build();
    }
}
