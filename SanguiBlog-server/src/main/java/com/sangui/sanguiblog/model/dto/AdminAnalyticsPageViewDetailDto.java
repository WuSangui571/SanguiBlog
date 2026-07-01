package com.sangui.sanguiblog.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsPageViewDetailDto {
    private Long id;
    private String title;
    private Long postId;
    private String slug;
    private String time;
    private String referrer;
    private String geo;
    private boolean loggedIn;
    private Long userId;
    private String username;
    @JsonProperty("display_name")
    private String displayName;
    private String userAgent;
    private String avatarUrl;
    private String visitId;
    private String enterTime;
    private String leaveTime;
    private String lastActiveTime;
    private Integer totalDurationSeconds;
    private Integer activeDurationSeconds;
    private Integer durationSeconds;
    private Integer heartbeatCount;
    private String visitStatus;

    private String visitQuality;
    private String riskLevel;
    private List<String> riskReasons;
    private Boolean proxySuspected;
    private Boolean botSuspected;
    private Boolean referrerSpoofingSuspected;
    private String riskExplanation;

    private AdminAnalyticsPageViewDetailFieldsDto detail;
}
