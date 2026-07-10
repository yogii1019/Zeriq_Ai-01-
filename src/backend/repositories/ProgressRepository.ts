import { dbStore, Progress } from "../database/dbStore";

export class ProgressRepository {
  public findByUserId(userId: number): Progress[] {
    return dbStore.data.progress.filter(p => p.userId === userId);
  }

  public findByUserIdAndCourseId(userId: number, courseId: number): Progress[] {
    return dbStore.data.progress.filter(p => p.userId === userId && p.courseId === courseId);
  }

  public findByUserIdAndLessonId(userId: number, lessonId: number): Progress | undefined {
    return dbStore.data.progress.find(p => p.userId === userId && p.lessonId === lessonId);
  }

  public save(progress: Progress): Progress {
    const existingIndex = dbStore.data.progress.findIndex(
      p => p.userId === progress.userId && p.lessonId === progress.lessonId
    );
    if (existingIndex >= 0) {
      dbStore.data.progress[existingIndex] = {
        ...dbStore.data.progress[existingIndex],
        ...progress,
        studyTimeSeconds: (dbStore.data.progress[existingIndex].studyTimeSeconds || 0) + (progress.studyTimeSeconds || 0)
      };
      progress = dbStore.data.progress[existingIndex];
    } else {
      if (progress.id === 0) {
        progress.id = dbStore.data.progress.length > 0 ? Math.max(...dbStore.data.progress.map(p => p.id)) + 1 : 1;
      }
      dbStore.data.progress.push(progress);
    }
    dbStore.save();
    return progress;
  }
}
