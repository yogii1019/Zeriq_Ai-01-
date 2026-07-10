import { dbStore, Conversation } from "../database/dbStore";

export class ConversationRepository {
  public findByUserId(userId: number): Conversation[] {
    return dbStore.data.conversations.filter(c => c.userId === userId);
  }

  public findByUserIdAndCourseId(userId: number, courseId: number): Conversation[] {
    return dbStore.data.conversations.filter(c => c.userId === userId && c.courseId === courseId);
  }

  public save(conversation: Conversation): Conversation {
    if (conversation.id === 0) {
      conversation.id = dbStore.data.conversations.length > 0 ? Math.max(...dbStore.data.conversations.map(c => c.id)) + 1 : 1;
    }
    dbStore.data.conversations.push(conversation);
    dbStore.save();
    return conversation;
  }

  public clearByUserId(userId: number): void {
    dbStore.data.conversations = dbStore.data.conversations.filter(c => c.userId !== userId);
    dbStore.save();
  }
}
