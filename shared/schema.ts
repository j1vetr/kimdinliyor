import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - Anonim kullanıcılar (sadece isim + Spotify bağlantısı)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  uniqueName: text("unique_name").notNull().unique(),
  spotifyConnected: boolean("spotify_connected").default(false),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rooms - Oyun odaları
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 7 }).notNull().unique(),
  name: text("name").notNull(),
  maxPlayers: integer("max_players").default(8),
  isPublic: boolean("is_public").default(true),
  passwordHash: text("password_hash"),
  hostUserId: varchar("host_user_id").references(() => users.id),
  status: text("status").default("waiting"), // waiting, playing, finished
  currentRound: integer("current_round").default(0),
  totalRounds: integer("total_rounds").default(10),
  roundDuration: integer("round_duration").default(20), // seconds per round
  createdAt: timestamp("created_at").defaultNow(),
});

// RoomPlayers - Odadaki oyuncular
export const roomPlayers = pgTable("room_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  isReady: boolean("is_ready").default(false),
  totalScore: integer("total_score").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// SpotifyTokens - Kullanıcı Spotify token'ları
export const spotifyTokens = pgTable("spotify_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  oderId: varchar("order_id").references(() => users.id).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// TracksCache - Odadaki şarkı havuzu
export const tracksCache = pgTable("tracks_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  trackId: text("track_id").notNull(),
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumArtUrl: text("album_art_url"),
  previewUrl: text("preview_url"),
  sourceUserIds: text("source_user_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rounds - Oyun turları
export const rounds = pgTable("rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  roundNumber: integer("round_number").notNull(),
  trackId: varchar("track_id").references(() => tracksCache.id),
  correctUserIds: text("correct_user_ids").array(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// Answers - Kullanıcı cevapları
export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id).notNull(),
  oderId: varchar("user_id").references(() => users.id).notNull(),
  selectedUserIds: text("selected_user_ids").array().notNull(),
  isCorrect: boolean("is_correct"),
  isPartialCorrect: boolean("is_partial_correct"),
  score: integer("score").default(0),
  answeredAt: timestamp("answered_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  roomPlayers: many(roomPlayers),
  hostedRooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(users, {
    fields: [rooms.hostUserId],
    references: [users.id],
  }),
  players: many(roomPlayers),
  tracks: many(tracksCache),
  rounds: many(rounds),
}));

export const roomPlayersRelations = relations(roomPlayers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomPlayers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomPlayers.userId],
    references: [users.id],
  }),
}));

export const tracksCacheRelations = relations(tracksCache, ({ one }) => ({
  room: one(rooms, {
    fields: [tracksCache.roomId],
    references: [rooms.id],
  }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  room: one(rooms, {
    fields: [rounds.roomId],
    references: [rooms.id],
  }),
  track: one(tracksCache, {
    fields: [rounds.trackId],
    references: [tracksCache.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  round: one(rounds, {
    fields: [answers.roundId],
    references: [rounds.id],
  }),
  user: one(users, {
    fields: [answers.oderId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  code: true,
  createdAt: true,
  currentRound: true,
  status: true,
});

export const insertRoomPlayerSchema = createInsertSchema(roomPlayers).omit({
  id: true,
  joinedAt: true,
  totalScore: true,
  isReady: true,
});

export const insertTrackSchema = createInsertSchema(tracksCache).omit({
  id: true,
  createdAt: true,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  answeredAt: true,
  isCorrect: true,
  isPartialCorrect: true,
  score: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type InsertRoomPlayer = z.infer<typeof insertRoomPlayerSchema>;

export type Track = typeof tracksCache.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;

export type Round = typeof rounds.$inferSelect;
export type InsertRound = z.infer<typeof insertRoundSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

// Extended types for frontend
export type PlayerWithUser = RoomPlayer & { user: User };
export type RoomWithPlayers = Room & { players: PlayerWithUser[] };
export type RoundWithTrack = Round & { track: Track | null };
