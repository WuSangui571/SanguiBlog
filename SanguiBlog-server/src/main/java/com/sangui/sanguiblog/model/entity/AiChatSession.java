package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Getter
@Setter
@ToString
@Entity
@Table(name = "ai_chat_sessions")
public class AiChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @ToString.Exclude
    private User user;

    @Column(name = "guest_visitor_id", length = 64)
    private String guestVisitorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "last_message_preview", length = 500)
    private String lastMessagePreview;

    @Column(name = "session_start_ip", length = 64)
    private String sessionStartIp;

    @Column(name = "latest_ip", length = 64)
    private String latestIp;

    @Column(name = "ip_changed", nullable = false)
    private Boolean ipChanged = Boolean.FALSE;

    @Column(name = "ip_changed_at")
    private Instant ipChangedAt;

    @Column(name = "user_visible", nullable = false)
    private Boolean userVisible = Boolean.TRUE;

    @Column(name = "user_hidden_at")
    private Instant userHiddenAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
