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
    interface PostApprovedCountRow {
        Long getPostId();
        Long getCount();
    }

    List<Comment> findByPostIdAndStatusOrderByCreatedAtDesc(Long postId, String status);

    long countByPostIdAndStatus(Long postId, String status);

    Page<Comment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("select c.post.id as postId, count(c.id) as count "
            + "from Comment c "
            + "where c.status = :status and c.post.id in :postIds "
            + "group by c.post.id")
    List<PostApprovedCountRow> countByPostIdInAndStatusGroupByPostId(@Param("postIds") List<Long> postIds,
            @Param("status") String status);

    @Query("select c from Comment c where c.post.author.id = :authorId")
    List<Comment> findByPostAuthorId(@Param("authorId") Long authorId);

    @Query("select c from Comment c where c.parent is not null and c.parent.user.id = :userId")
    List<Comment> findByParentUserId(@Param("userId") Long userId);
}
