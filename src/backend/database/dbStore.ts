import fs from "fs";
import path from "path";

// Entity definitions matching Spring Boot MySQL schema
export interface User {
  id: number;
  username: string;
  email: string;
  coursePreferenceId?: number; // active course
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  preferredAiMode?: "Text" | "Voice";
  preferredVoice?: string; // Gemini TTS prebuilt voice name, e.g. "Sulafat"
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string; // e.g. "12 Hours", "20 Hours"
  progress: number; // default progress
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  content: string; // Markdown notes, lessons, code snippets, etc.
  exampleCode?: string;
  practiceProblem?: string;
  orderIndex: number;
}

export interface Note {
  id: number;
  userId: number;
  lessonId?: number;
  courseId?: number;
  title: string;
  content: string;
  summary?: string;
  createdAt: string;
}

export interface Quiz {
  id: number;
  lessonId: number;
  question: string;
  type: "MCQ" | "SHORT" | "CODING";
  options?: string[]; // for MCQ, JSON array
  correctAnswer: string;
  explanation: string;
}

export interface QuizResult {
  id: number;
  userId: number;
  quizId: number;
  userAnswer: string;
  isCorrect: boolean;
  score: number;
  explanationByAi?: string;
  createdAt: string;
}

export interface Progress {
  id: number;
  userId: number;
  courseId: number;
  lessonId: number;
  completed: boolean;
  score?: number;
  studyTimeSeconds: number; // in seconds
  lastStudiedAt: string;
}

export interface Conversation {
  id: number;
  userId: number;
  courseId?: number;
  role: "student" | "ai";
  message: string;
  audioBase64?: string; // For voice mode
  createdAt: string;
}

export interface Resource {
  id: number;
  courseId: number;
  title: string;
  url: string;
  type: "video" | "article" | "doc";
}

// Global In-memory / File-backed Database Store representing MySQL
class DbStore {
  private filePath = path.join(process.cwd(), "zeriq_db.json");
  public data: {
    users: User[];
    courses: Course[];
    lessons: Lesson[];
    notes: Note[];
    quizzes: Quiz[];
    quizResults: QuizResult[];
    progress: Progress[];
    conversations: Conversation[];
    resources: Resource[];
  } = {
    users: [],
    courses: [],
    lessons: [],
    notes: [],
    quizzes: [],
    quizResults: [],
    progress: [],
    conversations: [],
    resources: [],
  };

