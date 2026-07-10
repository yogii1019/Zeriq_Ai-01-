import { Request, Response, Router } from "express";
import { ProgressService } from "../services/ProgressService";
import { userExtractor } from "./UserController";

export class ProgressController {
  private progressService = new ProgressService();
  public router = Router();

  constructor() {
    this.router.get("/", userExtractor, this.getProgress.bind(this));
    this.router.post("/time", userExtractor, this.trackTime.bind(this));
    this.router.post("/lesson/complete", userExtractor, this.completeLesson.bind(this));
    this.router.get("/quizzes", userExtractor, this.getQuizzes.bind(this));
    this.router.post("/quiz/submit", userExtractor, this.submitQuiz.bind(this));
  }

  private getProgress(req: Request, res: Response): void {
    try {
      const progress = this.progressService.getProgressByUser(req.userId!);
      res.json(progress);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private trackTime(req: Request, res: Response): void {
    try {
      const { courseId, lessonId, seconds } = req.body;
      if (!courseId || !lessonId || seconds === undefined) {
        res.status(400).json({ error: "courseId, lessonId and seconds are required" });
        return;
      }
      const progress = this.progressService.trackLessonTime(
        req.userId!,
        Number(courseId),
        Number(lessonId),
        Number(seconds)
      );
      res.json(progress);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private completeLesson(req: Request, res: Response): void {
    try {
      const { courseId, lessonId } = req.body;
      if (!courseId || !lessonId) {
        res.status(400).json({ error: "courseId and lessonId are required" });
        return;
      }
      const progress = this.progressService.completeLesson(
        req.userId!,
        Number(courseId),
        Number(lessonId)
      );
      res.json(progress);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getQuizzes(req: Request, res: Response): void {
    try {
      const results = this.progressService.getQuizResults(req.userId!);
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private async submitQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { quizId, answer } = req.body;
      if (!quizId || answer === undefined) {
        res.status(400).json({ error: "quizId and answer are required" });
        return;
      }
      const result = await this.progressService.submitQuizAnswer(
        req.userId!,
        Number(quizId),
        answer
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
