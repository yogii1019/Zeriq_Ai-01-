import { Request, Response, Router } from "express";
import { CourseService } from "../services/CourseService";

export class CourseController {
  private courseService = new CourseService();
  public router = Router();

  constructor() {
    this.router.get("/", this.getCourses.bind(this));
    this.router.get("/:id", this.getCourse.bind(this));
    this.router.get("/:id/lessons", this.getLessons.bind(this));
    this.router.get("/lessons/:lessonId", this.getLesson.bind(this));
    this.router.get("/:id/resources", this.getResources.bind(this));
  }

  private getCourses(req: Request, res: Response): void {
    try {
      const courses = this.courseService.getCourses();
      res.json(courses);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getCourse(req: Request, res: Response): void {
    try {
      const course = this.courseService.getCourseById(Number(req.params.id));
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      res.json(course);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getLessons(req: Request, res: Response): void {
    try {
      const lessons = this.courseService.getLessonsByCourse(Number(req.params.id));
      res.json(lessons);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getLesson(req: Request, res: Response): void {
    try {
      const lesson = this.courseService.getLessonById(Number(req.params.lessonId));
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      res.json(lesson);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getResources(req: Request, res: Response): void {
    try {
      const resources = this.courseService.getResourcesByCourse(Number(req.params.id));
      res.json(resources);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
