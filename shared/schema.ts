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
  gamePoints: integer("game_points").default(0).notNull(),
  totalGamePoints: integer("total_game_points").default(0).notNull(),
  pointsRedeemed: integer("points_redeemed").default(0).notNull(),
  bestSingleGameScore: integer("best_single_game_score").default(0).notNull(),
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
  pointsEarned: integer("points_earned").default(0).notNull(),
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

// ========== GAME POINTS SYSTEM TABLES ==========

// Game points conversion history - tracks all score to points conversions
export const gamePointsHistory = pgTable("game_points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameSessionId: integer("game_session_id").references(() => gameSessions.id),
  scoreEarned: integer("score_earned").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  conversionRate: real("conversion_rate").notNull(),
  bonusMultiplier: real("bonus_multiplier").default(1.0).notNull(),
  bonusReason: text("bonus_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game points redemption history - tracks points to StarMint token conversions
export const gamePointsRedemptions = pgTable("game_points_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  pointsRedeemed: integer("points_redeemed").notNull(),
  starmintReceived: text("starmint_received"),
  redemptionType: text("redemption_type").notNull(),
  txHash: text("tx_hash"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GamePointsHistory = typeof gamePointsHistory.$inferSelect;
export type GamePointsRedemption = typeof gamePointsRedemptions.$inferSelect;

export const insertGamePointsHistorySchema = createInsertSchema(gamePointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertGamePointsRedemptionSchema = createInsertSchema(gamePointsRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertGamePointsHistory = z.infer<typeof insertGamePointsHistorySchema>;
export type InsertGamePointsRedemption = z.infer<typeof insertGamePointsRedemptionSchema>;

// ========== SWAP SYSTEM TABLES ==========

// Swap history table - tracks all token swaps
export const swapHistory = pgTable("swap_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  txHash: text("tx_hash").notNull().unique(),
  fromToken: text("from_token").notNull(), // ETH, USDC, STARMINT
  toToken: text("to_token").notNull(),
  amountIn: text("amount_in").notNull(), // Store as string to handle large numbers
  amountOut: text("amount_out").notNull(),
  usdNotional: text("usd_notional").notNull(), // USD value of the swap
  feePaid: text("fee_paid").notNull(), // Fee amount in input token
  pointsEarned: integer("points_earned").default(0).notNull(),
  chainId: integer("chain_id").default(8453).notNull(), // Base mainnet
  status: text("status").default("completed").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Swap points table - tracks accumulated points from swaps
export const swapPoints = pgTable("swap_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  pointsRedeemed: integer("points_redeemed").default(0).notNull(),
  availablePoints: integer("available_points").default(0).notNull(),
  totalSwapVolumeUsd: text("total_swap_volume_usd").default("0").notNull(),
  swapCount: integer("swap_count").default(0).notNull(),
  lastSwapAt: timestamp("last_swap_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Points redemption history
export const pointsRedemptions = pgTable("points_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  pointsRedeemed: integer("points_redeemed").notNull(),
  starmintReceived: text("starmint_received"), // Amount of STARMINT received (null until token launches)
  redemptionType: text("redemption_type").notNull(), // 'starmint_token', 'game_credits', etc.
  txHash: text("tx_hash"), // Transaction hash if on-chain redemption
  status: text("status").default("pending").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SwapHistory = typeof swapHistory.$inferSelect;
export type SwapPoints = typeof swapPoints.$inferSelect;
export type PointsRedemption = typeof pointsRedemptions.$inferSelect;

export const insertSwapHistorySchema = createInsertSchema(swapHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSwapPointsSchema = createInsertSchema(swapPoints).omit({
  id: true,
  updatedAt: true,
});

export const insertPointsRedemptionSchema = createInsertSchema(pointsRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertSwapHistory = z.infer<typeof insertSwapHistorySchema>;
export type InsertSwapPoints = z.infer<typeof insertSwapPointsSchema>;
export type InsertPointsRedemption = z.infer<typeof insertPointsRedemptionSchema>;

// ========== HIGH SCORE NFT SYSTEM TABLES ==========

// NFT minting records - tracks all high score NFT mints
export const nftMints = pgTable("nft_mints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenId: integer("token_id").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  enemiesDefeated: integer("enemies_defeated").notNull(),
  gameTime: integer("game_time").notNull(), // in milliseconds
  rarity: text("rarity").notNull(), // Common, Uncommon, Rare, Epic, Legendary
  screenshotHash: text("screenshot_hash"), // IPFS hash for screenshot verification
  mintFeeEth: text("mint_fee_eth").notNull(), // ETH amount paid for minting
  mintFeeUsd: text("mint_fee_usd").notNull(), // USD value at time of minting
  walletAddress: text("wallet_address").notNull(),
  chainId: integer("chain_id").default(8453).notNull(), // Base mainnet
  status: text("status").default("completed").notNull(), // pending, completed, failed
  metadataUri: text("metadata_uri"), // On-chain metadata URI
  externalUrl: text("external_url"), // Link to view score details
  mintedAt: timestamp("minted_at").defaultNow().notNull(),
});

// Pending mint requests (before on-chain confirmation)
export const nftMintRequests = pgTable("nft_mint_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameSessionId: integer("game_session_id").references(() => gameSessions.id),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  enemiesDefeated: integer("enemies_defeated").notNull(),
  gameTime: integer("game_time").notNull(),
  screenshotHash: text("screenshot_hash"),
  walletAddress: text("wallet_address").notNull(),
  nonce: text("nonce").notNull().unique(), // Unique nonce for signature
  signature: text("signature").notNull(), // Backend signature for verification
  expiresAt: timestamp("expires_at").notNull(), // Signature expiration
  status: text("status").default("pending").notNull(), // pending, used, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NFT collection stats
export const nftStats = pgTable("nft_stats", {
  id: serial("id").primaryKey(),
  totalMinted: integer("total_minted").default(0).notNull(),
  totalFeesCollectedEth: text("total_fees_collected_eth").default("0").notNull(),
  totalFeesCollectedUsd: text("total_fees_collected_usd").default("0").notNull(),
  commonMinted: integer("common_minted").default(0).notNull(),
  uncommonMinted: integer("uncommon_minted").default(0).notNull(),
  rareMinted: integer("rare_minted").default(0).notNull(),
  epicMinted: integer("epic_minted").default(0).notNull(),
  legendaryMinted: integer("legendary_minted").default(0).notNull(),
  highestScoreMinted: integer("highest_score_minted").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NftMint = typeof nftMints.$inferSelect;
export type NftMintRequest = typeof nftMintRequests.$inferSelect;
export type NftStats = typeof nftStats.$inferSelect;

export const insertNftMintSchema = createInsertSchema(nftMints).omit({
  id: true,
  mintedAt: true,
});

export const insertNftMintRequestSchema = createInsertSchema(nftMintRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertNftMint = z.infer<typeof insertNftMintSchema>;
export type InsertNftMintRequest = z.infer<typeof insertNftMintRequestSchema>;