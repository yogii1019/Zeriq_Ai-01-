import { Request, Response, Router } from "express";
import { NoteService } from "../services/NoteService";
import { userExtractor } from "./UserController";

export class NoteController {
  private noteService = new NoteService();
  public router = Router();

  constructor() {
    this.router.get("/", userExtractor, this.getNotes.bind(this));
    this.router.post("/", userExtractor, this.createNote.bind(this));
    this.router.put("/:id", userExtractor, this.updateNote.bind(this));
    this.router.delete("/:id", userExtractor, this.deleteNote.bind(this));
    this.router.post("/:id/summarize", userExtractor, this.summarizeNote.bind(this));
  }

  private getNotes(req: Request, res: Response): void {
    try {
      const notes = this.noteService.getNotesByUser(req.userId!);
      res.json(notes);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private createNote(req: Request, res: Response): void {
    try {
      const { title, content, courseId, lessonId } = req.body;
      if (!title || !content) {
        res.status(400).json({ error: "Title and content are required" });
        return;
      }
      const note = this.noteService.createNote(
        req.userId!,
        title,
        content,
        courseId ? Number(courseId) : undefined,
        lessonId ? Number(lessonId) : undefined
      );
      res.status(201).json(note);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private updateNote(req: Request, res: Response): void {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        res.status(400).json({ error: "Title and content are required" });
        return;
      }
      const note = this.noteService.updateNote(Number(req.params.id), title, content);
      res.json(note);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private deleteNote(req: Request, res: Response): void {
    try {
      const success = this.noteService.deleteNote(Number(req.params.id));
      if (!success) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      res.json({ success: true, message: "Note deleted successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  private async summarizeNote(req: Request, res: Response): Promise<void> {
    try {
      const note = await this.noteService.summarizeNoteWithAi(Number(req.params.id));
      res.json(note);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
