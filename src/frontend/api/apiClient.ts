export interface User {
  id: number;
  username: string;
  email: string;
  coursePreferenceId?: number;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  preferredAiMode?: "Text" | "Voice";
  preferredVoice?: string;
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  progress: number;
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  content: string;
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
  options?: string[];
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
  studyTimeSeconds: number;
  lastStudiedAt: string;
}

export interface Conversation {
  id: number;
  userId: number;
  courseId?: number;
  role: "student" | "ai";
  message: string;
  audioBase64?: string;
  createdAt: string;
}

export interface Resource {
  id: number;
  courseId: number;
  title: string;
  url: string;
  type: "video" | "article" | "doc";
}

class ApiClient {
  private getStoredUser(): User | null {
    const userJson = localStorage.getItem("zeriq_user");
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      localStorage.removeItem("zeriq_user");
      return null;
    }
  }

  private getUserId(): string | null {
    const user = this.getStoredUser();
    return user?.id ? String(user.id) : null;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const uid = this.getUserId();
    if (uid) {
      headers["x-user-id"] = uid;
    }
    return headers;
  }

  public async login(username: string, email: string): Promise<User> {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });
    if (!res.ok) throw new Error(await res.text());
    const user = await res.json();
    localStorage.setItem("zeriq_user", JSON.stringify(user));
    return user;
  }

  public async getProfile(): Promise<User> {
    const res = await fetch("/api/users/profile", {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized profile read");
    return res.json();
  }

  public async savePreferences(courseId: number, difficulty: string, preferredAiMode: string, preferredVoice?: string): Promise<User> {
    const payload = { courseId, difficulty, preferredAiMode, preferredVoice };
    let res = await fetch("/api/users/preferences", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 401 || res.status === 404 || res.status === 500) {
      const storedUser = this.getStoredUser();
      if (storedUser?.username && storedUser?.email) {
        await this.login(storedUser.username, storedUser.email);
        res = await fetch("/api/users/preferences", {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });
      }
    }

    if (!res.ok) throw new Error(await res.text());
    const user = await res.json();
    localStorage.setItem("zeriq_user", JSON.stringify(user));
    return user;
  }

  public async getCourses(): Promise<Course[]> {
    const res = await fetch("/api/courses");
    return res.json();
  }

  public async getCourseById(id: number): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`);
    return res.json();
  }

  public async getLessonsByCourse(courseId: number): Promise<Lesson[]> {
    const res = await fetch(`/api/courses/${courseId}/lessons`);
    return res.json();
  }

  public async getLessonById(lessonId: number): Promise<Lesson> {
    const res = await fetch(`/api/courses/lessons/${lessonId}`);
    return res.json();
  }

  public async getResourcesByCourse(courseId: number): Promise<Resource[]> {
    const res = await fetch(`/api/courses/${courseId}/resources`);
    return res.json();
  }

  public async getNotes(): Promise<Note[]> {
    const res = await fetch("/api/notes", { headers: this.getHeaders() });
    return res.json();
  }

  public async createNote(title: string, content: string, courseId?: number, lessonId?: number): Promise<Note> {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ title, content, courseId, lessonId }),
    });
    return res.json();
  }

  public async updateNote(id: number, title: string, content: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({ title, content }),
    });
    return res.json();
  }

  public async deleteNote(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return res.json();
  }

  public async AIsummarizeNote(id: number): Promise<Note> {
    const res = await fetch(`/api/notes/${id}/summarize`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return res.json();
  }

  public async getChatHistory(): Promise<Conversation[]> {
    const res = await fetch("/api/chat", { headers: this.getHeaders() });
    return res.json();
  }

  public async sendChatMessage(message: string, courseId?: number, aiMode: "Text" | "Voice" = "Text"): Promise<{ response: Conversation; audioBase64?: string }> {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ message, courseId, aiMode }),
    });
    return res.json();
  }

  public async generateTTS(text: string): Promise<{ audioBase64: string }> {
    const res = await fetch("/api/chat/tts", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    });
    return res.json();
  }

  public async clearChat(): Promise<{ success: boolean }> {
    const res = await fetch("/api/chat/clear", {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  }

  public async getProgress(): Promise<Progress[]> {
    const res = await fetch("/api/progress", { headers: this.getHeaders() });
    return res.json();
  }

  public async trackStudyTime(courseId: number, lessonId: number, seconds: number): Promise<Progress> {
    const res = await fetch("/api/progress/time", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ courseId, lessonId, seconds }),
    });
    return res.json();
  }

  public async completeLesson(courseId: number, lessonId: number): Promise<Progress> {
    const res = await fetch("/api/progress/lesson/complete", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ courseId, lessonId }),
    });
    return res.json();
  }

  public async getQuizResults(): Promise<QuizResult[]> {
    const res = await fetch("/api/progress/quizzes", { headers: this.getHeaders() });
    return res.json();
  }

  public async submitQuizAnswer(quizId: number, answer: string): Promise<QuizResult> {
    const res = await fetch("/api/progress/quiz/submit", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ quizId, answer }),
    });
    return res.json();
  }
}

export const apiClient = new ApiClient();
