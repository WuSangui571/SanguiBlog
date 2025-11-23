package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.model.dto.CreateCommentRequest;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    private final UserRepository userRepository;

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
        return toDto(saved);
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId, boolean isAdmin) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("评论不存在"));

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
    public CommentDto updateComment(Long commentId, Long userId, String newContent) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("评论不存在"));

        // Check permission: user must own the comment
        if (comment.getUser() == null || !comment.getUser().getId().equals(userId)) {
            throw new SecurityException("无权编辑此评论");
        }

        comment.setContent(newContent);
        comment.setUpdatedAt(new Timestamp(System.currentTimeMillis()).toInstant());
        Comment updated = commentRepository.save(comment);
        return toDto(updated);
    }

    private CommentDto toDto(Comment comment) {
        String time = comment.getCreatedAt() != null
                ? TIME_FMT.format(comment.getCreatedAt().atZone(ZoneId.systemDefault()))
                : "";

        String avatarUrl = comment.getAuthorAvatarUrl();
        if (avatarUrl != null && !avatarUrl.isEmpty() && !avatarUrl.startsWith("http")) {
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
                .build();
    }
}
