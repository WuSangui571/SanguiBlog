package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiBlogVectorStoreConfigTest {

    @Test
    void shouldRejectRagVectorStoreWhenOpenAiApiKeyIsMissing() {
        AiBlogVectorStoreConfig config = new AiBlogVectorStoreConfig("", "", "text-embedding-3-small");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                config.aiBlogVectorStore(emptyEmbeddingModelProvider(), new AiBlogRagProperties()));

        assertTrue(ex.getMessage().contains("AI_OPENAI_API_KEY"));
    }

    @Test
    void shouldRejectRagVectorStoreWhenOpenAiApiKeyIsPlaceholder() {
        AiBlogVectorStoreConfig config = new AiBlogVectorStoreConfig("__unset__", "__unset__", "text-embedding-3-small");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                config.aiBlogVectorStore(emptyEmbeddingModelProvider(), new AiBlogRagProperties()));

        assertTrue(ex.getMessage().contains("AI_OPENAI_EMBEDDING_API_KEY"));
    }

    @Test
    void shouldAllowDedicatedEmbeddingApiKeyWhenCommonOpenAiApiKeyIsPlaceholder() {
        AiBlogVectorStoreConfig config = new AiBlogVectorStoreConfig(
                "__unset__",
                "embedding-key",
                "text-embedding-3-small"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                config.aiBlogVectorStore(emptyEmbeddingModelProvider(), new AiBlogRagProperties()));

        assertTrue(ex.getMessage().contains("EmbeddingModel"));
    }

    @Test
    void shouldRejectRagVectorStoreWhenEmbeddingModelNameIsMissing() {
        AiBlogVectorStoreConfig config = new AiBlogVectorStoreConfig("test-key", "test-key", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                config.aiBlogVectorStore(emptyEmbeddingModelProvider(), new AiBlogRagProperties()));

        assertTrue(ex.getMessage().contains("AI_OPENAI_EMBEDDING_MODEL"));
    }

    private static org.springframework.beans.factory.ObjectProvider<EmbeddingModel> emptyEmbeddingModelProvider() {
        return new DefaultListableBeanFactory().getBeanProvider(EmbeddingModel.class);
    }
}
