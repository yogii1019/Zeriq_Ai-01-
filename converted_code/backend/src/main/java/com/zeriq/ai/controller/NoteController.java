package com.zeriq.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.zeriq.ai.model.Note;
import com.zeriq.ai.repository.NoteRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    @Autowired
    private NoteRepository noteRepository;

    @GetMapping
    public ResponseEntity<?> getNotes(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        
        List<Note> notes = noteRepository.findByUserId(userId);
        return ResponseEntity.ok(notes);
    }

    @PostMapping
    public ResponseEntity<?> createNote(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        
        if (title == null || content == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Title and content are required"));
        }

        Long courseId = payload.get("courseId") != null ? Long.valueOf(payload.get("courseId").toString()) : null;
        Long lessonId = payload.get("lessonId") != null ? Long.valueOf(payload.get("lessonId").toString()) : null;

        Note note = new Note();
        note.setUserId(userId);
        note.setTitle(title);
        note.setContent(content);
        note.setCourseId(courseId);
        note.setLessonId(lessonId);
        note.setCreatedAt(LocalDateTime.now());

        Note savedNote = noteRepository.save(note);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedNote);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateNote(
            @PathVariable Long id,
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, String> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        String title = payload.get("title");
        String content = payload.get("content");

        if (title == null || content == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Title and content are required"));
        }

        return noteRepository.findById(id)
                .map(existing -> {
                    existing.setTitle(title);
                    existing.setContent(content);
                    Note updated = noteRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Note not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNote(
            @PathVariable Long id,
            @RequestHeader(value = "x-user-id", required = false) Long userId) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        return noteRepository.findById(id)
                .map(note -> {
                    noteRepository.delete(note);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Note deleted successfully"));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Note not found")));
    }

    @PostMapping("/{id}/summarize")
    public ResponseEntity<?> summarizeNote(
            @PathVariable Long id,
            @RequestHeader(value = "x-user-id", required = false) Long userId) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        return noteRepository.findById(id)
                .map(note -> {
                    // Simulating AI summarizing action
                    String text = note.getContent();
                    String summary = "This module reviews key formulas and structural details of " + note.getTitle() + 
                            ". It centers on ensuring type definitions are correctly structured and outlines the exact memory models.";
                    note.setSummary(summary);
                    Note saved = noteRepository.save(note);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Note not found")));
    }
}
