import { UserRepository } from "../repositories/UserRepository";
import { User } from "../database/dbStore";

export class UserService {
  private userRepository = new UserRepository();

  public loginOrCreate(username: string, email: string): User {
    if (!username || !email) {
      throw new Error("Username and email are required.");
    }
    
    let user = this.userRepository.findByEmail(email);
    if (!user) {
      user = {
        id: 0,
        username,
        email,
        createdAt: new Date().toISOString()
      };
      user = this.userRepository.save(user);
    } else {
      // Update username if user already exists but typed a different one
      if (user.username !== username) {
        user.username = username;
        this.userRepository.save(user);
      }
    }
    return user;
  }

  public getUserById(id: number): User | undefined {
    return this.userRepository.findById(id);
  }

  public updateCoursePreferences(
    userId: number,
    courseId: number,
    difficulty: "Beginner" | "Intermediate" | "Advanced",
    preferredAiMode: "Text" | "Voice",
    preferredVoice?: string
  ): User {
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    user.coursePreferenceId = courseId;
    user.difficulty = difficulty;
    user.preferredAiMode = preferredAiMode;
    if (preferredVoice) {
      user.preferredVoice = preferredVoice;
    }
    return this.userRepository.save(user);
  }
}
