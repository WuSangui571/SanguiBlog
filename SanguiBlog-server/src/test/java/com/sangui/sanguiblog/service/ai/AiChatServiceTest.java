package com.sangui.sanguiblog.service.ai;

import org.junit.jupiter.api.Test;
import reactor.core.Disposable;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

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
    void shouldBuildCompleteEventPayloadWithNonNullReferences() {
        List<String> refs = List.of("ref-a", "ref-b");
        Map<String, Object> payload = AiChatService.buildCompleteEventPayload(
                "reply", 1L, "gpt-4o-mini", "SITE_KNOWLEDGE_RAG_PGVECTOR", refs
        );

        assertEquals("reply", payload.get("reply"));
        assertEquals(1L, payload.get("sessionId"));
        assertEquals(refs, payload.get("references"));
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

    @Test
    void shouldNotTreatEmptyMessageAsContinuationInRagQuery() {
        String query = AiChatService.buildRagQuery(
                "",
                List.of("介绍三桂博客", "回复")
        );

        assertEquals("", query);
    }

    @Test
    void shouldHandleNullContextInRagQuery() {
        String query = AiChatService.buildRagQuery("继续", null);

        assertEquals("继续", query);
    }

    @Test
    void shouldHandleEmptyContextInRagQuery() {
        String query = AiChatService.buildRagQuery("继续", List.of());

        assertEquals("继续", query);
    }

    @Test
    void shouldReleaseConcurrencyPermitExactlyOnce() {
        AtomicBoolean permitReleased = new AtomicBoolean(false);

        boolean firstRelease = permitReleased.compareAndSet(false, true);
        assertTrue(firstRelease, "first release should succeed");

        boolean secondRelease = permitReleased.compareAndSet(false, true);
        assertFalse(secondRelease, "second release should be a no-op");

        assertTrue(permitReleased.get(), "permit should be marked as released");
    }

    @Test
    void shouldSkipProviderSubscriptionWhenStreamAlreadyClosed() {
        AiChatService.StreamSubscriptionState state = new AiChatService.StreamSubscriptionState();
        AtomicBoolean subscribed = new AtomicBoolean(false);

        state.close();
        boolean accepted = state.subscribeIfOpen(() -> {
            subscribed.set(true);
            return new DummyDisposable();
        });

        assertFalse(accepted);
        assertFalse(subscribed.get(), "provider subscription should not start after stream closes");
    }

    @Test
    void shouldDisposeProviderSubscriptionWhenStreamCloses() {
        AiChatService.StreamSubscriptionState state = new AiChatService.StreamSubscriptionState();
        DummyDisposable disposable = new DummyDisposable();

        boolean accepted = state.subscribeIfOpen(() -> disposable);
        state.close();

        assertTrue(accepted);
        assertTrue(disposable.isDisposed(), "active provider subscription should be disposed on close");
    }

    @Test
    void shouldDisposeProviderSubscriptionWhenStreamClosesDuringSubscription() {
        AiChatService.StreamSubscriptionState state = new AiChatService.StreamSubscriptionState();
        DummyDisposable disposable = new DummyDisposable();

        boolean accepted = state.subscribeIfOpen(() -> {
            state.close();
            return disposable;
        });

        assertFalse(accepted);
        assertTrue(disposable.isDisposed(), "subscription created during close should be disposed");
    }

    private static final class DummyDisposable implements Disposable {
        private boolean disposed;

        @Override
        public void dispose() {
            disposed = true;
        }

        @Override
        public boolean isDisposed() {
            return disposed;
        }
    }
}
