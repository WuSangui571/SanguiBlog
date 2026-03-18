package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiBlogKnowledgeDocumentRepository extends JpaRepository<AiBlogKnowledgeDocument, Long> {
    Optional<AiBlogKnowledgeDocument> findByPostId(Long postId);

    long countBySyncStatus(String syncStatus);
}
