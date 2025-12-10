import { pgTable, text, serial, integer, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  farcasterFid: integer("farcaster_fid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// Player statistics table
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalScore: integer("total_score").default(0).notNull(),
  highScore: integer("high_score").default(0).notNull(),
  enemiesDestroyed: integer("enemies_destroyed").default(0).notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  timePlayedMinutes: integer("time_played_minutes").default(0).notNull(),
  streakDays: integer("streak_days").default(1).notNull(),
  maxStreak: integer("max_streak").default(1).notNull(),
  dailyLogins: integer("daily_logins").default(1).notNull(),
  socialShares: integer("social_shares").default(0).notNull(),
  friendsInvited: integer("friends_invited").default(0).notNull(),
  lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
  lastPlayedAt: timestamp("last_played_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game sessions for detailed tracking
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  enemiesKilled: integer("enemies_killed").notNull(),
  gameTime: integer("game_time").notNull(), // in milliseconds
  powerUpsCollected: integer("power_ups_collected").default(0).notNull(),
  accuracy: real("accuracy"), // percentage
  gameData: json("game_data"), // encrypted game state for validation
  isValid: boolean("is_valid").default(true).notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// High score schema for game leaderboard (keeping for compatibility)
export const highScores = pgTable("high_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  gameTime: integer("game_time").notNull(), // in milliseconds
  timestamp: text("timestamp").notNull(),
});

// Achievements tracking
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  rewardClaimed: boolean("reward_claimed").default(false).notNull(),
});

// Player rankings cache for performance
export const playerRankings = pgTable("player_rankings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  globalRank: integer("global_rank").notNull(),
  weeklyRank: integer("weekly_rank"),
  monthlyRank: integer("monthly_rank"),
  category: text("category").notNull(), // 'score', 'level', 'enemies', etc.
  value: integer("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  profilePicture: true,
  farcasterFid: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type HighScore = typeof highScores.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type PlayerRanking = typeof playerRankings.$inferSelect;

// Daily login tracking
export const dailyLogins = pgTable("daily_logins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loginDate: text("login_date").notNull(), // YYYY-MM-DD format
  loginCount: integer("login_count").default(1).notNull(),
  streakDay: integer("streak_day").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase history table
export const purchaseHistory = pgTable("purchase_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type").notNull(), // weapon, defense, upgrade
  price: integer("price").notNull(),
  currency: text("currency").default("STARMINT").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export type DailyLogin = typeof dailyLogins.$inferSelect;
export type PurchaseHistory = typeof purchaseHistory.$inferSelect;