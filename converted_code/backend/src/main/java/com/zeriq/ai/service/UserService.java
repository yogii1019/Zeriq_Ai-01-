package com.zeriq.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.zeriq.ai.model.User;
import com.zeriq.ai.repository.UserRepository;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User loginOrCreate(String username, String email) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setUsername(username);
                    newUser.setEmail(email);
                    newUser.setDifficulty("Beginner");
                    newUser.setPreferredAiMode("Text");
                    return userRepository.save(newUser);
                });
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public User updateCoursePreferences(Long userId, Long courseId, String difficulty, String preferredAiMode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        user.setCoursePreferenceId(courseId);
        user.setDifficulty(difficulty);
        user.setPreferredAiMode(preferredAiMode);
        return userRepository.save(user);
    }
}
