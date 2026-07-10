package com.zeriq.ai.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String difficulty; // "Beginner" | "Intermediate" | "Advanced"

    private String duration; // e.g. "12 Hours"

    private int progress = 0;
}
