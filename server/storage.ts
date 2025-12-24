import {
  users,
  rooms,
  roomPlayers,
  tracksCache,
  rounds,
  answers,
  spotifyTokens,
  type User,
  type InsertUser,
  type Room,
  type InsertRoom,
  type RoomPlayer,
  type InsertRoomPlayer,
  type Track,
  type InsertTrack,
  type Round,
  type InsertRound,
  type Answer,
  type InsertAnswer,
  type PlayerWithUser,
  type RoomWithPlayers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface SpotifyToken {
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
  getRoomPlayer(roomId: string, oderId: string): Promise<RoomPlayer | undefined>;
  addPlayerToRoom(data: InsertRoomPlayer): Promise<RoomPlayer>;
  updatePlayerScore(id: string, score: number): Promise<void>;
  removePlayerFromRoom(roomId: string, oderId: string): Promise<void>;
  resetPlayerScores(roomId: string): Promise<void>;

  // Tracks
  getTracksByRoom(roomId: string): Promise<Track[]>;
  addTrack(track: InsertTrack): Promise<Track>;
  getRandomTrack(roomId: string): Promise<Track | undefined>;
  clearRoomTracks(roomId: string): Promise<void>;

  // Rounds
  getCurrentRound(roomId: string): Promise<Round | undefined>;
  createRound(round: InsertRound): Promise<Round>;
  updateRound(id: string, data: Partial<Round>): Promise<Round | undefined>;

  // Answers
  getAnswersByRound(roundId: string): Promise<Answer[]>;
  getAnswer(roundId: string, oderId: string): Promise<Answer | undefined>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  updateAnswer(id: string, data: Partial<Answer>): Promise<Answer | undefined>;

  // Spotify Tokens
  getSpotifyToken(userId: string): Promise<SpotifyToken | undefined>;
  saveSpotifyToken(userId: string, token: SpotifyToken): Promise<void>;
  deleteSpotifyToken(userId: string): Promise<void>;
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

  async getRoomPlayer(roomId: string, oderId: string): Promise<RoomPlayer | undefined> {
    const [player] = await db
      .select()
      .from(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, oderId)));
    return player || undefined;
  }

  async addPlayerToRoom(data: InsertRoomPlayer): Promise<RoomPlayer> {
    const [player] = await db.insert(roomPlayers).values(data).returning();
    return player;
  }

  async updatePlayerScore(id: string, score: number): Promise<void> {
    await db.update(roomPlayers).set({ totalScore: score }).where(eq(roomPlayers.id, id));
  }

  async removePlayerFromRoom(roomId: string, oderId: string): Promise<void> {
    await db
      .delete(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, oderId)));
  }

  async resetPlayerScores(roomId: string): Promise<void> {
    await db
      .update(roomPlayers)
      .set({ totalScore: 0 })
      .where(eq(roomPlayers.roomId, roomId));
  }

  // Tracks
  async getTracksByRoom(roomId: string): Promise<Track[]> {
    return db.select().from(tracksCache).where(eq(tracksCache.roomId, roomId));
  }

  async addTrack(track: InsertTrack): Promise<Track> {
    const [newTrack] = await db.insert(tracksCache).values(track).returning();
    return newTrack;
  }

  async getRandomTrack(roomId: string): Promise<Track | undefined> {
    const tracks = await this.getTracksByRoom(roomId);
    if (tracks.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    return tracks[randomIndex];
  }

  async clearRoomTracks(roomId: string): Promise<void> {
    await db.delete(tracksCache).where(eq(tracksCache.roomId, roomId));
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

  async getAnswer(roundId: string, oderId: string): Promise<Answer | undefined> {
    const [answer] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.roundId, roundId), eq(answers.oderId, oderId)));
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

  // Spotify Tokens
  async getSpotifyToken(userId: string): Promise<SpotifyToken | undefined> {
    const [token] = await db
      .select()
      .from(spotifyTokens)
      .where(eq(spotifyTokens.oderId, userId));
    if (!token) return undefined;
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  async saveSpotifyToken(userId: string, token: SpotifyToken): Promise<void> {
    const existing = await this.getSpotifyToken(userId);
    if (existing) {
      await db
        .update(spotifyTokens)
        .set({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
        })
        .where(eq(spotifyTokens.oderId, userId));
    } else {
      await db.insert(spotifyTokens).values({
        oderId: userId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
      });
    }
  }

  async deleteSpotifyToken(userId: string): Promise<void> {
    await db.delete(spotifyTokens).where(eq(spotifyTokens.oderId, userId));
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
