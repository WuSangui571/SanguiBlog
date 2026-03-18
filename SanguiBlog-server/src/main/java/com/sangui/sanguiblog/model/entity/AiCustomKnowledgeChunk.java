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
@Table(name = "ai_custom_knowledge_chunks",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_ai_custom_chunk_vector", columnNames = "vector_document_id"),
                @UniqueConstraint(name = "uk_ai_custom_chunk_no", columnNames = { "document_id", "chunk_no" })
        })
public class AiCustomKnowledgeChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @ToString.Exclude
    private AiCustomKnowledgeDocument document;

    @Column(name = "chunk_no", nullable = false)
    private Integer chunkNo;

    @Column(name = "vector_document_id", nullable = false, length = 128)
    private String vectorDocumentId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
