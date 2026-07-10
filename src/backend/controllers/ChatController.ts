import { Request, Response, Router } from "express";
import { ChatService } from "../services/ChatService";
import { userExtractor } from "./UserController";

export class ChatController {
  private chatService = new ChatService();
  public router = Router();

  constructor() {
    this.router.get("/", userExtractor, this.getHistory.bind(this));
    this.router.post("/send", userExtractor, this.sendMessage.bind(this));
    this.router.post("/clear", userExtractor, this.clearChat.bind(this));
    this.router.post("/tts", userExtractor, this.generateTTS.bind(this));
  }

  private getHistory(req: Request, res: Response): void {
    try {
      const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
      const history = this.chatService.getChatHistory(req.userId!, courseId);
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, courseId, aiMode } = req.body;
      if (!message) {
        res.status(400).json({ error: "Message content is required" });
        return;
      }
      const result = await this.chatService.sendMessage(
        req.userId!,
        courseId ? Number(courseId) : undefined,
        message,
        aiMode || "Text"
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private clearChat(req: Request, res: Response): void {
    try {
      this.chatService.clearChat(req.userId!);
      res.json({ success: true, message: "Chat history cleared" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private async generateTTS(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ error: "Text content is required for TTS" });
        return;
      }
      const audioBase64 = await this.chatService.generateTTS(text, req.userId!);
      res.json({ audioBase64 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
