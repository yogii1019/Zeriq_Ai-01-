import { NoteRepository } from "../repositories/NoteRepository";
import { Note } from "../database/dbStore";
import { getGeminiClient } from "../config/GeminiConfig";

export class NoteService {
  private noteRepository = new NoteRepository();

  public getNotesByUser(userId: number): Note[] {
    return this.noteRepository.findByUserId(userId);
  }

  public getNoteById(id: number): Note | undefined {
    return this.noteRepository.findById(id);
  }

  public createNote(userId: number, title: string, content: string, courseId?: number, lessonId?: number): Note {
    const note: Note = {
      id: 0,
      userId,
      title,
      content,
      courseId,
      lessonId,
      createdAt: new Date().toISOString()
    };
    return this.noteRepository.save(note);
  }

  public updateNote(id: number, title: string, content: string): Note {
    const note = this.noteRepository.findById(id);
    if (!note) {
      throw new Error("Note not found");
    }
    note.title = title;
    note.content = content;
    return this.noteRepository.save(note);
  }

  public deleteNote(id: number): boolean {
    return this.noteRepository.delete(id);
  }

  public async summarizeNoteWithAi(noteId: number): Promise<Note> {
    const note = this.noteRepository.findById(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Please summarize the following student computer science note. Focus on extracting key terms, definitions, and code logic:
        
        Title: ${note.title}
        Content:
        ${note.content}
        
        Provide a concise, high-quality, structured summary in Markdown format. Limit response to 150 words.`,
      });

      if (response.text) {
        note.summary = response.text;
      } else {
        note.summary = "Unable to generate summary - empty response from Gemini.";
      }
    } catch (err) {
      console.error("Gemini summarize error:", err);
      // Fallback summary
      note.summary = `### AI Summary (Offline Fallback)\nThis note titled **${note.title}** contains key insights on computer science studies. It covers: \n\n1. Essential variables and structured syntax.\n2. Modular structural paradigms.\n3. Problem-solving steps.\n\n*Note: Add a valid Gemini API key in Secrets to get real-time tailored summaries.*`;
    }

    return this.noteRepository.save(note);
  }
}
