import { dbStore, User } from "../database/dbStore";

export class UserRepository {
  public findById(id: number): User | undefined {
    return dbStore.data.users.find(u => u.id === id);
  }

  public findByEmail(email: string): User | undefined {
    return dbStore.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findByUsername(username: string): User | undefined {
    return dbStore.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public save(user: User): User {
    const existingIndex = dbStore.data.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      dbStore.data.users[existingIndex] = user;
    } else {
      if (user.id === 0) {
        user.id = dbStore.data.users.length > 0 ? Math.max(...dbStore.data.users.map(u => u.id)) + 1 : 1;
      }
      dbStore.data.users.push(user);
    }
    dbStore.save();
    return user;
  }
}
