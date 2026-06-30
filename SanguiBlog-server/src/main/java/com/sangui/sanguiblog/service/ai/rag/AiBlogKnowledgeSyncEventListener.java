package com.sangui.sanguiblog.service.ai.rag;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.concurrent.Executor;

@Component
@RequiredArgsConstructor
public class AiBlogKnowledgeSyncEventListener {

    private static final Logger log = LoggerFactory.getLogger(AiBlogKnowledgeSyncEventListener.class);

    private final AiBlogKnowledgeSyncService aiBlogKnowledgeSyncService;

    @Qualifier("aiRagSyncExecutor")
    private final Executor aiRagSyncExecutor;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPostKnowledgeSyncRequest(AiBlogKnowledgeSyncEvent event) {
        if (event.getPostId() == null) {
            return;
        }
        executeAsync("sync", event.getPostId(), () ->
                aiBlogKnowledgeSyncService.syncPostKnowledge(event.getPostId()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPostKnowledgeRemoveRequest(AiBlogKnowledgeSyncRemoveEvent event) {
        if (event.getPostId() == null) {
            return;
        }
        executeAsync("remove", event.getPostId(), () ->
                aiBlogKnowledgeSyncService.removePostKnowledge(event.getPostId()));
    }

    private void executeAsync(String operation, Long postId, Runnable action) {
        try {
            aiRagSyncExecutor.execute(() -> {
                try {
                    action.run();
                } catch (Exception ex) {
                    log.warn("RAG {} failed off-request, postId={}, exceptionClass={}",
                            operation, postId, ex.getClass().getName());
                }
            });
        } catch (RuntimeException ex) {
            log.warn("RAG {} task rejected, postId={}, exceptionClass={}, message={}",
                    operation, postId, ex.getClass().getName(), safeMessage(ex.getMessage()));
        }
    }

    private String safeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }
        String trimmed = message.trim();
        return trimmed.length() <= 200 ? trimmed : trimmed.substring(0, 200);
    }
}
