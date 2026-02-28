import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: string): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(participant1: string, participant2: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: string): Promise<void>;
  getMessagesByConversation(conversationId: string): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: string, senderId: string, content: string): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: string) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
  },

  async createConversation(participant1: string, participant2: string) {
    const [conversation] = await db.insert(conversations).values({ participant1, participant2 }).returning();
    return conversation;
  },

  async deleteConversation(id: string) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: string) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
  },

  async createMessage(conversationId: string, senderId: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, senderId, content }).returning();
    return message;
  },
};

