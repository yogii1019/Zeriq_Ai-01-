import { CourseRepository } from "../repositories/CourseRepository";
import { Course, Lesson, Resource } from "../database/dbStore";

export class CourseService {
  private courseRepository = new CourseRepository();

  public getCourses(): Course[] {
    return this.courseRepository.findAll();
  }

  public getCourseById(id: number): Course | undefined {
    return this.courseRepository.findById(id);
  }

  public getLessonsByCourse(courseId: number): Lesson[] {
    return this.courseRepository.findLessonsByCourseId(courseId);
  }

  public getLessonById(lessonId: number): Lesson | undefined {
    return this.courseRepository.findLessonById(lessonId);
  }

  public getResourcesByCourse(courseId: number): Resource[] {
    return this.courseRepository.findResourcesByCourseId(courseId);
  }
}
