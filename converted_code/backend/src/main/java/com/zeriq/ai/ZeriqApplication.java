package com.zeriq.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import com.zeriq.ai.model.*;
import com.zeriq.ai.repository.*;

import java.time.LocalDateTime;
import java.util.Arrays;

@SpringBootApplication
public class ZeriqApplication {

    public static void main(String[] args) {
        SpringApplication.run(ZeriqApplication.class, args);
    }

    /**
     * Seed default courses and lesson plans on first system boot
     */
    @Bean
    public CommandLineRunner seedDatabase(
            CourseRepository courseRepo,
            LessonRepository lessonRepo,
            ResourceRepository resourceRepo) {
        return args -> {
            if (courseRepo.count() > 0) return;

            // Seed Course 1: Programming in C
            Course c1 = new Course();
            c1.setTitle("Programming in C");
            c1.setDescription("Learn the fundamentals of structured programming, pointers, and memory management.");
            c1.setDifficulty("Beginner");
            c1.setDuration("10 Hours");
            c1.setProgress(0);
            c1 = courseRepo.save(c1);

            // Seed Course 2: Java
            Course c2 = new Course();
            c2.setTitle("Java");
            c2.setDescription("Master Object-Oriented Programming, Multithreading, Streams, and JVM architecture.");
            c2.setDifficulty("Intermediate");
            c2.setDuration("15 Hours");
            c2.setProgress(0);
            c2 = courseRepo.save(c2);

            // Seed Course 3: Python
            Course c3 = new Course();
            c3.setTitle("Python");
            c3.setDescription("Deep dive into clean Pythonic code, data structures, and automation scripting.");
            c3.setDifficulty("Beginner");
            c3.setDuration("8 Hours");
            c3.setProgress(0);
            c3 = courseRepo.save(c3);

            // Seed Lessons for Course 1 (C)
            Lesson l1 = new Lesson();
            l1.setCourse(c1);
            l1.setTitle("Introduction to C Variables and Syntax");
            l1.setContent("# Variables and Syntax in C\n\nC is a typed, compiled imperative language. To represent data in memory, we declare variables specifying their types.\n\n### Syntax Rules:\n- Statements end with semicolons (`;`)\n- Entrypoint must be the `main()` function\n- Code blocks are enclosed in curly braces `{}`");
            l1.setExampleCode("#include <stdio.h>\n\nint main() {\n    int age = 21;\n    float grade = 95.5;\n    char letter = 'A';\n    printf(\"Age: %d, Grade: %.1f, Class: %c\\n\", age, grade, letter);\n    return 0;\n}");
            l1.setPracticeProblem("Write a simple main function declaring a variable for tracking study hours and print it out.");
            l1.setOrderIndex(1);
            lessonRepo.save(l1);

            Lesson l2 = new Lesson();
            l2.setCourse(c1);
            l2.setTitle("Pointers and Memory Management");
            l2.setContent("# Pointers and Addresses\n\nA pointer is a variable that stores the physical memory address of another variable. Understanding pointers is essential for dynamic memory allocations inside heap segments.");
            l2.setExampleCode("int value = 10;\nint *addressOfValue = &value;\nprintf(\"Memory address: %p, Referenced Value: %d\\n\", addressOfValue, *addressOfValue);");
            l2.setPracticeProblem("Write a short code fragment showing how to declare an integer, pointer, and dereference it.");
            l2.setOrderIndex(2);
            lessonRepo.save(l2);

            // Seed Lessons for Course 2 (Java)
            Lesson l3 = new Lesson();
            l3.setCourse(c2);
            l3.setTitle("Object-Oriented Design and Classes");
            l3.setContent("# Object-Oriented Design in Java\n\nJava is structured entirely around classes and objects. The core design principles are Encapsulation, Inheritance, Polymorphism, and Abstraction.");
            l3.setExampleCode("public class Student {\n    private String name;\n    public Student(String name) { this.name = name; }\n    public String getName() { return name; }\n}");
            l3.setPracticeProblem("Declare a simple Java class named Course containing title and description properties.");
            l3.setOrderIndex(1);
            lessonRepo.save(l3);

            // Seed References / Resources
            Resource r1 = new Resource();
            r1.setCourse(c1);
            r1.setTitle("C Reference Manual (GNU)");
            r1.setUrl("https://www.gnu.org/software/gnu-c-manual/");
            r1.setType("doc");
            resourceRepo.save(r1);

            Resource r2 = new Resource();
            r2.setCourse(c2);
            r2.setTitle("Java Official Documentation (Oracle)");
            r2.setUrl("https://docs.oracle.com/en/java/");
            r2.setType("doc");
            resourceRepo.save(r2);

            System.out.println(">>> ZeriqAI Core Database successfully seeded with baseline courses and modules!");
        };
    }
}
