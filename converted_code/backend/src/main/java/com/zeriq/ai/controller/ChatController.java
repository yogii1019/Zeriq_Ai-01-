package com.zeriq.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.zeriq.ai.model.Conversation;
import com.zeriq.ai.service.ChatService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @GetMapping
    public ResponseEntity<?> getChatHistory(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        List<Conversation> history = chatService.getHistory(userId);
        return ResponseEntity.ok(history);
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(
            @RequestHeader(value = "x-user-id", required = false) Long userId,
            @RequestBody Map<String, Object> payload) {
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }

        try {
            String message = payload.get("message").toString();
            Long courseId = payload.get("courseId") != null ? Long.valueOf(payload.get("courseId").toString()) : null;
            String aiMode = payload.get("aiMode") != null ? payload.get("aiMode").toString() : "Text";

            Conversation aiResponse = chatService.generateResponse(userId, courseId, message, aiMode);
            
            // Returns both the text response and optional audio Base64 payload
            return ResponseEntity.ok(Map.of(
                    "response", aiResponse,
                    "audioBase64", aiResponse.getAudioBase64() != null ? aiResponse.getAudioBase64() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid body parameters: " + e.getMessage()));
        }
    }

    @PostMapping("/tts")
    public ResponseEntity<?> generateTTS(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Text is required for TTS synthesis."));
        }

        // Returns empty or mock audio string. Frontend fallbacks to Web Speech synthesizers seamlessly.
        return ResponseEntity.ok(Map.of("audioBase64", ""));
    }

    @PostMapping("/clear")
    public ResponseEntity<?> clearChat(@RequestHeader(value = "x-user-id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Missing User ID header."));
        }
        
        chatService.clearHistory(userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Chat history cleared"));
    }
}
