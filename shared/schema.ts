import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - Anonim kullanıcılar (isim + Google bağlantısı)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  uniqueName: text("unique_name").notNull().unique(),
  googleConnected: boolean("google_connected").default(false),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game Modes - Oyun modları
export const GAME_MODES = {
  WHO_LIKED: "who_liked",           // Kim Beğenmiş?
  WHO_SUBSCRIBED: "who_subscribed", // Kim Abone?
  VIEW_COUNT: "view_count",         // Sayı Tahmini (izlenme)
  WHICH_MORE: "which_more",         // Hangisi Daha...
  SUBSCRIBER_COUNT: "subscriber_count", // Abone Sayısı
} as const;

export type GameMode = typeof GAME_MODES[keyof typeof GAME_MODES];

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
  gameModes: text("game_modes").array().default(["who_liked", "who_subscribed"]), // Aktif oyun modları
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

// GoogleTokens - Kullanıcı Google token'ları
export const googleTokens = pgTable("google_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ContentCache - Odadaki içerik havuzu (video + kanal)
export const contentCache = pgTable("content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  contentId: text("content_id").notNull(), // YouTube video ID veya channel ID
  contentType: text("content_type").notNull(), // "video" veya "channel"
  title: text("title").notNull(),
  subtitle: text("subtitle"), // Video için kanal adı, kanal için abone sayısı
  thumbnailUrl: text("thumbnail_url"),
  sourceUserIds: text("source_user_ids").array().notNull(), // Bu içeriği beğenen/abone olan kullanıcılar
  viewCount: text("view_count"), // Video izlenme sayısı
  likeCount: text("like_count"), // Video beğeni sayısı
  subscriberCount: text("subscriber_count"), // Kanal abone sayısı
  createdAt: timestamp("created_at").defaultNow(),
});

// Rounds - Oyun turları
export const rounds = pgTable("rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  roundNumber: integer("round_number").notNull(),
  gameMode: text("game_mode").notNull().default("who_liked"), // Aktif oyun modu
  contentId: varchar("content_id").references(() => contentCache.id),
  contentId2: varchar("content_id_2").references(() => contentCache.id), // "Hangisi Daha" modu için ikinci içerik
  correctUserIds: text("correct_user_ids").array(),
  correctAnswer: text("correct_answer"), // Sayı tahmini modları için doğru cevap
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// Answers - Kullanıcı cevapları
export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id).notNull(),
  oderId: varchar("user_id").references(() => users.id).notNull(),
  selectedUserIds: text("selected_user_ids").array().notNull(),
  numericAnswer: text("numeric_answer"), // Sayı tahmini modları için cevap
  selectedContentId: varchar("selected_content_id"), // "Hangisi Daha" modu için seçilen içerik
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
  contents: many(contentCache),
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

export const contentCacheRelations = relations(contentCache, ({ one }) => ({
  room: one(rooms, {
    fields: [contentCache.roomId],
    references: [rooms.id],
  }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  room: one(rooms, {
    fields: [rounds.roomId],
    references: [rooms.id],
  }),
  content: one(contentCache, {
    fields: [rounds.contentId],
    references: [contentCache.id],
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

export const insertContentSchema = createInsertSchema(contentCache).omit({
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

export type Content = typeof contentCache.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Round = typeof rounds.$inferSelect;
export type InsertRound = z.infer<typeof insertRoundSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

// Extended types for frontend
export type PlayerWithUser = RoomPlayer & { user: User };
export type RoomWithPlayers = Room & { players: PlayerWithUser[] };
export type RoundWithContent = Round & { content: Content | null };
