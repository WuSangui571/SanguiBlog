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
@Table(name = "ai_chat_messages")
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @ToString.Exclude
    private AiChatSession session;

    @Column(nullable = false, length = 16)
    private String role;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "model_name", length = 64)
    private String modelName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
