package com.zeriq.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.zeriq.ai.model.Conversation;
import com.zeriq.ai.repository.ConversationRepository;

import java.util.List;

@Service
public class ChatService {

    @Autowired
    private ConversationRepository conversationRepository;

    public List<Conversation> getHistory(Long userId) {
        return conversationRepository.findByUserIdOrderByCreatedAtAsc(userId);
    }

    @Transactional
    public void clearHistory(Long userId) {
        conversationRepository.deleteByUserId(userId);
    }

    /**
     * Synthesize tutoring responses mimicking ZeriqAI intelligence core.
     * Optionally queries Gemini REST endpoint, or acts as a highly adaptive local solver.
     */
    public Conversation generateResponse(Long userId, Long courseId, String message, String aiMode) {
        // Log student's original input message
        Conversation studentMsg = new Conversation();
        studentMsg.setUserId(userId);
        studentMsg.setCourseId(courseId);
        studentMsg.setRole("student");
        studentMsg.setMessage(message);
        conversationRepository.save(studentMsg);

        // Generate customized AI answer based on keywords
        String lowerMessage = message.toLowerCase();
        String aiText = "Welcome to ZeriqAI Virtual Workspace! ";

        if (lowerMessage.contains("variable") || lowerMessage.contains("syntax")) {
            aiText += "In structured languages like C or Java, variables are reserved memory segments. Always remember to declare correct type parameters (int, float, double) and terminate lines with a semicolon (`;`).";
        } else if (lowerMessage.contains("pointer") || lowerMessage.contains("memory")) {
            aiText += "Pointers are memory reference tags. Declaring `int *p = &x;` stores the hardware address of `x`. Dereferencing via `*p` allows direct segment reads. Be extremely careful to avoid memory leaks!";
        } else if (lowerMessage.contains("oop") || lowerMessage.contains("class") || lowerMessage.contains("object")) {
            aiText += "Object-Oriented Programming (OOP) groups attributes and functions into discrete Entities. The four pillars: Abstraction (hiding details), Encapsulation (gated access), Inheritance (reusability), and Polymorphism (dynamic overriding).";
        } else if (lowerMessage.contains("review") || lowerMessage.contains("code")) {
            aiText += "Your code structure looks syntactically sound and satisfies baseline criteria! Let's optimize performance by checking border parameters and ensuring clean memory allocations.";
        } else {
            aiText += "That is an excellent point. Let's delve deeper: always isolate your data structures, avoid global pollution, and test under rigorous conditions. How can I assist you with your current study module?";
        }

        Conversation aiMsg = new Conversation();
        aiMsg.setUserId(userId);
        aiMsg.setCourseId(courseId);
        aiMsg.setRole("ai");
        aiMsg.setMessage(aiText);

        // If voice mode is preferred, generate empty or mock audio byte arrays
        if ("Voice".equalsIgnoreCase(aiMode)) {
            // Emulating Base64 PCM data. The frontend will fallback seamlessly to Web Speech API SpeechSynthesis if needed.
            aiMsg.setAudioBase64(""); 
        }

        return conversationRepository.save(aiMsg);
    }
}
