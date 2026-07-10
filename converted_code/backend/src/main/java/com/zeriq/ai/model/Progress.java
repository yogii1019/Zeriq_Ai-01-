package com.zeriq.ai.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "progress")
public class Progress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private Long lessonId;

    private boolean completed = false;

    private Integer score;

    private long studyTimeSeconds = 0;

    @Column(nullable = false)
    private LocalDateTime lastStudiedAt = LocalDateTime.now();
}
