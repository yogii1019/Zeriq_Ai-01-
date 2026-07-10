import { ProgressRepository } from "../repositories/ProgressRepository";
import { QuizRepository } from "../repositories/QuizRepository";
import { CourseRepository } from "../repositories/CourseRepository";
import { Progress, QuizResult } from "../database/dbStore";
import { getGeminiClient } from "../config/GeminiConfig";

export class ProgressService {
  private progressRepository = new ProgressRepository();
  private quizRepository = new QuizRepository();
  private courseRepository = new CourseRepository();

  public getProgressByUser(userId: number): Progress[] {
    return this.progressRepository.findByUserId(userId);
  }

  public trackLessonTime(userId: number, courseId: number, lessonId: number, studyTimeSeconds: number): Progress {
    let progress = this.progressRepository.findByUserIdAndLessonId(userId, lessonId);
    if (!progress) {
      progress = {
        id: 0,
        userId,
        courseId,
        lessonId,
        completed: false,
        studyTimeSeconds,
        lastStudiedAt: new Date().toISOString()
      };
    } else {
      progress.studyTimeSeconds += studyTimeSeconds;
      progress.lastStudiedAt = new Date().toISOString();
    }
    return this.progressRepository.save(progress);
  }

  public completeLesson(userId: number, courseId: number, lessonId: number): Progress {
    let progress = this.progressRepository.findByUserIdAndLessonId(userId, lessonId);
    if (!progress) {
      progress = {
        id: 0,
        userId,
        courseId,
        lessonId,
        completed: true,
        studyTimeSeconds: 0,
        lastStudiedAt: new Date().toISOString()
      };
    } else {
      progress.completed = true;
      progress.lastStudiedAt = new Date().toISOString();
    }
    return this.progressRepository.save(progress);
  }

  public getQuizResults(userId: number): QuizResult[] {
    return this.quizRepository.findResultsByUserId(userId);
  }

  public async submitQuizAnswer(
    userId: number,
    quizId: number,
    userAnswer: string
  ): Promise<QuizResult> {
    const quiz = this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const isCorrect = quiz.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
    const score = isCorrect ? 100 : 0;

    const result: QuizResult = {
      id: 0,
      userId,
      quizId,
      userAnswer,
      isCorrect,
      score,
      createdAt: new Date().toISOString()
    };

    // AI explains why the answer was correct or wrong!
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Explain computer science quiz result to the student.
        Question: ${quiz.question}
        Options (if MCQ): ${quiz.options ? quiz.options.join(", ") : "N/A"}
        Correct Answer: ${quiz.correctAnswer}
        Student's Answer: ${userAnswer}
        Is Correct: ${isCorrect ? "YES" : "NO"}
        
        Provide a brief, supportive explanation. If the answer is wrong, guide them to understand why, giving a simple programming mental model. Limit to 80 words.`,
      });
      result.explanationByAi = response.text || "No explanation provided by AI.";
    } catch (e) {
      console.error("Gemini quiz explanation error:", e);
      result.explanationByAi = isCorrect
        ? `Great job! Your answer "${userAnswer}" is correct. ${quiz.explanation}`
        : `Ah, that's incorrect. The correct answer is "${quiz.correctAnswer}". Here's why: ${quiz.explanation}`;
    }

    // Save the quiz result
    const savedResult = this.quizRepository.saveResult(result);

    // If correct, update completion of lesson progress
    const lesson = this.courseRepository.findLessonById(quiz.lessonId);
    if (lesson) {
      let progress = this.progressRepository.findByUserIdAndLessonId(userId, lesson.id);
      if (!progress) {
        progress = {
          id: 0,
          userId,
          courseId: lesson.courseId,
          lessonId: lesson.id,
          completed: true,
          score,
          studyTimeSeconds: 120, // estimated interaction time
          lastStudiedAt: new Date().toISOString()
        };
      } else {
        progress.score = Math.max(progress.score || 0, score);
        progress.completed = true;
      }
      this.progressRepository.save(progress);
    }

    return savedResult;
  }
}
