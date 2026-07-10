package com.zeriq.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.zeriq.ai.model.Course;
import com.zeriq.ai.model.Lesson;
import com.zeriq.ai.model.Resource;
import com.zeriq.ai.repository.CourseRepository;
import com.zeriq.ai.repository.LessonRepository;
import com.zeriq.ai.repository.ResourceRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
@CrossOrigin(origins = "*")
public class CourseController {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @GetMapping
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Course not found.")));
    }

    @GetMapping("/{courseId}/lessons")
    public List<Lesson> getLessonsByCourse(@PathVariable Long courseId) {
        return lessonRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
    }

    @GetMapping("/lessons/{lessonId}")
    public ResponseEntity<?> getLessonById(@PathVariable Long lessonId) {
        return lessonRepository.findById(lessonId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Lesson not found.")));
    }

    @GetMapping("/{courseId}/resources")
    public List<Resource> getResourcesByCourse(@PathVariable Long courseId) {
        return resourceRepository.findByCourseId(courseId);
    }
}
