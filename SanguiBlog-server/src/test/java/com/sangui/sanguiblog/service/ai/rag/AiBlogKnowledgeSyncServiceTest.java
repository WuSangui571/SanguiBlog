package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeChunk;
import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeDocument;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeChunkRepository;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiBlogKnowledgeSyncServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private AiBlogKnowledgeDocumentRepository knowledgeDocumentRepository;

    @Mock
    private AiBlogKnowledgeChunkRepository knowledgeChunkRepository;

    @Mock
    private ObjectProvider<VectorStore> vectorStoreProvider;

    @Mock
    private VectorStore vectorStore;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Test
    void shouldFlushDeletedChunksBeforeSavingReplacementChunks() {
        AiBlogRagProperties properties = configuredProperties();
        AiBlogKnowledgeSyncService service = new AiBlogKnowledgeSyncService(
                postRepository,
                knowledgeDocumentRepository,
                knowledgeChunkRepository,
                vectorStoreProvider,
                properties,
                transactionManager
        );

        Post post = new Post();
        post.setId(216L);
        post.setTitle("AI 助理即将加入本博客系统（预告）");
        post.setSlug("ai-assistant-preview");
        post.setExcerpt("介绍 AI 助理功能规划");
        post.setContentMd("这是一篇用于测试 RAG 增量同步的文章正文。");
        post.setStatus("PUBLISHED");
        post.setCreatedAt(Instant.parse("2026-03-18T07:00:00Z"));
        post.setPublishedAt(LocalDateTime.parse("2026-03-18T15:10:00"));

        AiBlogKnowledgeDocument document = new AiBlogKnowledgeDocument();
        document.setId(10L);
        document.setPostId(post.getId());
        document.setTitle(post.getTitle());
        document.setSlug(post.getSlug());
        document.setContentHash("old-hash");
        document.setSyncStatus("READY");
        document.setCreatedAt(Instant.parse("2026-03-18T07:00:00Z"));
        document.setUpdatedAt(Instant.parse("2026-03-18T07:00:00Z"));

        AiBlogKnowledgeChunk oldChunk = new AiBlogKnowledgeChunk();
        oldChunk.setVectorDocumentId("642a157c-02ca-3094-a40f-648f71b46ec1");

        when(vectorStoreProvider.getIfAvailable()).thenReturn(vectorStore);
        when(postRepository.findKnowledgeSourceById(post.getId())).thenReturn(Optional.of(post));
        when(postRepository.findAllPublishedForKnowledge()).thenReturn(List.of(post));
        when(knowledgeDocumentRepository.findByPostId(post.getId())).thenReturn(Optional.of(document));
        when(knowledgeChunkRepository.findByDocumentIdOrderByChunkNoAsc(document.getId())).thenReturn(List.of(oldChunk));
        when(knowledgeDocumentRepository.save(any(AiBlogKnowledgeDocument.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(knowledgeChunkRepository.save(any(AiBlogKnowledgeChunk.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(vectorStore).delete(anyList());
        doNothing().when(vectorStore).add(anyList());

        service.syncPostKnowledge(post.getId());

        InOrder inOrder = inOrder(knowledgeChunkRepository);
        inOrder.verify(knowledgeChunkRepository).deleteByDocumentId(document.getId());
        inOrder.verify(knowledgeChunkRepository).flush();
        inOrder.verify(knowledgeChunkRepository).save(any(AiBlogKnowledgeChunk.class));
    }

    private AiBlogRagProperties configuredProperties() {
        AiBlogRagProperties properties = new AiBlogRagProperties();
        properties.setEnabled(true);
        properties.getPgvector().setUrl("jdbc:postgresql://localhost:5432/sanguiblog_ai");
        properties.getPgvector().setUsername("postgres");
        properties.getPgvector().setPassword("secret");
        return properties;
    }
}
