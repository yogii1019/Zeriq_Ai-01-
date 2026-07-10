import { dbStore, Note } from "../database/dbStore";

export class NoteRepository {
  public findByUserId(userId: number): Note[] {
    return dbStore.data.notes.filter(n => n.userId === userId);
  }

  public findById(id: number): Note | undefined {
    return dbStore.data.notes.find(n => n.id === id);
  }

  public save(note: Note): Note {
    const existingIndex = dbStore.data.notes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      dbStore.data.notes[existingIndex] = note;
    } else {
      if (note.id === 0) {
        note.id = dbStore.data.notes.length > 0 ? Math.max(...dbStore.data.notes.map(n => n.id)) + 1 : 1;
      }
      dbStore.data.notes.push(note);
    }
    dbStore.save();
    return note;
  }

  public delete(id: number): boolean {
    const index = dbStore.data.notes.findIndex(n => n.id === id);
    if (index >= 0) {
      dbStore.data.notes.splice(index, 1);
      dbStore.save();
      return true;
    }
    return false;
  }
}
