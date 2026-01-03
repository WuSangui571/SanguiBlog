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
}
