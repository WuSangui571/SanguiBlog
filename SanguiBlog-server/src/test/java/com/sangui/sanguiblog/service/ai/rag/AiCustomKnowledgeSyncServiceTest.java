package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeChunk;
import com.sangui.sanguiblog.model.entity.AiCustomKnowledgeDocument;
import com.sangui.sanguiblog.model.repository.AiCustomKnowledgeChunkRepository;
import com.sangui.sanguiblog.model.repository.AiCustomKnowledgeDocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiCustomKnowledgeSyncServiceTest {

    @Mock
    private AiCustomKnowledgeDocumentRepository knowledgeDocumentRepository;

    @Mock
    private AiCustomKnowledgeChunkRepository knowledgeChunkRepository;

    @Mock
    private ObjectProvider<VectorStore> vectorStoreProvider;

    @Mock
    private VectorStore vectorStore;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Test
    void syncOnStartupShouldReturnBeforeResolvingVectorStoreWhenDisabled() {
        AiBlogRagProperties properties = configuredProperties();
        properties.setSyncOnStartup(false);
        AiCustomKnowledgeSyncService service = new AiCustomKnowledgeSyncService(
                knowledgeDocumentRepository,
                knowledgeChunkRepository,
                vectorStoreProvider,
                properties,
                transactionManager
        );

        service.syncOnStartup();

        verifyNoInteractions(vectorStoreProvider, knowledgeDocumentRepository, knowledgeChunkRepository);
    }

    @Test
    void shouldFlushDeletedChunksBeforeSavingReplacementChunks() {
        AiBlogRagProperties properties = configuredProperties();
        AiCustomKnowledgeSyncService service = new AiCustomKnowledgeSyncService(
                knowledgeDocumentRepository,
                knowledgeChunkRepository,
                vectorStoreProvider,
                properties,
                transactionManager
        );

        AiCustomKnowledgeDocument document = new AiCustomKnowledgeDocument();
        document.setId(5L);
        document.setTitle("运维知识库");
        document.setOriginalFilename("ops-guide.md");
        document.setContentText("这是一份新的知识库正文，用于测试向量重建。");
        document.setContentHash("old-hash");
        document.setEnabled(true);
        document.setSyncStatus("READY");
        document.setCreatedAt(Instant.parse("2026-03-18T07:00:00Z"));
        document.setUpdatedAt(Instant.parse("2026-03-18T07:00:00Z"));

        AiCustomKnowledgeChunk oldChunk = new AiCustomKnowledgeChunk();
        oldChunk.setVectorDocumentId("3e8f5230-36d6-3f0e-b3b1-37d07f0e3cc0");

        when(vectorStoreProvider.getIfAvailable()).thenReturn(vectorStore);
        when(knowledgeDocumentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(knowledgeChunkRepository.findByDocumentIdOrderByChunkNoAsc(document.getId())).thenReturn(List.of(oldChunk));
        when(knowledgeDocumentRepository.save(any(AiCustomKnowledgeDocument.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(knowledgeChunkRepository.save(any(AiCustomKnowledgeChunk.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(vectorStore).delete(anyList());
        doNothing().when(vectorStore).add(anyList());

        service.syncDocument(document.getId());

        InOrder inOrder = inOrder(knowledgeChunkRepository);
        inOrder.verify(knowledgeChunkRepository).deleteByDocumentId(document.getId());
        inOrder.verify(knowledgeChunkRepository).flush();
        inOrder.verify(knowledgeChunkRepository).save(any(AiCustomKnowledgeChunk.class));
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
