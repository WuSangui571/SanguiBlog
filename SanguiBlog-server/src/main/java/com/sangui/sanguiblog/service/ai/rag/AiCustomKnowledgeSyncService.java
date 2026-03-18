package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeChunk;
import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeDocument;
import com.sangui.sanguiblog.model.repository.AiCustomKnowledgeChunkRepository;
import com.sangui.sanguiblog.model.repository.AiCustomKnowledgeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCustomKnowledgeSyncService {

    private static final Logger log = LoggerFactory.getLogger(AiCustomKnowledgeSyncService.class);
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_READY = "READY";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_DISABLED = "DISABLED";

    private final AiCustomKnowledgeDocumentRepository knowledgeDocumentRepository;
    private final AiCustomKnowledgeChunkRepository knowledgeChunkRepository;
    private final ObjectProvider<VectorStore> vectorStoreProvider;
    private final AiBlogRagProperties ragProperties;

    private final TokenTextSplitter tokenTextSplitter = new TokenTextSplitter();

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        if (!isOperational()) {
            return;
        }
        for (AiCustomKnowledgeDocument document : knowledgeDocumentRepository.findAll()) {
            if (Boolean.TRUE.equals(document.getEnabled())) {
                syncDocument(document.getId());
            } else {
                ensureDisabled(document.getId());
            }
        }
    }

    public void syncDocument(Long documentId) {
        if (!isOperational() || documentId == null) {
            return;
        }

        AiCustomKnowledgeDocument document = knowledgeDocumentRepository.findById(documentId).orElse(null);
        if (document == null) {
            return;
        }
        if (!Boolean.TRUE.equals(document.getEnabled())) {
            ensureDisabled(documentId);
            return;
        }

        String contentHash = AiCustomKnowledgeSupport.buildContentHash(
                document.getTitle(),
                document.getOriginalFilename(),
                document.getContentText(),
                true
        );
        if (contentHash.equals(document.getContentHash()) && STATUS_READY.equals(document.getSyncStatus())) {
            return;
        }

        Instant now = Instant.now();
        document.setContentHash(contentHash);
        document.setSyncStatus(STATUS_PENDING);
        document.setUpdatedAt(now);
        knowledgeDocumentRepository.save(document);

        try {
            removeVectorDocuments(document.getId());
            knowledgeChunkRepository.deleteByDocumentId(document.getId());

            List<Document> documents = buildChunkDocuments(document);
            if (documents.isEmpty()) {
                throw new IllegalStateException("知识库文本切片结果为空，无法建立向量索引");
            }

            vectorStore().add(documents);
            saveChunks(document, documents, now);

            document.setSyncStatus(STATUS_READY);
            document.setLastError(null);
            document.setLastSyncedAt(now);
            document.setUpdatedAt(now);
            knowledgeDocumentRepository.save(document);
        } catch (Exception ex) {
            document.setSyncStatus(STATUS_FAILED);
            document.setLastError(trimError(ex.getMessage()));
            document.setUpdatedAt(Instant.now());
            knowledgeDocumentRepository.save(document);
            log.error("同步管理员知识库向量失败，documentId={}, title={}", document.getId(), document.getTitle(), ex);
        }
    }

    public void ensureDisabled(Long documentId) {
        if (!isOperational() || documentId == null) {
            return;
        }
        knowledgeDocumentRepository.findById(documentId).ifPresent(document -> {
            try {
                removeVectorDocuments(document.getId());
                knowledgeChunkRepository.deleteByDocumentId(document.getId());
                document.setSyncStatus(STATUS_DISABLED);
                document.setLastError(null);
                document.setLastSyncedAt(Instant.now());
                document.setUpdatedAt(Instant.now());
                knowledgeDocumentRepository.save(document);
            } catch (Exception ex) {
                document.setSyncStatus(STATUS_FAILED);
                document.setLastError(trimError(ex.getMessage()));
                document.setUpdatedAt(Instant.now());
                knowledgeDocumentRepository.save(document);
                log.error("禁用管理员知识库向量失败，documentId={}", document.getId(), ex);
            }
        });
    }

    public void removeKnowledge(Long documentId) {
        if (!isOperational() || documentId == null) {
            return;
        }
        removeVectorDocuments(documentId);
        knowledgeChunkRepository.deleteByDocumentId(documentId);
    }

    private List<Document> buildChunkDocuments(AiCustomKnowledgeDocument document) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("sourceType", "ADMIN_TEXT");
        metadata.put("sourceId", document.getId());
        metadata.put("title", document.getTitle());
        metadata.put("url", "");
        metadata.put("originalFilename", document.getOriginalFilename());

        Document source = Document.builder()
                .text(AiCustomKnowledgeSupport.buildKnowledgeText(
                        document.getTitle(),
                        document.getOriginalFilename(),
                        document.getContentText()))
                .metadata(metadata)
                .build();

        List<Document> splitChunks = tokenTextSplitter.apply(List.of(source));
        List<Document> chunks = new ArrayList<>(splitChunks.size());
        for (int i = 0; i < splitChunks.size(); i++) {
            Document chunk = splitChunks.get(i);
            Map<String, Object> chunkMetadata = new HashMap<>(chunk.getMetadata());
            chunkMetadata.put("chunkNo", i + 1);
            chunks.add(Document.builder()
                    .id(AiCustomKnowledgeSupport.buildVectorDocumentId(document.getId(), i + 1))
                    .text(chunk.getText())
                    .metadata(chunkMetadata)
                    .build());
        }
        return chunks;
    }

    private void saveChunks(AiCustomKnowledgeDocument document, List<Document> documents, Instant now) {
        for (int i = 0; i < documents.size(); i++) {
            AiCustomKnowledgeChunk chunk = new AiCustomKnowledgeChunk();
            chunk.setDocument(document);
            chunk.setChunkNo(i + 1);
            chunk.setVectorDocumentId(documents.get(i).getId());
            chunk.setCreatedAt(now);
            knowledgeChunkRepository.save(chunk);
        }
    }

    private void removeVectorDocuments(Long documentId) {
        List<String> vectorIds = knowledgeChunkRepository.findByDocumentIdOrderByChunkNoAsc(documentId).stream()
                .map(AiCustomKnowledgeChunk::getVectorDocumentId)
                .filter(StringUtils::hasText)
                .toList();
        if (!vectorIds.isEmpty()) {
            vectorStore().delete(vectorIds);
        }
    }

    private String trimError(String message) {
        if (!StringUtils.hasText(message)) {
            return "未知错误";
        }
        String trimmed = message.trim();
        return trimmed.length() <= 1000 ? trimmed : trimmed.substring(0, 1000);
    }

    private boolean isOperational() {
        return ragProperties.isConfigured() && vectorStoreProvider.getIfAvailable() != null;
    }

    private VectorStore vectorStore() {
        VectorStore vectorStore = vectorStoreProvider.getIfAvailable();
        if (vectorStore == null) {
            throw new IllegalStateException("PgVector 向量库未初始化，无法同步管理员知识库");
        }
        return vectorStore;
    }
}
