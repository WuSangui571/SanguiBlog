package com.sangui.sanguiblog.service.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AiChatServiceTest {

    @Test
    void shouldAllowNullSessionIdInCompletePayload() {
        Map<String, Object> payload = AiChatService.buildCompleteEventPayload(
                "guest reply",
                null,
                "qwen-flash",
                "SITE_KNOWLEDGE_RAG_PGVECTOR",
                null
        );

        assertEquals("guest reply", payload.get("reply"));
        assertNull(payload.get("sessionId"));
        assertEquals("qwen-flash", payload.get("model"));
        assertEquals("SITE_KNOWLEDGE_RAG_PGVECTOR", payload.get("mode"));
        assertEquals(List.of(), payload.get("references"));
    }
}
