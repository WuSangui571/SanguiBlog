package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.CommentDto;
import com.sangui.sanguiblog.model.dto.CreateCommentRequest;
import com.sangui.sanguiblog.model.entity.Comment;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
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

    public List<CommentDto> listByPost(Long postId) {
        List<Comment> comments = commentRepository.findByPostIdAndStatusOrderByCreatedAtDesc(postId, "APPROVED");
        return comments.stream().map(this::toDto).toList();
    }

    @Transactional
    public CommentDto create(Long postId, CreateCommentRequest request, String ip) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("文章不存在"));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthorName(request.getAuthorName());
        comment.setContent(request.getContent());
        comment.setAuthorAvatarUrl(request.getAvatarUrl());
        comment.setAuthorIp(ip);
        comment.setStatus("APPROVED");
        comment.setLikeCount(0);
        comment.setCreatedAt(new Timestamp(System.currentTimeMillis()).toInstant());

        Comment saved = commentRepository.save(comment);
        post.setCommentsCount((post.getCommentsCount() == null ? 0 : post.getCommentsCount()) + 1);
        postRepository.save(post);
        return toDto(saved);
    }

    private CommentDto toDto(Comment comment) {
        String time = comment.getCreatedAt() != null
                ? TIME_FMT.format(comment.getCreatedAt().atZone(ZoneId.systemDefault()))
                : "";
        return CommentDto.builder()
                .id(comment.getId())
                .authorName(comment.getAuthorName())
                .avatar(comment.getAuthorAvatarUrl())
                .content(comment.getContent())
                .likes(comment.getLikeCount() == null ? 0 : comment.getLikeCount())
                .time(time)
                .build();
    }
}
