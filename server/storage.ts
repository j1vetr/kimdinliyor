import {
  users,
  rooms,
  roomPlayers,
  contentCache,
  rounds,
  answers,
  googleTokens,
  globalTrendingCache,
  type User,
  type InsertUser,
  type Room,
  type InsertRoom,
  type RoomPlayer,
  type InsertRoomPlayer,
  type Content,
  type InsertContent,
  type Round,
  type InsertRound,
  type Answer,
  type InsertAnswer,
  type PlayerWithUser,
  type RoomWithPlayers,
  type GlobalTrending,
  type InsertGlobalTrending,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface GoogleToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUniqueName(uniqueName: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  getRoomWithPlayers(code: string): Promise<RoomWithPlayers | undefined>;
  createRoom(room: InsertRoom & { code: string }): Promise<Room>;
  updateRoom(id: string, data: Partial<Room>): Promise<Room | undefined>;

  // Room Players
  getRoomPlayers(roomId: string): Promise<PlayerWithUser[]>;
  getRoomPlayer(roomId: string, userId: string): Promise<RoomPlayer | undefined>;
  addPlayerToRoom(data: InsertRoomPlayer): Promise<RoomPlayer>;
  updatePlayerScore(id: string, score: number): Promise<void>;
  removePlayerFromRoom(roomId: string, userId: string): Promise<void>;
  resetPlayerScores(roomId: string): Promise<void>;

  // Content (videos + channels)
  getContentByRoom(roomId: string): Promise<Content[]>;
  addContent(content: InsertContent): Promise<Content>;
  getRandomContent(roomId: string): Promise<Content | undefined>;
  clearRoomContent(roomId: string): Promise<void>;
  getContentById(id: string): Promise<Content | undefined>;

  // Rounds
  getCurrentRound(roomId: string): Promise<Round | undefined>;
  createRound(round: InsertRound): Promise<Round>;
  updateRound(id: string, data: Partial<Round>): Promise<Round | undefined>;

  // Answers
  getAnswersByRound(roundId: string): Promise<Answer[]>;
  getAnswer(roundId: string, userId: string): Promise<Answer | undefined>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  updateAnswer(id: string, data: Partial<Answer>): Promise<Answer | undefined>;

  // Google Tokens
  getGoogleToken(userId: string): Promise<GoogleToken | undefined>;
  saveGoogleToken(userId: string, token: GoogleToken): Promise<void>;
  deleteGoogleToken(userId: string): Promise<void>;

  // Global Trending Cache
  getGlobalTrendingByType(contentType: string): Promise<GlobalTrending[]>;
  getTrendingCacheAge(contentType: string): Promise<number | null>; // Returns age in minutes
  refreshGlobalTrending(contentType: string, items: InsertGlobalTrending[]): Promise<void>;
  getRandomTrendingContent(contentType: string, count: number, excludeIds?: string[]): Promise<GlobalTrending[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUniqueName(uniqueName: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.uniqueName, uniqueName));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room || undefined;
  }

  async getRoomWithPlayers(code: string): Promise<RoomWithPlayers | undefined> {
    const room = await this.getRoomByCode(code);
    if (!room) return undefined;

    const players = await this.getRoomPlayers(room.id);
    return { ...room, players };
  }

  async createRoom(roomData: InsertRoom & { code: string }): Promise<Room> {
    const [room] = await db.insert(rooms).values(roomData).returning();
    return room;
  }

  async updateRoom(id: string, data: Partial<Room>): Promise<Room | undefined> {
    const [room] = await db.update(rooms).set(data).where(eq(rooms.id, id)).returning();
    return room || undefined;
  }

  // Room Players
  async getRoomPlayers(roomId: string): Promise<PlayerWithUser[]> {
    const result = await db
      .select()
      .from(roomPlayers)
      .innerJoin(users, eq(roomPlayers.userId, users.id))
      .where(eq(roomPlayers.roomId, roomId));

    return result.map((row) => ({
      ...row.room_players,
      user: row.users,
    }));
  }

  async getRoomPlayer(roomId: string, userId: string): Promise<RoomPlayer | undefined> {
    const [player] = await db
      .select()
      .from(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
    return player || undefined;
  }

  async addPlayerToRoom(data: InsertRoomPlayer): Promise<RoomPlayer> {
    const [player] = await db.insert(roomPlayers).values(data).returning();
    return player;
  }

  async updatePlayerScore(id: string, score: number): Promise<void> {
    await db.update(roomPlayers).set({ totalScore: score }).where(eq(roomPlayers.id, id));
  }

  async removePlayerFromRoom(roomId: string, userId: string): Promise<void> {
    await db
      .delete(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  async resetPlayerScores(roomId: string): Promise<void> {
    await db
      .update(roomPlayers)
      .set({ totalScore: 0 })
      .where(eq(roomPlayers.roomId, roomId));
  }

  // Content (videos + channels)
  async getContentByRoom(roomId: string): Promise<Content[]> {
    return db.select().from(contentCache).where(eq(contentCache.roomId, roomId));
  }

  async addContent(content: InsertContent): Promise<Content> {
    const [newContent] = await db.insert(contentCache).values(content).returning();
    return newContent;
  }

  async getRandomContent(roomId: string): Promise<Content | undefined> {
    const contents = await this.getContentByRoom(roomId);
    if (contents.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * contents.length);
    return contents[randomIndex];
  }

  async clearRoomContent(roomId: string): Promise<void> {
    // First delete answers that reference rounds in this room
    const roomRounds = await db.select().from(rounds).where(eq(rounds.roomId, roomId));
    for (const round of roomRounds) {
      await db.delete(answers).where(eq(answers.roundId, round.id));
    }
    // Then delete rounds that reference content in this room
    await db.delete(rounds).where(eq(rounds.roomId, roomId));
    // Finally delete the content cache
    await db.delete(contentCache).where(eq(contentCache.roomId, roomId));
  }

  async getContentById(id: string): Promise<Content | undefined> {
    const [content] = await db.select().from(contentCache).where(eq(contentCache.id, id));
    return content || undefined;
  }

  // Rounds
  async getCurrentRound(roomId: string): Promise<Round | undefined> {
    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.roomId, roomId))
      .orderBy(desc(rounds.roundNumber))
      .limit(1);
    return round || undefined;
  }

  async createRound(round: InsertRound): Promise<Round> {
    const [newRound] = await db.insert(rounds).values(round).returning();
    return newRound;
  }

  async updateRound(id: string, data: Partial<Round>): Promise<Round | undefined> {
    const [round] = await db.update(rounds).set(data).where(eq(rounds.id, id)).returning();
    return round || undefined;
  }

  // Answers
  async getAnswersByRound(roundId: string): Promise<Answer[]> {
    return db.select().from(answers).where(eq(answers.roundId, roundId));
  }

  async getAnswer(roundId: string, userId: string): Promise<Answer | undefined> {
    const [answer] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.roundId, roundId), eq(answers.oderId, userId)));
    return answer || undefined;
  }

  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const [newAnswer] = await db.insert(answers).values(answer).returning();
    return newAnswer;
  }

  async updateAnswer(id: string, data: Partial<Answer>): Promise<Answer | undefined> {
    const [answer] = await db.update(answers).set(data).where(eq(answers.id, id)).returning();
    return answer || undefined;
  }

  // Google Tokens
  async getGoogleToken(userId: string): Promise<GoogleToken | undefined> {
    const [token] = await db
      .select()
      .from(googleTokens)
      .where(eq(googleTokens.userId, userId));
    if (!token) return undefined;
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  async saveGoogleToken(userId: string, token: GoogleToken): Promise<void> {
    const existing = await this.getGoogleToken(userId);
    if (existing) {
      await db
        .update(googleTokens)
        .set({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
        })
        .where(eq(googleTokens.userId, userId));
    } else {
      await db.insert(googleTokens).values({
        userId: userId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
      });
    }
  }

  async deleteGoogleToken(userId: string): Promise<void> {
    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
  }

  // Global Trending Cache
  async getGlobalTrendingByType(contentType: string): Promise<GlobalTrending[]> {
    return db.select().from(globalTrendingCache).where(eq(globalTrendingCache.contentType, contentType));
  }

  async getTrendingCacheAge(contentType: string): Promise<number | null> {
    const [item] = await db
      .select()
      .from(globalTrendingCache)
      .where(eq(globalTrendingCache.contentType, contentType))
      .limit(1);
    
    if (!item || !item.fetchedAt) return null;
    
    const ageMs = Date.now() - item.fetchedAt.getTime();
    return Math.floor(ageMs / (1000 * 60)); // Return age in minutes
  }

  async refreshGlobalTrending(contentType: string, items: InsertGlobalTrending[]): Promise<void> {
    // Delete existing items of this type
    await db.delete(globalTrendingCache).where(eq(globalTrendingCache.contentType, contentType));
    
    // Insert new items
    if (items.length > 0) {
      await db.insert(globalTrendingCache).values(items);
    }
  }

  async getRandomTrendingContent(contentType: string, count: number, excludeIds: string[] = []): Promise<GlobalTrending[]> {
    const allContent = await this.getGlobalTrendingByType(contentType);
    
    // Filter out excluded IDs
    const available = allContent.filter(c => !excludeIds.includes(c.contentId));
    
    // Shuffle and take count items
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // ============= ADMIN METHODS =============
  
  async getAdminStats(): Promise<{
    userCount: number;
    roomCount: number;
    activeRoomCount: number;
    tokenCount: number;
    contentCount: number;
    roundCount: number;
  }> {
    const allUsers = await db.select().from(users);
    const allRooms = await db.select().from(rooms);
    const activeRooms = allRooms.filter(r => r.status === "playing" || r.status === "waiting");
    const allTokens = await db.select().from(googleTokens);
    const allContent = await db.select().from(contentCache);
    const allRounds = await db.select().from(rounds);
    
    return {
      userCount: allUsers.length,
      roomCount: allRooms.length,
      activeRoomCount: activeRooms.length,
      tokenCount: allTokens.length,
      contentCount: allContent.length,
      roundCount: allRounds.length,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllRooms(): Promise<Room[]> {
    return db.select().from(rooms).orderBy(desc(rooms.createdAt));
  }

  async getAllTokens(): Promise<{ userId: string; expiresAt: Date; createdAt: Date | null }[]> {
    const tokens = await db.select({
      userId: googleTokens.userId,
      expiresAt: googleTokens.expiresAt,
      createdAt: googleTokens.createdAt,
    }).from(googleTokens);
    return tokens;
  }

  async revokeUserToken(userId: string): Promise<void> {
    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
    await db.update(users).set({ googleConnected: false }).where(eq(users.id, userId));
  }

  async revokeAllTokens(): Promise<void> {
    await db.delete(googleTokens);
    await db.update(users).set({ googleConnected: false });
  }

  async deleteUser(id: string): Promise<void> {
    // Delete related data first
    await db.delete(googleTokens).where(eq(googleTokens.userId, id));
    await db.delete(roomPlayers).where(eq(roomPlayers.userId, id));
    await db.delete(answers).where(eq(answers.oderId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteRoom(id: string): Promise<void> {
    // Get all rounds for this room
    const roomRounds = await db.select().from(rounds).where(eq(rounds.roomId, id));
    
    // Delete answers for each round
    for (const round of roomRounds) {
      await db.delete(answers).where(eq(answers.roundId, round.id));
    }
    
    // Delete rounds
    await db.delete(rounds).where(eq(rounds.roomId, id));
    
    // Delete content cache
    await db.delete(contentCache).where(eq(contentCache.roomId, id));
    
    // Delete room players
    await db.delete(roomPlayers).where(eq(roomPlayers.roomId, id));
    
    // Delete room
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  async clearAllData(): Promise<void> {
    await db.delete(answers);
    await db.delete(rounds);
    await db.delete(contentCache);
    await db.delete(roomPlayers);
    await db.delete(googleTokens);
    await db.delete(globalTrendingCache);
    await db.delete(rooms);
    await db.delete(users);
  }

  async clearOldRooms(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allRooms = await db.select().from(rooms);
    
    let deletedCount = 0;
    for (const room of allRooms) {
      const isOld = room.createdAt && room.createdAt < oneDayAgo;
      const isFinished = room.status === "finished";
      
      if (isOld || isFinished) {
        await this.deleteRoom(room.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  async clearTrendingCache(): Promise<void> {
    await db.delete(globalTrendingCache);
  }
}

// Helper functions
export async function generateUniqueRoomCode(): Promise<string> {
  const storage = new DatabaseStorage();
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    code = String(randomNum);
    const existing = await storage.getRoomByCode(code);
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Could not generate unique room code");
  }

  return code;
}

export async function generateUniqueName(baseName: string): Promise<string> {
  const storage = new DatabaseStorage();
  let uniqueName = baseName;
  let counter = 2;

  while (await storage.getUserByUniqueName(uniqueName)) {
    uniqueName = `${baseName}#${counter}`;
    counter++;
  }

  return uniqueName;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const storage = new DatabaseStorage();