  constructor() {
    this.load();
    if (this.data.courses.length === 0) {
      this.seed();
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          courses: parsed.courses || [],
          lessons: parsed.lessons || [],
          notes: parsed.notes || [],
          quizzes: parsed.quizzes || [],
          quizResults: parsed.quizResults || [],
          progress: parsed.progress || [],
          conversations: parsed.conversations || [],
          resources: parsed.resources || [],
        };
      }
    } catch (e) {
      console.error("Error loading db file:", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving db file:", e);
    }
  }

  private seed() {
    console.log("Seeding computer science database...");
    
    // Seed Courses
    const coursesToSeed: Omit<Course, "progress">[] = [
      { id: 1, title: "Programming in C", description: "Learn the fundamentals of structured programming, pointers, and memory management.", difficulty: "Beginner", duration: "10 Hours" },
      { id: 2, title: "Java", description: "Master Object-Oriented Programming, Multithreading, Streams, and JVM architecture.", difficulty: "Intermediate", duration: "15 Hours" },
      { id: 3, title: "Python", description: "Deep dive into clean Pythonic code, data structures, and automation scripting.", difficulty: "Beginner", duration: "8 Hours" },
      { id: 4, title: "HTML", description: "Build structured and accessible web document foundations using semantic markup.", difficulty: "Beginner", duration: "4 Hours" },
      { id: 5, title: "CSS", description: "Understand modern layouts with Flexbox, Grid, animations, and custom styling systems.", difficulty: "Beginner", duration: "6 Hours" },
      { id: 6, title: "JavaScript", description: "Explore closures, promises, async/await, DOM operations, and ES6+ standards.", difficulty: "Beginner", duration: "12 Hours" },
      { id: 7, title: "Data Structures", description: "Learn arrays, linked lists, stacks, queues, hash tables, and tree structures.", difficulty: "Intermediate", duration: "14 Hours" },
      { id: 8, title: "Algorithms", description: "Analyze complexity, sorting, searching, recursion, and dynamic programming.", difficulty: "Advanced", duration: "18 Hours" },
      { id: 9, title: "Operating Systems", description: "Master processes, threads, virtual memory, scheduling, and file systems.", difficulty: "Advanced", duration: "16 Hours" },
      { id: 10, title: "DBMS", description: "Study relational databases, normalization, indexing, transaction ACID properties, and relational algebra.", difficulty: "Intermediate", duration: "12 Hours" },
      { id: 11, title: "Computer Networks", description: "Understand TCP/IP layers, routing protocols, sockets, and network security foundations.", difficulty: "Intermediate", duration: "12 Hours" },
      { id: 12, title: "Software Engineering", description: "Learn software lifecycles (SDLC), design pattern frameworks, UML diagrams, and testing methodologies.", difficulty: "Intermediate", duration: "10 Hours" },
      { id: 13, title: "Spring Boot", description: "Build enterprise Java microservices, REST APIs, Security configurations, and Spring Data JPA integration.", difficulty: "Advanced", duration: "20 Hours" },
      { id: 14, title: "SQL", description: "Write structured queries, join tables, use aggregates, subqueries, and database procedures.", difficulty: "Beginner", duration: "8 Hours" },
      { id: 15, title: "Git & GitHub", description: "Master version control, staging, branching strategies, merging, rebasing, and collaborative pull requests.", difficulty: "Beginner", duration: "5 Hours" },
      { id: 16, title: "Linux", description: "Navigate the shell command line, manage file permissions, write bash scripts, and handle system configurations.", difficulty: "Beginner", duration: "8 Hours" },
      { id: 17, title: "Artificial Intelligence", description: "Examine search algorithms, heuristics, expert systems, and knowledge representations.", difficulty: "Intermediate", duration: "14 Hours" },
      { id: 18, title: "Machine Learning Basics", description: "Build regressions, decision trees, SVMs, neural network concepts, and model evaluation techniques.", difficulty: "Advanced", duration: "18 Hours" },
      { id: 19, title: "Cloud Computing", description: "Learn virtual machines, containers (Docker), load balancing, microservices, and serverless architectures.", difficulty: "Intermediate", duration: "12 Hours" },
      { id: 20, title: "Cyber Security", description: "Understand cryptographic algorithms, pen-testing concepts, firewalls, and secure coding practices.", difficulty: "Advanced", duration: "14 Hours" }
    ];

    this.data.courses = coursesToSeed.map(c => ({ ...c, progress: 0 }));

    // Seed Lessons & Quizzes for a few key courses, and auto-generate simple template ones for the rest
    this.data.courses.forEach(course => {
      // Create 3 lessons per course
      for (let i = 1; i <= 3; i++) {
        const lessonId = (course.id * 10) + i;
        let content = "";
        let exampleCode = "";
        let practiceProblem = "";

        if (course.title === "Java") {
          if (i === 1) {
            content = "### Java Introduction & Environment Setup\nJava is a class-based, object-oriented programming language designed to have as few implementation dependencies as possible. The main design philosophy of Java is **'Write Once, Run Anywhere' (WORA)**, meaning that compiled Java code can run on all platforms that support Java without the need for recompilation. This is accomplished using the **Java Virtual Machine (JVM)**.";
            exampleCode = "public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, ZeriqAI Tutor!\");\n    }\n}";
            practiceProblem = "Write a Java program that accepts a username as input and prints 'Welcome, [Username] to ZeriqAI!'";
          } else if (i === 2) {
            content = "### Object-Oriented Programming (OOP) Concepts\nOOP is a programming paradigm based on the concept of 'objects', which can contain data and code. Java enforces object-oriented design. The 4 main pillars of OOP in Java are:\n1. **Inheritance**: Subclasses inherit properties from superclasses.\n2. **Polymorphism**: Ability of an object to take many forms (method overloading and overriding).\n3. **Encapsulation**: Hiding fields inside classes and exposing them via public methods.\n4. **Abstraction**: Hiding implementation details using interfaces or abstract classes.";
            exampleCode = "class Animal {\n    void makeSound() {\n        System.out.println(\"Some sound\");\n    }\n}\n\nclass Dog extends Animal {\n    @Override\n    void makeSound() {\n        System.out.println(\"Bark! Bark!\");\n    }\n}";
            practiceProblem = "Create a 'Car' class that extends a parent 'Vehicle' class, encapsulating 'speed' and overriding 'accelerate()'.";
          } else {
            content = "### Java Collections Framework (JCF)\nThe Collections Framework provides architecture to store and manipulate a group of objects. It includes Interfaces (Set, List, Queue, Map) and Classes (ArrayList, Vector, LinkedList, PriorityQueue, HashSet, LinkedHashSet, TreeSet, HashMap). Maps are not subinterfaces of Collection but are closely related.";
            exampleCode = "import java.util.ArrayList;\nimport java.util.List;\n\npublic class CollectionDemo {\n    public static void main(String[] args) {\n        List<String> csList = new ArrayList<>();\n        csList.add(\"Java\");\n        csList.add(\"Data Structures\");\n        System.out.println(csList);\n    }\n}";
            practiceProblem = "Write a Java method to count the occurrences of each word in a string using a HashMap.";
          }
        } else if (course.title === "Programming in C") {
          if (i === 1) {
            content = "### Introduction to C and Variables\nC is a procedural programming language originally developed by Dennis Ritchie at Bell Labs. It features static typing, structured programming, and direct low-level memory access via pointers.";
            exampleCode = "#include <stdio.h>\n\nint main() {\n    int score = 100;\n    printf(\"Score: %d\\n\", score);\n    return 0;\n}";
            practiceProblem = "Write a C function that swaps two integers using pointers.";
          } else {
            content = `### Lesson ${i} in ${course.title}\nThis is a lesson covering essential practices in ${course.title}. Explore pointers, arrays, and standard structures.`;
            exampleCode = `// Example in C\n#include <stdio.h>\nint main() {\n    printf("${course.title} Lesson ${i}\\n");\n    return 0;\n}`;
            practiceProblem = "Write a C program to reverse an array.";
          }
        } else {
          // General template for other courses
          content = `### Introduction to ${course.title}\nWelcome to the introductory module of **${course.title}**. This lesson covers the fundamentals of ${course.title} including development context, standard syntax, common use cases, and modular designs.\n\n### Core Concepts\n1. Syntax standards and ecosystem tooling.\n2. Best practices in designing ${course.title} modules.\n3. Modern deployment environments and runtime safety.`;
          exampleCode = `// Code example for ${course.title}\nconsole.log("Welcome to ${course.title}!");`;
          practiceProblem = `Create a simple program or script demonstrating the core syntax of ${course.title}.`;
        }

        const lesson: Lesson = {
          id: lessonId,
          courseId: course.id,
          title: i === 1 ? "Getting Started & Core Setup" : i === 2 ? "Core Syntax & Foundations" : "Advanced Concepts & Applications",
          content,
          exampleCode,
          practiceProblem,
          orderIndex: i
        };
        this.data.lessons.push(lesson);

        // Add standard MCQ, Short, and Coding quiz for each lesson!
        const quizMCQ: Quiz = {
          id: (lessonId * 10) + 1,
          lessonId: lessonId,
          type: "MCQ",
          question: `What is a primary concept/design target in ${course.title} lesson on "${lesson.title}"?`,
          options: ["Portability & reliability", "Unoptimized execution speed", "Complex pointer arithmetic only", "Client-only execution"],
          correctAnswer: "Portability & reliability",
          explanation: `In the study of ${course.title}, standard architectures target portability and structured execution safety.`
        };

        const quizShort: Quiz = {
          id: (lessonId * 10) + 2,
          lessonId: lessonId,
          type: "SHORT",
          question: `Explain in 1 sentence what the main objective of ${course.title} is.`,
          correctAnswer: "To build structured, efficient, and maintainable software systems.",
          explanation: `The core purpose of studying computer science languages and methodologies is structured and optimal problem-solving.`
        };

        const quizCoding: Quiz = {
          id: (lessonId * 10) + 3,
          lessonId: lessonId,
          type: "CODING",
          question: `Write a simple snippet in ${course.title} that outputs the string "Success".`,
          correctAnswer: "Success",
          explanation: `A standard printing statement or return value outputting "Success" satisfies the syntactic check.`
        };

        this.data.quizzes.push(quizMCQ, quizShort, quizCoding);
      }

      // Add resources
      this.data.resources.push(
        { id: course.id * 3 + 1, courseId: course.id, title: `${course.title} Official Documentation`, url: `https://docs.oracle.com/search?q=${course.title}`, type: "doc" },
        { id: course.id * 3 + 2, courseId: course.id, title: `Advanced ${course.title} Reference Guide`, url: `https://wikipedia.org/wiki/${course.title}`, type: "article" }
      );
    });

    this.save();
  }
}

export const dbStore = new DbStore();
