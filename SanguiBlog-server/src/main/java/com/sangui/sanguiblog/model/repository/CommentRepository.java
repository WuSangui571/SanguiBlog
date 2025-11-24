package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostIdAndStatusOrderByCreatedAtDesc(Long postId, String status);

    long countByPostIdAndStatus(Long postId, String status);

    Page<Comment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
