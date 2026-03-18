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
@Table(name = "ai_custom_knowledge_documents")
public class AiCustomKnowledgeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Lob
    @Column(name = "content_text", nullable = false, columnDefinition = "LONGTEXT")
    private String contentText;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(name = "sync_status", nullable = false, length = 32)
    private String syncStatus;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
