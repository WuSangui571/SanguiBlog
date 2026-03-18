package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiCustomKnowledgeChunkRepository extends JpaRepository<AiCustomKnowledgeChunk, Long> {
    List<AiCustomKnowledgeChunk> findByDocumentIdOrderByChunkNoAsc(Long documentId);

    void deleteByDocumentId(Long documentId);
}
