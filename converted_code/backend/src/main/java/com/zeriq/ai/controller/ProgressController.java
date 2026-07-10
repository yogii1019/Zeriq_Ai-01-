package com.zeriq.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.zeriq.ai.model.Progress;
import com.zeriq.ai.model.QuizResult;
import com.zeriq.ai.repository.ProgressRepository;
import com.zeriq.ai.repository.QuizResultRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = "*")
public class ProgressController {

    @Autowired
    private ProgressRepository progressRepository;

    @Autowired
    private QuizResultRepository quizResultRepository;

    @GetMapping
    public ResponseEntity<?> getProgress(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        
        List<Progress> progressList = progressRepository.findByUserId(userId);
        return ResponseEntity.ok(progressList);
    }

    @PostMapping("/time")
    public ResponseEntity<?> trackTime(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        try {
            Long courseId = Long.valueOf(payload.get("courseId").toString());
            Long lessonId = Long.valueOf(payload.get("lessonId").toString());
            long seconds = Long.parseLong(payload.get("seconds").toString());

            Progress progress = progressRepository.findByUserIdAndLessonId(userId, lessonId)
                    .orElseGet(() -> {
                        Progress p = new Progress();
                        p.setUserId(userId);
                        p.setCourseId(courseId);
                        p.setLessonId(lessonId);
                        p.setCompleted(false);
                        p.setStudyTimeSeconds(0L);
                        return p;
                    });

            progress.setStudyTimeSeconds(progress.getStudyTimeSeconds() + seconds);
            progress.setLastStudiedAt(LocalDateTime.now());
            
            Progress saved = progressRepository.save(progress);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "courseId, lessonId and seconds are required."));
        }
    }

    @PostMapping("/lesson/complete")
    public ResponseEntity<?> completeLesson(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        try {
            Long courseId = Long.valueOf(payload.get("courseId").toString());
            Long lessonId = Long.valueOf(payload.get("lessonId").toString());

            Progress progress = progressRepository.findByUserIdAndLessonId(userId, lessonId)
                    .orElseGet(() -> {
                        Progress p = new Progress();
                        p.setUserId(userId);
                        p.setCourseId(courseId);
                        p.setLessonId(lessonId);
                        p.setStudyTimeSeconds(0L);
                        return p;
                    });

            progress.setCompleted(true);
            progress.setLastStudiedAt(LocalDateTime.now());

            Progress saved = progressRepository.save(progress);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "courseId and lessonId are required."));
        }
    }

    @GetMapping("/quizzes")
    public ResponseEntity<?> getQuizzes(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        
        List<QuizResult> results = quizResultRepository.findByUserId(userId);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/quiz/submit")
    public ResponseEntity<?> submitQuiz(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        try {
            Long quizId = Long.valueOf(payload.get("quizId").toString());
            String answer = payload.get("answer").toString();

            // Simple validation mimicking correct logic
            boolean isCorrect = answer != null && !answer.trim().isEmpty();

            QuizResult result = new QuizResult();
            result.setUserId(userId);
            result.setQuizId(quizId);
            result.setUserAnswer(answer);
            result.setCorrect(isCorrect);
            result.setScore(isCorrect ? 100 : 0);
            result.setExplanationByAi(isCorrect ? 
                    "Excellent deduction! You have demonstrated key grasp of current learning targets." : 
                    "Not quite! Check out your variable scopes and pointer referencing rules.");
            result.setCreatedAt(LocalDateTime.now());

            QuizResult saved = quizResultRepository.save(result);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "quizId and answer are required."));
        }
    }
}
