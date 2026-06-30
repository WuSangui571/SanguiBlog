package com.sangui.sanguiblog.service;

import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PostServiceTransactionTest {

    @Test
    void deleteShouldRunInTransactionForAfterCommitRagRemoveEvent() throws Exception {
        assertTrue(
                AnnotatedElementUtils.hasAnnotation(
                        PostService.class.getMethod("delete", Long.class),
                        Transactional.class),
                "PostService.delete must be transactional so AFTER_COMMIT RAG remove events are delivered");
    }
}
