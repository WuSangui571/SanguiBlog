package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsPageViewDetailFieldsDto;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AnalyticsVisitQualityClassifierTest {

    @Test
    void webdriverTrueIsBotLikeHighRisk() {
        AnalyticsPageView view = visitRow("Mozilla/5.0 Chrome", 3, 30);
        AdminAnalyticsPageViewDetailFieldsDto detail = AdminAnalyticsPageViewDetailFieldsDto.builder()
                .webdriver(true)
                .build();

        AnalyticsVisitQualityClassifier.ClassificationResult result =
                AnalyticsVisitQualityClassifier.classify(view, detail);

        assertEquals(AnalyticsVisitQualityClassifier.VisitQuality.BOT_LIKE, result.visitQuality());
        assertEquals(AnalyticsVisitQualityClassifier.RiskLevel.HIGH, result.riskLevel());
        assertTrue(result.botSuspected());
        assertTrue(result.riskReasons().contains(AnalyticsVisitQualityClassifier.RiskReason.WEBDRIVER_TRUE));
    }

    @Test
    void visitTrackedRowWithoutHeartbeatIsLowActivity() {
        AnalyticsPageView view = visitRow("Mozilla/5.0 Chrome", 0, null);

        AnalyticsVisitQualityClassifier.ClassificationResult result =
                AnalyticsVisitQualityClassifier.classify(view, AdminAnalyticsPageViewDetailFieldsDto.builder().build());

        assertEquals(AnalyticsVisitQualityClassifier.VisitQuality.LOW_ACTIVITY, result.visitQuality());
        assertEquals(AnalyticsVisitQualityClassifier.RiskLevel.LOW, result.riskLevel());
        assertEquals(List.of(AnalyticsVisitQualityClassifier.RiskReason.NO_HEARTBEAT), result.riskReasons());
    }

    @Test
    void legacyRowWithoutDetailOrVisitSignalsIsUnknown() {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setUserAgent("Mozilla/5.0 Chrome");
        view.setHeartbeatCount(0);

        AnalyticsVisitQualityClassifier.ClassificationResult result =
                AnalyticsVisitQualityClassifier.classify(view, AdminAnalyticsPageViewDetailFieldsDto.builder().build());

        assertEquals(AnalyticsVisitQualityClassifier.VisitQuality.UNKNOWN, result.visitQuality());
        assertEquals(AnalyticsVisitQualityClassifier.RiskLevel.UNKNOWN, result.riskLevel());
        assertTrue(result.riskReasons().isEmpty());
    }

    @Test
    void normalArticleVisitHasNormalQuality() {
        AnalyticsPageView view = visitRow("Mozilla/5.0 Chrome", 2, 30);

        AnalyticsVisitQualityClassifier.ClassificationResult result =
                AnalyticsVisitQualityClassifier.classify(view, AdminAnalyticsPageViewDetailFieldsDto.builder().build());

        assertEquals(AnalyticsVisitQualityClassifier.VisitQuality.NORMAL, result.visitQuality());
        assertEquals(AnalyticsVisitQualityClassifier.RiskLevel.LOW, result.riskLevel());
        assertTrue(result.riskReasons().isEmpty());
    }

    @Test
    void missingAsnAndIspDoNotInventDatacenterRisk() {
        AnalyticsPageView view = visitRow("Mozilla/5.0 Chrome", 2, 30);
        AdminAnalyticsPageViewDetailFieldsDto detail = AdminAnalyticsPageViewDetailFieldsDto.builder()
                .ipType("public")
                .build();

        AnalyticsVisitQualityClassifier.ClassificationResult result =
                AnalyticsVisitQualityClassifier.classify(view, detail);

        assertFalse(result.riskReasons().contains(AnalyticsVisitQualityClassifier.RiskReason.DATACENTER_IP));
        assertFalse(result.proxySuspected());
    }

    private static AnalyticsPageView visitRow(String userAgent, Integer heartbeatCount, Integer durationSeconds) {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setVisitId("visit-1");
        view.setUserAgent(userAgent);
        view.setViewerIp("203.0.113.10");
        view.setHeartbeatCount(heartbeatCount);
        view.setTotalDurationSeconds(durationSeconds);
        view.setPageTitle("/article/1");
        return view;
    }
}
