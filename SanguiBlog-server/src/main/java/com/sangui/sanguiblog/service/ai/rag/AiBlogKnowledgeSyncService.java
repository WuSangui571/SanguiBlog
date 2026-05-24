package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeChunk;
import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeDocument;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeChunkRepository;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AiBlogKnowledgeSyncService {

    private static final Logger log = LoggerFactory.getLogger(AiBlogKnowledgeSyncService.class);
    private static final String STATUS_READY = "READY";
    private static final String STATUS_FAILED = "FAILED";
    private static final int OVERVIEW_DELETE_WINDOW = 128;

    private final PostRepository postRepository;
    private final AiBlogKnowledgeDocumentRepository knowledgeDocumentRepository;
    private final AiBlogKnowledgeChunkRepository knowledgeChunkRepository;
    private final ObjectProvider<VectorStore> vectorStoreProvider;
    private final AiBlogRagProperties ragProperties;
    private final PlatformTransactionManager transactionManager;

    private final TokenTextSplitter tokenTextSplitter = new TokenTextSplitter();

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        if (!ragProperties.isSyncOnStartup() || !isOperational()) {
            return;
        }

        List<Post> publishedPosts = postRepository.findAllPublishedForKnowledge();
        for (Post post : publishedPosts) {
            executeInNewTransaction(() -> syncPublishedPost(post));
        }

        for (AiBlogKnowledgeDocument document : knowledgeDocumentRepository.findAll()) {
            if (!postRepository.existsByIdAndStatus(document.getPostId(), "PUBLISHED")) {
                executeInNewTransaction(() -> removeTrackedPostKnowledge(document.getPostId()));
            }
        }

        executeInNewTransaction(() -> syncOverviewDocument(publishedPosts));
        log.info("博客 RAG 启动同步完成，已扫描 {} 篇已发布文章", publishedPosts.size());
    }

    @Transactional
    public void syncPostKnowledge(Long postId) {
        if (!isOperational() || postId == null) {
            return;
        }

        Optional<Post> post = postRepository.findKnowledgeSourceById(postId);
        if (post.isEmpty() || !isPublished(post.get())) {
            removePostKnowledge(postId);
            return;
        }

        syncPublishedPost(post.get());
        syncOverviewDocument(postRepository.findAllPublishedForKnowledge());
    }

    @Transactional
    public void removePostKnowledge(Long postId) {
        if (!isOperational() || postId == null) {
            return;
        }

        removeTrackedPostKnowledge(postId);
        syncOverviewDocument(postRepository.findAllPublishedForKnowledge());
    }

    private void removeTrackedPostKnowledge(Long postId) {
        knowledgeDocumentRepository.findByPostId(postId).ifPresent(document -> {
            try {
                deleteVectorDocuments(document.getId());
                knowledgeChunkRepository.deleteByDocumentId(document.getId());
                knowledgeChunkRepository.flush();
                knowledgeDocumentRepository.delete(document);
                knowledgeDocumentRepository.flush();
            } catch (Exception ex) {
                markFailed(document, ex);
                log.error("删除博客知识向量失败，postId={}", postId, ex);
            }
        });
    }

    private void syncPublishedPost(Post post) {
        Instant now = Instant.now();
        String contentHash = AiBlogKnowledgeSupport.buildContentHash(post);
        AiBlogKnowledgeDocument document = knowledgeDocumentRepository.findByPostId(post.getId())
                .orElseGet(() -> {
                    AiBlogKnowledgeDocument created = new AiBlogKnowledgeDocument();
                    created.setPostId(post.getId());
                    created.setCreatedAt(now);
                    return created;
                });

        if (contentHash.equals(document.getContentHash()) && STATUS_READY.equals(document.getSyncStatus())) {
            return;
        }

        document.setTitle(post.getTitle());
        document.setSlug(post.getSlug());
        document.setContentHash(contentHash);
        document.setSyncStatus("PENDING");
        document.setUpdatedAt(now);
        knowledgeDocumentRepository.save(document);

        try {
            deleteVectorDocuments(document.getId());
            knowledgeChunkRepository.deleteByDocumentId(document.getId());
            knowledgeChunkRepository.flush();

            List<Document> documents = buildChunkDocuments(post);
            if (documents.isEmpty()) {
                throw new IllegalStateException("文章内容切片结果为空，无法建立知识索引");
            }

            vectorStore().add(documents);
            saveChunks(document, documents, now);

            document.setSyncStatus(STATUS_READY);
            document.setLastError(null);
            document.setLastSyncedAt(now);
            document.setUpdatedAt(now);
            knowledgeDocumentRepository.save(document);
        } catch (Exception ex) {
            markFailed(document, ex);
            log.error("同步博客知识向量失败，postId={}, title={}", post.getId(), post.getTitle(), ex);
        }
    }

    private List<Document> buildChunkDocuments(Post post) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("sourceType", "POST");
        metadata.put("sourceId", post.getId());
        metadata.put("title", post.getTitle());
        metadata.put("slug", post.getSlug());
        metadata.put("url", AiBlogKnowledgeSupport.buildPostUrl(post.getId()));
        if (post.getPublishedAt() != null) {
            metadata.put("publishedAt", post.getPublishedAt().toString());
        }

        Document source = Document.builder()
                .text(AiBlogKnowledgeSupport.buildKnowledgeText(post))
                .metadata(metadata)
                .build();

        List<Document> splitChunks = tokenTextSplitter.apply(List.of(source));
        List<Document> chunks = new ArrayList<>(splitChunks.size());
        for (int i = 0; i < splitChunks.size(); i++) {
            Document chunk = splitChunks.get(i);
            Map<String, Object> chunkMetadata = new HashMap<>(chunk.getMetadata());
            chunkMetadata.put("chunkNo", i + 1);
            chunks.add(Document.builder()
                    .id(AiBlogKnowledgeSupport.buildVectorDocumentId(post.getId(), i + 1))
                    .text(chunk.getText())
                    .metadata(chunkMetadata)
                    .build());
        }
        return chunks;
    }

    private void saveChunks(AiBlogKnowledgeDocument document, List<Document> documents, Instant now) {
        for (int i = 0; i < documents.size(); i++) {
            AiBlogKnowledgeChunk chunk = new AiBlogKnowledgeChunk();
            chunk.setDocument(document);
            chunk.setChunkNo(i + 1);
            chunk.setVectorDocumentId(documents.get(i).getId());
            chunk.setCreatedAt(now);
            knowledgeChunkRepository.save(chunk);
        }
    }

    private void syncOverviewDocument(List<Post> posts) {
        try {
            deleteOverviewDocuments();
            if (posts == null || posts.isEmpty()) {
                return;
            }

            List<Document> overviewDocuments = AiBlogKnowledgeSupport.buildOverviewDocuments(posts, tokenTextSplitter);
            if (overviewDocuments.isEmpty()) {
                return;
            }

            vectorStore().add(overviewDocuments);
        } catch (Exception ex) {
            log.error("同步博客知识总览文档失败", ex);
        }
    }

    private void deleteVectorDocuments(Long documentId) {
        List<String> vectorIds = knowledgeChunkRepository.findByDocumentIdOrderByChunkNoAsc(documentId).stream()
                .map(AiBlogKnowledgeChunk::getVectorDocumentId)
                .filter(StringUtils::hasText)
                .toList();
        if (!vectorIds.isEmpty()) {
            vectorStore().delete(vectorIds);
        }
    }

    private void deleteOverviewDocuments() {
        List<String> overviewIds = new ArrayList<>();
        overviewIds.add(AiBlogKnowledgeSupport.buildOverviewDocumentId());
        for (int i = 1; i <= OVERVIEW_DELETE_WINDOW; i++) {
            overviewIds.add(AiBlogKnowledgeSupport.buildOverviewChunkDocumentId(i));
        }
        vectorStore().delete(overviewIds);
    }

    private void markFailed(AiBlogKnowledgeDocument document, Exception ex) {
        document.setSyncStatus(STATUS_FAILED);
        document.setLastError(trimError(ex.getMessage()));
        document.setUpdatedAt(Instant.now());
        knowledgeDocumentRepository.save(document);
    }

    private String trimError(String message) {
        if (!StringUtils.hasText(message)) {
            return "未知错误";
        }
        String trimmed = message.trim();
        return trimmed.length() <= 1000 ? trimmed : trimmed.substring(0, 1000);
    }

    private boolean isPublished(Post post) {
        return post != null && "PUBLISHED".equalsIgnoreCase(post.getStatus()) && post.getPublishedAt() != null;
    }

    private boolean isOperational() {
        return ragProperties.isConfigured() && vectorStoreProvider.getIfAvailable() != null;
    }

    private VectorStore vectorStore() {
        VectorStore vectorStore = vectorStoreProvider.getIfAvailable();
        if (vectorStore == null) {
            throw new IllegalStateException("PgVector 向量库未初始化，无法同步博客知识");
        }
        return vectorStore;
    }

    private void executeInNewTransaction(Runnable action) {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transactionTemplate.executeWithoutResult(status -> action.run());
    }
}
