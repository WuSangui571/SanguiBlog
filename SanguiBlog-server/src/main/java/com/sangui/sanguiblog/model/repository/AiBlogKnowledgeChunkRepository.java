package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiBlogKnowledgeChunkRepository extends JpaRepository<AiBlogKnowledgeChunk, Long> {
    List<AiBlogKnowledgeChunk> findByDocumentIdOrderByChunkNoAsc(Long documentId);

    void deleteByDocumentId(Long documentId);
}
