package com.zeriq.ai.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "conversations")
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    private Long courseId;

    @Column(nullable = false)
    private String role; // "student" | "ai"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(columnDefinition = "LONGTEXT")
    private String audioBase64; // Base64 PCM/MP3 audio for speech mode

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
