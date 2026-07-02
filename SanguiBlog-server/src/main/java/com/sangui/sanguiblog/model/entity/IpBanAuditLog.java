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
@Table(name = "ip_ban_audit_logs")
public class IpBanAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "banned_ip_id")
    private Long bannedIpId;

    @Column(nullable = false, length = 32)
    private String action;

    @Column(nullable = false, length = 45)
    private String ip;

    @Column(length = 512)
    private String reason;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_username", length = 128)
    private String actorUsername;

    @Column(name = "source_page_view_id")
    private Long sourcePageViewId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
