package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Entity
@Table(name = "analytics_page_views")
public class AnalyticsPageView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id", length = 64, unique = true)
    private String visitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @ToString.Exclude
    private Post post;

    @Column(name = "post_id", insertable = false, updatable = false)
    private Long postId;

    @Column(name = "page_title", length = 255)
    private String pageTitle;

    @Column(name = "viewer_ip", nullable = false, length = 45)
    private String viewerIp;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @ToString.Exclude
    private User user;

    @Column(name = "referrer_url", length = 512)
    private String referrerUrl;

    @Column(name = "geo_location", length = 128)
    private String geoLocation;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "enter_time")
    private LocalDateTime enterTime;

    @Column(name = "leave_time")
    private LocalDateTime leaveTime;

    @Column(name = "last_active_time")
    private LocalDateTime lastActiveTime;

    @Column(name = "total_duration_seconds")
    private Integer totalDurationSeconds;

    @Column(name = "active_duration_seconds")
    private Integer activeDurationSeconds;

    @Column(name = "heartbeat_count", nullable = false)
    private Integer heartbeatCount = 0;

    @Column(name = "visit_status", length = 32)
    private String visitStatus;

    @Column(name = "detail_json", columnDefinition = "LONGTEXT")
    private String detailJson;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
