package com.zeriq.ai.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.zeriq.ai.model.Course;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
}
