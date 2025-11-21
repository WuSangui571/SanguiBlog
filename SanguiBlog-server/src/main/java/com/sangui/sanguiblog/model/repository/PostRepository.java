package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {
    Optional<Post> findBySlugAndStatus(String slug, String status);

    Optional<Post> findFirstByStatusOrderByPublishedAtDesc(String status);

    @org.springframework.data.jpa.repository.Query("select coalesce(sum(p.viewsCount),0) from Post p")
    Long sumViews();
}
