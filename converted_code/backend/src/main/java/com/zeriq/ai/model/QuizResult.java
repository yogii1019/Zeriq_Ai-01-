package com.zeriq.ai.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "quiz_results")
public class QuizResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long quizId;

    @Column(nullable = false)
    private String userAnswer;

    private boolean isCorrect;

    private int score;

    @Column(columnDefinition = "TEXT")
    private String explanationByAi;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
