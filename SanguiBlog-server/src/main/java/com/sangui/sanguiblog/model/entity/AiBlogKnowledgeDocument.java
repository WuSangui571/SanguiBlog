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
@Table(name = "ai_blog_knowledge_documents",
        uniqueConstraints = @UniqueConstraint(name = "uk_ai_blog_knowledge_post", columnNames = "post_id"))
public class AiBlogKnowledgeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 255)
    private String slug;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "sync_status", nullable = false, length = 32)
    private String syncStatus;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
