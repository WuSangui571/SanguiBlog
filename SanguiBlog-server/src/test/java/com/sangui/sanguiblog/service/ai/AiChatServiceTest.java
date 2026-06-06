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
}
