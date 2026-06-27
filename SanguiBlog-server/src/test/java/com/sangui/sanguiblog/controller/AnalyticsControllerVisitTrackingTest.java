package com.sangui.sanguiblog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.ArticleVisitEndRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitHeartbeatRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitStartRequest;
import com.sangui.sanguiblog.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class AnalyticsControllerVisitTrackingTest {

    private AnalyticsService analyticsService;
    private AnalyticsController controller;

    @BeforeEach
    void setUp() {
        analyticsService = mock(AnalyticsService.class);
        controller = new AnalyticsController(analyticsService, new ObjectMapper());
    }

    @Test
    void visitStartParsesJsonBodyAndPassesRequestContext() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("1.2.3.4");
        request.addHeader("User-Agent", "JUnit UA");

        ApiResponse<Void> response = controller.visitStart("""
                {"visitId":"v1","articleId":123,"path":"/article/123","title":"Hello","referrer":"https://example.com"}
                """, request, null);

        assertTrue(response.isSuccess());
        ArgumentCaptor<ArticleVisitStartRequest> captor = ArgumentCaptor.forClass(ArticleVisitStartRequest.class);
        verify(analyticsService).recordArticleVisitStart(captor.capture(), eq("1.2.3.4"), eq("JUnit UA"), eq(null));
        ArticleVisitStartRequest parsed = captor.getValue();
        assertEquals("v1", parsed.getVisitId());
        assertEquals(123L, parsed.getArticleId());
        assertEquals("/article/123", parsed.getPath());
        assertEquals("Hello", parsed.getTitle());
        assertEquals("https://example.com", parsed.getReferrer());
    }

    @Test
    void visitEndAcceptsTextPlainJsonBodyUsedBySendBeacon() {
        ApiResponse<Void> response = controller.visitEnd("""
                {"visitId":"v1","totalDurationSeconds":75,"activeDurationSeconds":63}
                """);

        assertTrue(response.isSuccess());
        ArgumentCaptor<ArticleVisitEndRequest> captor = ArgumentCaptor.forClass(ArticleVisitEndRequest.class);
        verify(analyticsService).recordArticleVisitEnd(captor.capture());
        ArticleVisitEndRequest parsed = captor.getValue();
        assertEquals("v1", parsed.getVisitId());
        assertEquals(75, parsed.getTotalDurationSeconds());
        assertEquals(63, parsed.getActiveDurationSeconds());
    }

    @Test
    void malformedVisitBodyIsNoOpOk() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        ApiResponse<Void> response = controller.visitStart("{not-json", request, null);

        assertTrue(response.isSuccess());
        verifyNoInteractions(analyticsService);
    }

    @Test
    void heartbeatServiceExceptionIsSwallowedForTrackingEndpoint() {
        doThrow(new RuntimeException("boom")).when(analyticsService).recordArticleVisitHeartbeat(any());

        ApiResponse<Void> response = controller.visitHeartbeat("""
                {"visitId":"v1","activeDurationSeconds":30}
                """);

        assertTrue(response.isSuccess());
        verify(analyticsService).recordArticleVisitHeartbeat(any(ArticleVisitHeartbeatRequest.class));
    }

    @Test
    void missingHeartbeatBodyIsNoOpOk() {
        ApiResponse<Void> response = controller.visitHeartbeat(" ");

        assertTrue(response.isSuccess());
        verify(analyticsService, never()).recordArticleVisitHeartbeat(any());
    }
}
