package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.config.AiBlogRagProperties;
import com.sangui.sanguiblog.model.entity.AiBlogKnowledgeDocument;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeChunkRepository;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiBlogKnowledgeSyncDispatcherTest {

    private static final Logger log = LoggerFactory.getLogger(AiBlogKnowledgeSyncDispatcherTest.class);

    @Mock
    private AiBlogKnowledgeSyncService aiBlogKnowledgeSyncService;

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

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @Test
    void shouldDispatchSyncOffRequestThreadWhenRagEnabled() throws Exception {
        ThreadPoolExecutor boundedExecutor = new ThreadPoolExecutor(
                1, 1, 60, TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                new ThreadPoolExecutor.DiscardPolicy()
        );

        Executor executor = boundedExecutor;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        AiBlogKnowledgeSyncEvent event = new AiBlogKnowledgeSyncEvent(1L);

        listener.onPostKnowledgeSyncRequest(event);

        verify(aiBlogKnowledgeSyncService, timeout(3000)).syncPostKnowledge(1L);
        boundedExecutor.shutdown();
    }

    @Test
    void shouldNotBlockPublishWhenRagDispatchIsRejected() {
        ThreadPoolExecutor boundedExecutor = new ThreadPoolExecutor(
                1, 1, 60, TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                new ThreadPoolExecutor.DiscardPolicy()
        );

        boundedExecutor.execute(() -> {
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        Executor executor = boundedExecutor;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        AiBlogKnowledgeSyncEvent event = new AiBlogKnowledgeSyncEvent(1L);

        listener.onPostKnowledgeSyncRequest(event);

        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        verifyNoMoreInteractions(aiBlogKnowledgeSyncService);
        boundedExecutor.shutdownNow();
    }

    @Test
    void shouldCatchWorkerExceptionWithoutThrowingToCaller() {
        Executor executor = Runnable::run;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        doThrow(new RuntimeException("provider DNS failure"))
                .when(aiBlogKnowledgeSyncService).syncPostKnowledge(anyLong());

        AiBlogKnowledgeSyncEvent event = new AiBlogKnowledgeSyncEvent(1L);

        listener.onPostKnowledgeSyncRequest(event);

        verify(aiBlogKnowledgeSyncService).syncPostKnowledge(1L);
    }

    @Test
    void shouldCatchRejectedSyncDispatchWithoutThrowingToCaller() {
        Executor executor = task -> {
            throw new RejectedExecutionException("queue full");
        };
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        AiBlogKnowledgeSyncEvent event = new AiBlogKnowledgeSyncEvent(1L);

        assertDoesNotThrow(() -> listener.onPostKnowledgeSyncRequest(event));
        verify(aiBlogKnowledgeSyncService, never()).syncPostKnowledge(anyLong());
    }

    @Test
    void shouldSkipNullPostIdEvent() {
        Executor executor = Runnable::run;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        AiBlogKnowledgeSyncEvent event = new AiBlogKnowledgeSyncEvent(null);

        listener.onPostKnowledgeSyncRequest(event);

        verify(aiBlogKnowledgeSyncService, never()).syncPostKnowledge(anyLong());
    }

    @Test
    void shouldDispatchRemoveOffRequestThread() {
        Executor executor = Runnable::run;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        AiBlogKnowledgeSyncRemoveEvent event = new AiBlogKnowledgeSyncRemoveEvent(1L);

        listener.onPostKnowledgeRemoveRequest(event);

        verify(aiBlogKnowledgeSyncService).removePostKnowledge(1L);
    }

    @Test
    void shouldCatchWorkerExceptionOnRemoveWithoutThrowing() {
        Executor executor = Runnable::run;
        AiBlogKnowledgeSyncEventListener listener = new AiBlogKnowledgeSyncEventListener(
                aiBlogKnowledgeSyncService, executor);

        doThrow(new RuntimeException("vector delete failure"))
                .when(aiBlogKnowledgeSyncService).removePostKnowledge(anyLong());

        AiBlogKnowledgeSyncRemoveEvent event = new AiBlogKnowledgeSyncRemoveEvent(1L);

        listener.onPostKnowledgeRemoveRequest(event);

        verify(aiBlogKnowledgeSyncService).removePostKnowledge(1L);
    }
}
