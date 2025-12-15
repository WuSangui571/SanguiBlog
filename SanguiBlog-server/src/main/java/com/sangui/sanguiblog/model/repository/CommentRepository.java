package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long>, JpaSpecificationExecutor<Comment> {
    List<Comment> findByPostIdAndStatusOrderByCreatedAtDesc(Long postId, String status);

    long countByPostIdAndStatus(Long postId, String status);

    Page<Comment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("select c from Comment c where c.post.author.id = :authorId")
    List<Comment> findByPostAuthorId(@Param("authorId") Long authorId);

    @Query("select c from Comment c where c.parent is not null and c.parent.user.id = :userId")
    List<Comment> findByParentUserId(@Param("userId") Long userId);
}
