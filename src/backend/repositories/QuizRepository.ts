import { dbStore, Quiz, QuizResult } from "../database/dbStore";

export class QuizRepository {
  public findByLessonId(lessonId: number): Quiz[] {
    return dbStore.data.quizzes.filter(q => q.lessonId === lessonId);
  }

  public findById(id: number): Quiz | undefined {
    return dbStore.data.quizzes.find(q => q.id === id);
  }

  public saveResult(result: QuizResult): QuizResult {
    if (result.id === 0) {
      result.id = dbStore.data.quizResults.length > 0 ? Math.max(...dbStore.data.quizResults.map(r => r.id)) + 1 : 1;
    }
    dbStore.data.quizResults.push(result);
    dbStore.save();
    return result;
  }

  public findResultsByUserId(userId: number): QuizResult[] {
    return dbStore.data.quizResults.filter(r => r.userId === userId);
  }
}
