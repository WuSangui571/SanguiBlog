package com.sangui.sanguiblog.service.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiChatServiceTest {

    @Test
    void shouldAllowNullSessionIdInCompletePayload() {
        Map<String, Object> payload = AiChatService.buildCompleteEventPayload(
                "guest reply",
                null,
                "gpt-4o-mini",
                "SITE_KNOWLEDGE_RAG_PGVECTOR",
                null
        );

        assertEquals("guest reply", payload.get("reply"));
        assertNull(payload.get("sessionId"));
        assertEquals("gpt-4o-mini", payload.get("model"));
        assertEquals("SITE_KNOWLEDGE_RAG_PGVECTOR", payload.get("mode"));
        assertEquals(List.of(), payload.get("references"));
    }

    @Test
    void shouldTreatMissingOpenAiApiKeyPlaceholderAsUnconfigured() {
        assertFalse(AiChatService.isConfiguredOpenAiApiKey(null));
        assertFalse(AiChatService.isConfiguredOpenAiApiKey(""));
        assertFalse(AiChatService.isConfiguredOpenAiApiKey("   "));
        assertFalse(AiChatService.isConfiguredOpenAiApiKey("__unset__"));
        assertTrue(AiChatService.isConfiguredOpenAiApiKey("sk-test"));
    }

    @Test
    void shouldUseCurrentMessageAsRagQueryWhenQuestionIsSpecific() {
        String query = AiChatService.buildRagQuery(
                "介绍三桂博客",
                List.of("上一轮用户问题", "上一轮助手回答")
        );

        assertEquals("介绍三桂博客", query);
    }

    @Test
    void shouldIncludeRecentContextInRagQueryWhenQuestionIsContinuation() {
        String query = AiChatService.buildRagQuery(
                "继续",
                List.of("请介绍三桂博客", "三桂博客是一个个人博客")
        );

        assertTrue(query.contains("请介绍三桂博客"));
        assertTrue(query.contains("三桂博客是一个个人博客"));
        assertTrue(query.endsWith("继续"));
    }

    @Test
    void shouldIncludeRecentContextInRagQueryWhenQuestionIsPunctuationOnly() {
        String query = AiChatService.buildRagQuery(
                "？",
                List.of("介绍三桂博客")
        );

        assertEquals("介绍三桂博客" + System.lineSeparator() + "？", query);
    }
}
