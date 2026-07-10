import { Request, Response, Router } from "express";
import { UserService } from "../services/UserService";

export const userExtractor = (req: Request, res: Response, next: () => void) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Missing User ID header." });
    return;
  }
  req.userId = Number(userId);
  next();
};

// Declaring property to extend Express Request object
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export class UserController {
  private userService = new UserService();
  public router = Router();

  constructor() {
    this.router.post("/login", this.login.bind(this));
    this.router.get("/profile", userExtractor, this.getProfile.bind(this));
    this.router.post("/preferences", userExtractor, this.updatePreferences.bind(this));
  }

  private login(req: Request, res: Response): void {
    try {
      const { username, email } = req.body;
      if (!username || !email) {
        res.status(400).json({ error: "Username and email are required." });
        return;
      }
      const user = this.userService.loginOrCreate(username, email);
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private getProfile(req: Request, res: Response): void {
    try {
      const user = this.userService.getUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private updatePreferences(req: Request, res: Response): void {
    try {
      const { courseId, difficulty, preferredAiMode, preferredVoice } = req.body;
      if (!courseId || !difficulty || !preferredAiMode) {
        res.status(400).json({ error: "courseId, difficulty, and preferredAiMode are required." });
        return;
      }
      const updatedUser = this.userService.updateCoursePreferences(
        req.userId!,
        Number(courseId),
        difficulty,
        preferredAiMode,
        preferredVoice
      );
      res.json(updatedUser);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
