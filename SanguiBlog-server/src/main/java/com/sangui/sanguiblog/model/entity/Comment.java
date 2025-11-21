package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Getter
@Setter
@ToString
@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    @ToString.Exclude
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @ToString.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    @ToString.Exclude
    private Comment parent;

    @Column(name = "author_name", nullable = false, length = 128)
    private String authorName;

    @Column(name = "author_avatar_url", length = 512)
    private String authorAvatarUrl;

    @Column(name = "author_ip", length = 45)
    private String authorIp;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "like_count")
    private Integer likeCount;

    @Column(length = 16)
    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
