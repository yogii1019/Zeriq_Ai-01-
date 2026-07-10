import { dbStore, Course, Lesson, Resource } from "../database/dbStore";

export class CourseRepository {
  public findAll(): Course[] {
    return dbStore.data.courses;
  }

  public findById(id: number): Course | undefined {
    return dbStore.data.courses.find(c => c.id === id);
  }

  public findLessonsByCourseId(courseId: number): Lesson[] {
    return dbStore.data.lessons.filter(l => l.courseId === courseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public findLessonById(lessonId: number): Lesson | undefined {
    return dbStore.data.lessons.find(l => l.id === lessonId);
  }

  public findResourcesByCourseId(courseId: number): Resource[] {
    return dbStore.data.resources.filter(r => r.courseId === courseId);
  }
}
