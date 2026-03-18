package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiCustomKnowledgeDocumentRepository extends JpaRepository<AiCustomKnowledgeDocument, Long> {
    Page<AiCustomKnowledgeDocument> findByTitleContainingIgnoreCaseOrOriginalFilenameContainingIgnoreCase(
            String title,
            String originalFilename,
            Pageable pageable
    );
}
