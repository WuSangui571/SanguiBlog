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
@Table(name = "banned_ips")
public class BannedIp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 45)
    private String ip;

    @Column(length = 512)
    private String reason;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "hit_count", nullable = false)
    private Long hitCount = 0L;

    @Column(name = "last_hit_time")
    private LocalDateTime lastHitTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @ToString.Exclude
    private User createdBy;

    @Column(name = "created_by", insertable = false, updatable = false)
    private Long createdById;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    @ToString.Exclude
    private User updatedBy;

    @Column(name = "updated_by", insertable = false, updatable = false)
    private Long updatedById;

    @Column(name = "unbanned_at")
    private LocalDateTime unbannedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unbanned_by")
    @ToString.Exclude
    private User unbannedBy;

    @Column(name = "unbanned_by", insertable = false, updatable = false)
    private Long unbannedById;

    @Column(name = "unban_reason", length = 512)
    private String unbanReason;
}
