package com.zeriq.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.zeriq.ai.model.User;
import com.zeriq.ai.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String email = payload.get("email");
        
        if (username == null || email == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Username and email are required."));
        }
        
        User user = userService.loginOrCreate(username, email);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        
        return userService.getUserById(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found.")));
    }

    @PostMapping("/preferences")
    public ResponseEntity<?> updatePreferences(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        try {
            Long courseId = Long.valueOf(payload.get("courseId").toString());
            String difficulty = payload.get("difficulty").toString();
            String preferredAiMode = payload.get("preferredAiMode").toString();
            
            User updatedUser = userService.updateCoursePreferences(userId, courseId, difficulty, preferredAiMode);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "courseId, difficulty, and preferredAiMode are required."));
        }
    }
}
