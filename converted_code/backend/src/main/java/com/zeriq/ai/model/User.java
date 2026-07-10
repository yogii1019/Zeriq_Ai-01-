package com.zeriq.ai.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String email;

    private Long coursePreferenceId;

    private String difficulty; // "Beginner" | "Intermediate" | "Advanced"

    private String preferredAiMode; // "Text" | "Voice"

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
