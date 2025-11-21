package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@ToString
@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @ToString.Exclude
    private Category category;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(length = 512)
    private String excerpt;

    @Column(name = "content_md", columnDefinition = "MEDIUMTEXT")
    private String contentMd;

    @Column(name = "content_html", columnDefinition = "MEDIUMTEXT")
    private String contentHtml;

    @Column(name = "theme_color", length = 64)
    private String themeColor;

    @Column(length = 32)
    private String status;

    @Column(name = "likes_count")
    private Integer likesCount;

    @Column(name = "comments_count")
    private Integer commentsCount;

    @Column(name = "views_count")
    private Long viewsCount;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "post_tags",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @ToString.Exclude
    private Set<Tag> tags = new HashSet<>();
}
