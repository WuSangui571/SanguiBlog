package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.dto.AiChatResponse;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiBlogRagService {

    private static final Logger log = LoggerFactory.getLogger(AiBlogRagService.class);

    private final ObjectProvider<VectorStore> vectorStoreProvider;
    private final AiBlogRagProperties ragProperties;

    public AiBlogRagContext retrieve(String question) {
        if (!ragProperties.isConfigured() || !StringUtils.hasText(question)) {
            return AiBlogRagContext.empty();
        }

        VectorStore vectorStore = vectorStoreProvider.getIfAvailable();
        if (vectorStore == null) {
            return AiBlogRagContext.empty();
        }

        long startNanos = System.nanoTime();
        try {
            SearchRequest request = SearchRequest.builder()
                    .query(question.trim())
                    .topK(Math.max(1, ragProperties.getTopK()))
                    .similarityThreshold(ragProperties.getSimilarityThreshold())
                    .build();

            List<Document> documents = vectorStore.similaritySearch(request);
            if (documents == null || documents.isEmpty()) {
                return AiBlogRagContext.empty();
            }

            return new AiBlogRagContext(
                    AiBlogKnowledgeSupport.buildRagContext(documents),
                    AiBlogKnowledgeSupport.buildReferences(documents),
                    "SITE_KNOWLEDGE_RAG_PGVECTOR"
            );
        } catch (Exception ex) {
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
            log.warn("博客 RAG 检索降级: stage=similaritySearch, exceptionClass={}, elapsedMs={}, message={}",
                    ex.getClass().getName(), elapsedMs, ex.getMessage());
            return AiBlogRagContext.empty();
        }
    }

    @Getter
    @RequiredArgsConstructor
    public static class AiBlogRagContext {
        private static final AiBlogRagContext EMPTY = new AiBlogRagContext("", List.of(), "DATABASE_SESSION_HISTORY");

        private final String systemContext;
        private final List<AiChatResponse.ReferenceDto> references;
        private final String mode;

        public boolean hasContext() {
            return StringUtils.hasText(systemContext);
        }

        public static AiBlogRagContext empty() {
            return EMPTY;
        }
    }
}
