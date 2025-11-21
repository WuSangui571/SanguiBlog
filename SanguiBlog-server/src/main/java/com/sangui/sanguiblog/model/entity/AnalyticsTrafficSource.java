package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Getter
@Setter
@ToString
@Entity
@Table(name = "analytics_traffic_sources")
public class AnalyticsTrafficSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "source_label", nullable = false, length = 64)
    private String sourceLabel;

    @Column(nullable = false)
    private Integer visits;

    @Column
    private BigDecimal percentage;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
