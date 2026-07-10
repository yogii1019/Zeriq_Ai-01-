package com.zeriq.ai.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.zeriq.ai.model.Conversation;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUserIdOrderByCreatedAtAsc(Long userId);
    void deleteByUserId(Long userId);
}
