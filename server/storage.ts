import { db } from "./db";
import { eq, desc, and, gte, lte, ilike, or, sql as drizzleSql, max } from "drizzle-orm";
import { 
  users, 
  playerStats, 
  gameSessions, 
  playerRankings,
  userAchievements,
  highScores,
  dailyLogins,
  purchaseHistory,
  swapHistory,
  swapPoints,
  pointsRedemptions,
  nftMints,
  nftMintRequests,
  nftStats,
  gamePointsHistory,
  gamePointsRedemptions,
  type User, 
  type InsertUser, 
  type HighScore,
  type PlayerStats,
  type GameSession,
  type PlayerRanking,
  type DailyLogin,
  type PurchaseHistory,
  type SwapHistory,
  type SwapPoints,
  type PointsRedemption,
  type InsertSwapHistory,
  type InsertSwapPoints,
  type NftMint,
  type NftMintRequest,
  type NftStats,
  type InsertNftMint,
  type InsertNftMintRequest,
  type GamePointsHistory,
  type GamePointsRedemption,
  type InsertGamePointsHistory,
  type InsertGamePointsRedemption
} from "@shared/schema";


export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFarcasterFid(farcasterFid: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveHighScore?(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void>;
  getLeaderboard?(limit: number): Promise<HighScore[]>;
  
  // Enhanced player data methods
  getPlayerStats(userId: number): Promise<PlayerStats | undefined>;
  updatePlayerStats(userId: number, stats: Partial<PlayerStats>): Promise<void>;
  saveGameSession(userId: number, sessionData: Omit<GameSession, 'id' | 'userId' | 'playedAt'>): Promise<void>;
  getPlayerRankings(userId: number): Promise<PlayerRanking[]>;
  getTopPlayers(category: string, timeframe?: 'daily' | 'weekly' | 'monthly' | 'all', limit?: number): Promise<any[]>;
  getPlayerProfile(userId: number): Promise<any>;
  searchPlayers(query: string, limit?: number): Promise<User[]>;
  updatePlayerRankings(): Promise<void>;
  
  // Daily login and purchase tracking
  handleDailyLogin(userId: number): Promise<{ streakDays: number; dailyLogins: number }>;
  savePurchase(userId: number, purchase: any): Promise<void>;
  getPurchaseHistory(userId: number, limit?: number): Promise<any[]>;
  
  // Swap system methods
  recordSwap(userId: number, swapData: Omit<InsertSwapHistory, 'userId'>): Promise<SwapHistory>;
  getSwapHistory(userId: number, limit?: number): Promise<SwapHistory[]>;
  getSwapPoints(userId: number): Promise<SwapPoints | undefined>;
  updateSwapPoints(userId: number, pointsToAdd: number, swapVolumeUsd: string): Promise<SwapPoints>;
  redeemPoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<PointsRedemption>;
  getPointsRedemptions(userId: number, limit?: number): Promise<PointsRedemption[]>;
  
  // Game points system methods
  calculateGamePoints(score: number, level: number, bonusMultiplier?: number): number;
  awardGamePoints(userId: number, gameSessionId: number, score: number, level: number, bonusMultiplier?: number, bonusReason?: string): Promise<GamePointsHistory>;
  getGamePointsHistory(userId: number, limit?: number): Promise<GamePointsHistory[]>;
  redeemGamePoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<GamePointsRedemption>;
  getGamePointsRedemptions(userId: number, limit?: number): Promise<GamePointsRedemption[]>;
  getGamePointsBalance(userId: number): Promise<{ available: number; total: number; redeemed: number }>;
}

// Database connection is imported from db.ts

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByFarcasterFid(farcasterFid: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.farcasterFid, farcasterFid)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    const newUser = result[0];
    
    // Initialize player stats for new user with game points fields
    await db.insert(playerStats).values({
      userId: newUser.id,
      totalScore: 0,
      highScore: 0,
      enemiesDestroyed: 0,
      gamesPlayed: 0,
      timePlayedMinutes: 0,
      streakDays: 1,
      socialShares: 0,
      friendsInvited: 0,
      gamePoints: 0,
      totalGamePoints: 0,
      pointsRedeemed: 0,
      bestSingleGameScore: 0,
    });
    
    return newUser;
  }

  async getPlayerStats(userId: number): Promise<PlayerStats | undefined> {
    const result = await db.select().from(playerStats).where(eq(playerStats.userId, userId)).limit(1);
    return result[0];
  }

  async updatePlayerStats(userId: number, stats: Partial<PlayerStats>): Promise<void> {
    await db.update(playerStats)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(playerStats.userId, userId));
  }

  async saveGameSession(userId: number, sessionData: Omit<GameSession, 'id' | 'userId' | 'playedAt'>): Promise<void> {
    // Calculate game points for this session
    const pointsEarned = this.calculateGamePoints(sessionData.score, sessionData.level);
    
    // Insert game session with points
    const [insertedSession] = await db.insert(gameSessions).values({
      userId,
      ...sessionData,
      pointsEarned,
    }).returning();
    
    // Update player stats
    const currentStats = await this.getPlayerStats(userId);
    if (currentStats) {
      const updatedStats: Partial<PlayerStats> = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        totalScore: currentStats.totalScore + sessionData.score,
        enemiesDestroyed: currentStats.enemiesDestroyed + sessionData.enemiesKilled,
        timePlayedMinutes: currentStats.timePlayedMinutes + Math.round(sessionData.gameTime / 60000),
        lastPlayedAt: new Date(),
        gamePoints: currentStats.gamePoints + pointsEarned,
        totalGamePoints: currentStats.totalGamePoints + pointsEarned,
      };
      
      // Update high score if new personal best
      if (sessionData.score > currentStats.highScore) {
        updatedStats.highScore = sessionData.score;
      }
      
      // Update best single game score if new record
      if (sessionData.score > currentStats.bestSingleGameScore) {
        updatedStats.bestSingleGameScore = sessionData.score;
      }
      
      await this.updatePlayerStats(userId, updatedStats);
      
      // Record points history
      if (insertedSession && pointsEarned > 0) {
        await this.awardGamePoints(userId, insertedSession.id, sessionData.score, sessionData.level);
      }
    }
  }

  async getPlayerRankings(userId: number): Promise<PlayerRanking[]> {
    return await db.select().from(playerRankings).where(eq(playerRankings.userId, userId));
  }

  async handleDailyLogin(userId: number): Promise<{ streakDays: number; dailyLogins: number }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check if user already logged in today
    const todayLogin = await db.select().from(dailyLogins)
      .where(and(eq(dailyLogins.userId, userId), eq(dailyLogins.loginDate, today)))
      .limit(1);
    
    if (todayLogin.length > 0) {
      // Already logged in today, return current streak
      const stats = await this.getPlayerStats(userId);
      return {
        streakDays: stats?.streakDays || 1,
        dailyLogins: stats?.dailyLogins || 1
      };
    }
    
    // Check yesterday's login for streak calculation
    const yesterdayLogin = await db.select().from(dailyLogins)
      .where(and(eq(dailyLogins.userId, userId), eq(dailyLogins.loginDate, yesterday)))
      .limit(1);
    
    const currentStats = await this.getPlayerStats(userId);
    let newStreak = 1;
    let newDailyLogins = (currentStats?.dailyLogins || 0) + 1;
    
    if (yesterdayLogin.length > 0) {
      // Continue streak
      newStreak = (currentStats?.streakDays || 1) + 1;
    }
    
    // Record today's login
    await db.insert(dailyLogins).values({
      userId,
      loginDate: today,
      loginCount: 1,
      streakDay: newStreak,
    });
    
    // Update player stats
    await this.updatePlayerStats(userId, {
      streakDays: newStreak,
      maxStreak: Math.max(currentStats?.maxStreak || 1, newStreak),
      dailyLogins: newDailyLogins,
      lastLoginAt: new Date(),
    });
    
    return { streakDays: newStreak, dailyLogins: newDailyLogins };
  }
  
  async savePurchase(userId: number, purchase: {
    itemId: number;
    itemName: string;
    itemType: string;
    price: number;
    currency: string;
  }): Promise<void> {
    await db.insert(purchaseHistory).values({
      userId,
      ...purchase,
    });
  }
  
  async getPurchaseHistory(userId: number, limit: number = 50): Promise<any[]> {
    return await db.select().from(purchaseHistory)
      .where(eq(purchaseHistory.userId, userId))
      .orderBy(desc(purchaseHistory.purchasedAt))
      .limit(limit);
  }

  async getTopPlayers(category: string = 'score', timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'all', limit: number = 10): Promise<any[]> {
    let dateFilter = undefined;
    const now = new Date();
    
    switch (timeframe) {
      case 'daily':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Determine sorting column based on category
    const getOrderColumn = (cat: string) => {
      switch (cat) {
        case 'gamePoints':
          return playerStats.totalGamePoints;
        case 'bestSingleGame':
          return playerStats.bestSingleGameScore;
        case 'totalScore':
          return playerStats.totalScore;
        case 'level':
          return playerStats.gamesPlayed;
        case 'enemies':
          return playerStats.enemiesDestroyed;
        case 'score':
        default:
          return playerStats.highScore;
      }
    };
    
    if (timeframe === 'all') {
      // Get overall rankings with all player stats fields
      return await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
          score: playerStats.highScore,
          totalScore: playerStats.totalScore,
          level: playerStats.gamesPlayed,
          enemiesDestroyed: playerStats.enemiesDestroyed,
          gamesPlayed: playerStats.gamesPlayed,
          timePlayedMinutes: playerStats.timePlayedMinutes,
          gamePoints: playerStats.totalGamePoints,
          bestSingleGameScore: playerStats.bestSingleGameScore,
        })
        .from(playerStats)
        .innerJoin(users, eq(playerStats.userId, users.id))
        .orderBy(desc(getOrderColumn(category)))
        .limit(limit);
    } else {
      // For time-based filtering with gamePoints or bestSingleGame, we need a different approach
      if (category === 'gamePoints' || category === 'bestSingleGame') {
        // Get aggregated data from game sessions within the timeframe
        const sessionData = await db
          .select({
            userId: users.id,
            username: users.username,
            displayName: users.displayName,
            profilePicture: users.profilePicture,
            totalPointsInPeriod: drizzleSql<number>`SUM(${gameSessions.pointsEarned})`,
            bestScoreInPeriod: drizzleSql<number>`MAX(${gameSessions.score})`,
            gamesInPeriod: drizzleSql<number>`COUNT(${gameSessions.id})`,
          })
          .from(gameSessions)
          .innerJoin(users, eq(gameSessions.userId, users.id))
          .where(dateFilter ? gte(gameSessions.playedAt, dateFilter) : undefined)
          .groupBy(users.id, users.username, users.displayName, users.profilePicture)
          .orderBy(
            category === 'gamePoints' 
              ? desc(drizzleSql<number>`SUM(${gameSessions.pointsEarned})`)
              : desc(drizzleSql<number>`MAX(${gameSessions.score})`)
          )
          .limit(limit);
        
        // Transform to match expected format
        return sessionData.map(row => ({
          userId: row.userId,
          username: row.username,
          displayName: row.displayName,
          profilePicture: row.profilePicture,
          score: category === 'bestSingleGame' ? row.bestScoreInPeriod : 0,
          gamePoints: row.totalPointsInPeriod || 0,
          bestSingleGameScore: row.bestScoreInPeriod || 0,
          gamesPlayed: row.gamesInPeriod || 0,
        }));
      }
      
      // Get time-based rankings from game sessions (standard categories)
      return await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
          score: gameSessions.score,
          level: gameSessions.level,
          enemiesKilled: gameSessions.enemiesKilled,
          gameTime: gameSessions.gameTime,
          playedAt: gameSessions.playedAt,
          pointsEarned: gameSessions.pointsEarned,
        })
        .from(gameSessions)
        .innerJoin(users, eq(gameSessions.userId, users.id))
        .where(dateFilter ? gte(gameSessions.playedAt, dateFilter) : undefined)
        .orderBy(desc(gameSessions.score))
        .limit(limit);
    }
  }

  async getPlayerProfile(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    const stats = await this.getPlayerStats(userId);
    const rankings = await this.getPlayerRankings(userId);
    
    // Get recent game sessions
    const recentSessions = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.playedAt))
      .limit(10);
      
    return {
      user,
      stats,
      rankings,
      recentSessions,
    };
  }

  async searchPlayers(query: string, limit: number = 20): Promise<User[]> {
    // Simple text search - in production you'd use full-text search
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.displayName, `%${query}%`)
        )
      )
      .limit(limit);
  }

  async updatePlayerRankings(): Promise<void> {
    // This would typically be run as a scheduled job
    // For now, we'll calculate rankings on-demand
    console.log('Player rankings updated');
  }

  async saveHighScore(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await db.insert(highScores).values({
      userId,
      ...scoreData,
    });
  }

  async getLeaderboard(limit: number = 10): Promise<HighScore[]> {
    return await db
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score), desc(highScores.level))
      .limit(limit);
  }

  // ========== SWAP SYSTEM METHODS ==========

  async recordSwap(userId: number, swapData: Omit<InsertSwapHistory, 'userId'>): Promise<SwapHistory> {
    const result = await db.insert(swapHistory).values({
      userId,
      ...swapData,
    }).returning();
    
    // Update swap points
    const pointsToAdd = swapData.pointsEarned || 0;
    await this.updateSwapPoints(userId, pointsToAdd, swapData.usdNotional);
    
    return result[0];
  }

  async getSwapHistory(userId: number, limit: number = 50): Promise<SwapHistory[]> {
    return await db.select()
      .from(swapHistory)
      .where(eq(swapHistory.userId, userId))
      .orderBy(desc(swapHistory.createdAt))
      .limit(limit);
  }

  async getSwapPoints(userId: number): Promise<SwapPoints | undefined> {
    const result = await db.select()
      .from(swapPoints)
      .where(eq(swapPoints.userId, userId))
      .limit(1);
    return result[0];
  }

  async updateSwapPoints(userId: number, pointsToAdd: number, swapVolumeUsd: string): Promise<SwapPoints> {
    const existingPoints = await this.getSwapPoints(userId);
    
    if (existingPoints) {
      const newTotalPoints = existingPoints.totalPoints + pointsToAdd;
      const newAvailablePoints = existingPoints.availablePoints + pointsToAdd;
      const newTotalVolume = (parseFloat(existingPoints.totalSwapVolumeUsd) + parseFloat(swapVolumeUsd)).toString();
      const newSwapCount = existingPoints.swapCount + 1;
      
      await db.update(swapPoints)
        .set({
          totalPoints: newTotalPoints,
          availablePoints: newAvailablePoints,
          totalSwapVolumeUsd: newTotalVolume,
          swapCount: newSwapCount,
          lastSwapAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(swapPoints.userId, userId));
      
      return (await this.getSwapPoints(userId))!;
    } else {
      const result = await db.insert(swapPoints).values({
        userId,
        totalPoints: pointsToAdd,
        pointsRedeemed: 0,
        availablePoints: pointsToAdd,
        totalSwapVolumeUsd: swapVolumeUsd,
        swapCount: 1,
        lastSwapAt: new Date(),
      }).returning();
      
      return result[0];
    }
  }

  async redeemPoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<PointsRedemption> {
    const currentPoints = await this.getSwapPoints(userId);
    
    if (!currentPoints || currentPoints.availablePoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }
    
    // Create redemption record
    const result = await db.insert(pointsRedemptions).values({
      userId,
      pointsRedeemed: pointsToRedeem,
      redemptionType,
      status: 'pending',
    }).returning();
    
    // Update available points
    await db.update(swapPoints)
      .set({
        availablePoints: currentPoints.availablePoints - pointsToRedeem,
        pointsRedeemed: currentPoints.pointsRedeemed + pointsToRedeem,
        updatedAt: new Date(),
      })
      .where(eq(swapPoints.userId, userId));
    
    return result[0];
  }

  async getPointsRedemptions(userId: number, limit: number = 50): Promise<PointsRedemption[]> {
    return await db.select()
      .from(pointsRedemptions)
      .where(eq(pointsRedemptions.userId, userId))
      .orderBy(desc(pointsRedemptions.createdAt))
      .limit(limit);
  }

  // ========== GAME POINTS SYSTEM METHODS ==========
  
  /**
   * Calculate game points from score with bonuses
   * Base conversion: 1 point per 100 score
   * Level bonus: +10% per level (max 200%)
   * Performance bonus multiplier applied on top
   */
  calculateGamePoints(score: number, level: number, bonusMultiplier: number = 1.0): number {
    if (score <= 0) return 0;
    
    // Base conversion rate: 1 point per 100 score
    const baseConversionRate = 0.01;
    
    // Level bonus: +10% per level (capped at 200% = level 20)
    const levelBonus = Math.min(1 + (level * 0.1), 3.0);
    
    // Calculate base points
    const basePoints = Math.floor(score * baseConversionRate * levelBonus);
    
    // Apply bonus multiplier (for achievements, streak bonuses, etc.)
    const finalPoints = Math.floor(basePoints * bonusMultiplier);
    
    return Math.max(1, finalPoints); // Minimum 1 point for any valid game
  }

  async awardGamePoints(
    userId: number, 
    gameSessionId: number, 
    score: number, 
    level: number, 
    bonusMultiplier: number = 1.0, 
    bonusReason?: string
  ): Promise<GamePointsHistory> {
    const pointsEarned = this.calculateGamePoints(score, level, bonusMultiplier);
    const conversionRate = 0.01; // Base rate
    
    const [history] = await db.insert(gamePointsHistory).values({
      userId,
      gameSessionId,
      scoreEarned: score,
      pointsEarned,
      conversionRate,
      bonusMultiplier,
      bonusReason,
    }).returning();
    
    return history;
  }

  async getGamePointsHistory(userId: number, limit: number = 50): Promise<GamePointsHistory[]> {
    return await db.select()
      .from(gamePointsHistory)
      .where(eq(gamePointsHistory.userId, userId))
      .orderBy(desc(gamePointsHistory.createdAt))
      .limit(limit);
  }

  async redeemGamePoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<GamePointsRedemption> {
    const stats = await this.getPlayerStats(userId);
    
    if (!stats || stats.gamePoints < pointsToRedeem) {
      throw new Error('Insufficient game points');
    }
    
    // Validate redemption type
    const validTypes = ['starmint_token', 'game_credits', 'nft_discount', 'power_ups'];
    if (!validTypes.includes(redemptionType)) {
      throw new Error('Invalid redemption type');
    }
    
    // Create redemption record
    const [redemption] = await db.insert(gamePointsRedemptions).values({
      userId,
      pointsRedeemed: pointsToRedeem,
      redemptionType,
      status: 'pending',
    }).returning();
    
    // Update player stats - deduct available points
    await this.updatePlayerStats(userId, {
      gamePoints: stats.gamePoints - pointsToRedeem,
      pointsRedeemed: stats.pointsRedeemed + pointsToRedeem,
    });
    
    return redemption;
  }

  async getGamePointsRedemptions(userId: number, limit: number = 50): Promise<GamePointsRedemption[]> {
    return await db.select()
      .from(gamePointsRedemptions)
      .where(eq(gamePointsRedemptions.userId, userId))
      .orderBy(desc(gamePointsRedemptions.createdAt))
      .limit(limit);
  }

  async getGamePointsBalance(userId: number): Promise<{ available: number; total: number; redeemed: number }> {
    const stats = await this.getPlayerStats(userId);
    
    if (!stats) {
      return { available: 0, total: 0, redeemed: 0 };
    }
    
    return {
      available: stats.gamePoints || 0,
      total: stats.totalGamePoints || 0,
      redeemed: stats.pointsRedeemed || 0,
    };
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private highScores: HighScore[];
  private playerStats: Map<number, PlayerStats>;
  private gameSessions: Map<number, GameSession[]>;
  currentId: number;
  currentStatsId: number;
  currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.highScores = [];
    this.playerStats = new Map();
    this.gameSessions = new Map();
    this.currentId = 1;
    this.currentStatsId = 1;
    this.currentSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByFarcasterFid(farcasterFid: number): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.farcasterFid === farcasterFid,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      displayName: null,
      profilePicture: null,
      farcasterFid: null,
      createdAt: now,
      lastActive: now
    };
    this.users.set(id, user);
    return user;
  }

  async getPlayerStats(userId: number): Promise<PlayerStats | undefined> {
    return this.playerStats.get(userId);
  }

  async updatePlayerStats(userId: number, stats: Partial<PlayerStats>): Promise<void> {
    const currentStats = this.playerStats.get(userId);
    if (currentStats) {
      this.playerStats.set(userId, { ...currentStats, ...stats, updatedAt: new Date() });
    } else {
      // Create new stats with game points fields
      const newStats: PlayerStats = {
        id: this.currentStatsId++,
        userId,
        totalScore: 0,
        highScore: 0,
        enemiesDestroyed: 0,
        gamesPlayed: 0,
        timePlayedMinutes: 0,
        streakDays: 1,
        maxStreak: 1,
        dailyLogins: 1,
        socialShares: 0,
        friendsInvited: 0,
        gamePoints: 0,
        totalGamePoints: 0,
        pointsRedeemed: 0,
        bestSingleGameScore: 0,
        lastLoginAt: new Date(),
        lastPlayedAt: null,
        updatedAt: new Date(),
        ...stats
      };
      this.playerStats.set(userId, newStats);
    }
  }

  async saveGameSession(userId: number, sessionData: Omit<GameSession, 'id' | 'userId' | 'playedAt'>): Promise<void> {
    const session: GameSession = {
      id: this.currentSessionId++,
      userId,
      playedAt: new Date(),
      ...sessionData
    };
    
    const userSessions = this.gameSessions.get(userId) || [];
    userSessions.push(session);
    this.gameSessions.set(userId, userSessions);
    
    // Update player stats
    const currentStats = this.playerStats.get(userId);
    if (currentStats) {
      const updatedStats = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        totalScore: currentStats.totalScore + sessionData.score,
        enemiesDestroyed: currentStats.enemiesDestroyed + sessionData.enemiesKilled,
        timePlayedMinutes: currentStats.timePlayedMinutes + Math.round(sessionData.gameTime / 60000),
        lastPlayedAt: new Date(),
      };
      
      if (sessionData.score > currentStats.highScore) {
        (updatedStats as any).highScore = sessionData.score;
      }
      
      await this.updatePlayerStats(userId, updatedStats);
    }
  }

  async getPlayerRankings(): Promise<PlayerRanking[]> {
    return [];
  }

  async getTopPlayers(): Promise<any[]> {
    return [];
  }

  async getPlayerProfile(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    const stats = await this.getPlayerStats(userId);
    const userSessions = this.gameSessions.get(userId) || [];
    
    return {
      user,
      stats,
      rankings: [],
      recentSessions: userSessions.slice(-10).reverse() // Last 10 sessions, newest first
    };
  }

  async searchPlayers(): Promise<User[]> {
    return [];
  }

  async updatePlayerRankings(): Promise<void> {
    // Mock implementation
  }

  async handleDailyLogin(userId: number): Promise<{ streakDays: number; dailyLogins: number }> {
    const stats = await this.getPlayerStats(userId);
    if (stats) {
      const newStreak = stats.streakDays + 1;
      const newDailyLogins = stats.dailyLogins + 1;
      
      await this.updatePlayerStats(userId, {
        streakDays: newStreak,
        maxStreak: Math.max(stats.maxStreak, newStreak),
        dailyLogins: newDailyLogins,
        lastLoginAt: new Date()
      });
      
      return { streakDays: newStreak, dailyLogins: newDailyLogins };
    }
    return { streakDays: 1, dailyLogins: 1 };
  }

  async savePurchase(): Promise<void> {
    // Mock implementation
  }

  async getPurchaseHistory(): Promise<any[]> {
    // Mock implementation
    return [];
  }

  async saveHighScore(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const highScore: HighScore = {
      id: this.highScores.length + 1,
      userId,
      ...scoreData
    };

    // Remove any existing score from this user for this session
    this.highScores = this.highScores.filter(score => 
      !(score.userId === userId && Math.abs(new Date(score.timestamp).getTime() - Date.now()) < 60000)
    );

    this.highScores.push(highScore);
  }

  async getLeaderboard(limit: number = 10): Promise<HighScore[]> {
    return this.highScores
      .sort((a, b) => {
        // Sort by score descending, then by level descending
        if (a.score !== b.score) return b.score - a.score;
        if (a.level !== b.level) return b.level - a.level;
        return a.gameTime - b.gameTime; // Faster time wins for same score/level
      })
      .slice(0, limit);
  }

  // Mock swap system methods
  async recordSwap(userId: number, swapData: any): Promise<SwapHistory> {
    return { id: 1, userId, ...swapData, createdAt: new Date() } as SwapHistory;
  }

  async getSwapHistory(userId: number, limit?: number): Promise<SwapHistory[]> {
    return [];
  }

  async getSwapPoints(userId: number): Promise<SwapPoints | undefined> {
    return undefined;
  }

  async updateSwapPoints(userId: number, pointsToAdd: number, swapVolumeUsd: string): Promise<SwapPoints> {
    return {
      id: 1,
      userId,
      totalPoints: pointsToAdd,
      pointsRedeemed: 0,
      availablePoints: pointsToAdd,
      totalSwapVolumeUsd: swapVolumeUsd,
      swapCount: 1,
      lastSwapAt: new Date(),
      updatedAt: new Date(),
    } as SwapPoints;
  }

  async redeemPoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<PointsRedemption> {
    return {
      id: 1,
      userId,
      pointsRedeemed: pointsToRedeem,
      starmintReceived: null,
      redemptionType,
      txHash: null,
      status: 'pending',
      createdAt: new Date(),
    } as PointsRedemption;
  }

  async getPointsRedemptions(userId: number, limit?: number): Promise<PointsRedemption[]> {
    return [];
  }

  // ========== GAME POINTS SYSTEM METHODS ==========
  
  calculateGamePoints(score: number, level: number, bonusMultiplier: number = 1.0): number {
    if (score <= 0) return 0;
    const baseConversionRate = 0.01;
    const levelBonus = Math.min(1 + (level * 0.1), 3.0);
    const basePoints = Math.floor(score * baseConversionRate * levelBonus);
    const finalPoints = Math.floor(basePoints * bonusMultiplier);
    return Math.max(1, finalPoints);
  }

  async awardGamePoints(
    userId: number, 
    gameSessionId: number, 
    score: number, 
    level: number, 
    bonusMultiplier: number = 1.0, 
    bonusReason?: string
  ): Promise<GamePointsHistory> {
    const pointsEarned = this.calculateGamePoints(score, level, bonusMultiplier);
    return {
      id: 1,
      userId,
      gameSessionId,
      scoreEarned: score,
      pointsEarned,
      conversionRate: 0.01,
      bonusMultiplier,
      bonusReason: bonusReason || null,
      createdAt: new Date(),
    } as GamePointsHistory;
  }

  async getGamePointsHistory(userId: number, limit?: number): Promise<GamePointsHistory[]> {
    return [];
  }

  async redeemGamePoints(userId: number, pointsToRedeem: number, redemptionType: string): Promise<GamePointsRedemption> {
    return {
      id: 1,
      userId,
      pointsRedeemed: pointsToRedeem,
      starmintReceived: null,
      redemptionType,
      txHash: null,
      status: 'pending',
      createdAt: new Date(),
    } as GamePointsRedemption;
  }

  async getGamePointsRedemptions(userId: number, limit?: number): Promise<GamePointsRedemption[]> {
    return [];
  }

  async getGamePointsBalance(userId: number): Promise<{ available: number; total: number; redeemed: number }> {
    const stats = await this.getPlayerStats(userId);
    return {
      available: stats?.gamePoints || 0,
      total: stats?.totalGamePoints || 0,
      redeemed: stats?.pointsRedeemed || 0,
    };
  }

  // ========== NFT MINTING METHODS ==========

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    // For now, search by username matching wallet address
    const result = await db.select().from(users).where(eq(users.username, walletAddress.toLowerCase())).limit(1);
    return result[0];
  }

  async createUserForWallet(walletAddress: string): Promise<User> {
    const result = await db.insert(users).values({
      username: walletAddress.toLowerCase(),
      password: 'wallet-auth', // Wallet users don't use password auth
      displayName: `Player ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    }).returning();
    
    const newUser = result[0];
    
    // Initialize player stats with game points fields
    await db.insert(playerStats).values({
      userId: newUser.id,
      totalScore: 0,
      highScore: 0,
      enemiesDestroyed: 0,
      gamesPlayed: 0,
      timePlayedMinutes: 0,
      streakDays: 1,
      socialShares: 0,
      friendsInvited: 0,
      gamePoints: 0,
      totalGamePoints: 0,
      pointsRedeemed: 0,
      bestSingleGameScore: 0,
    });
    
    return newUser;
  }

  async createNftMintRequest(data: InsertNftMintRequest): Promise<NftMintRequest> {
    const result = await db.insert(nftMintRequests).values(data).returning();
    return result[0];
  }

  async getNftMintRequestByNonce(nonce: string): Promise<NftMintRequest | undefined> {
    const result = await db.select().from(nftMintRequests).where(eq(nftMintRequests.nonce, nonce)).limit(1);
    return result[0];
  }

  async updateNftMintRequestStatus(nonce: string, status: string): Promise<void> {
    await db.update(nftMintRequests)
      .set({ status })
      .where(eq(nftMintRequests.nonce, nonce));
  }

  async recordNftMint(data: InsertNftMint): Promise<NftMint> {
    const result = await db.insert(nftMints).values(data).returning();
    return result[0];
  }

  async getUserNftMints(userId: number): Promise<NftMint[]> {
    return await db.select()
      .from(nftMints)
      .where(eq(nftMints.userId, userId))
      .orderBy(desc(nftMints.mintedAt));
  }

  async getNftStats(): Promise<NftStats | undefined> {
    const result = await db.select().from(nftStats).limit(1);
    if (result.length === 0) {
      // Initialize stats if not exists
      const initResult = await db.insert(nftStats).values({
        totalMinted: 0,
        totalFeesCollectedEth: '0',
        totalFeesCollectedUsd: '0',
        commonMinted: 0,
        uncommonMinted: 0,
        rareMinted: 0,
        epicMinted: 0,
        legendaryMinted: 0,
        highestScoreMinted: 0,
      }).returning();
      return initResult[0];
    }
    return result[0];
  }

  async updateNftStats(score: number, feeEth: string, feeUsd: string, rarity: string): Promise<void> {
    const currentStats = await this.getNftStats();
    if (!currentStats) return;

    const updates: Partial<NftStats> = {
      totalMinted: currentStats.totalMinted + 1,
      totalFeesCollectedEth: (parseFloat(currentStats.totalFeesCollectedEth) + parseFloat(feeEth)).toString(),
      totalFeesCollectedUsd: (parseFloat(currentStats.totalFeesCollectedUsd) + parseFloat(feeUsd)).toString(),
      highestScoreMinted: Math.max(currentStats.highestScoreMinted, score),
      updatedAt: new Date(),
    };

    // Update rarity counts
    switch (rarity) {
      case 'Common':
        updates.commonMinted = currentStats.commonMinted + 1;
        break;
      case 'Uncommon':
        updates.uncommonMinted = currentStats.uncommonMinted + 1;
        break;
      case 'Rare':
        updates.rareMinted = currentStats.rareMinted + 1;
        break;
      case 'Epic':
        updates.epicMinted = currentStats.epicMinted + 1;
        break;
      case 'Legendary':
        updates.legendaryMinted = currentStats.legendaryMinted + 1;
        break;
    }

    await db.update(nftStats)
      .set(updates)
      .where(eq(nftStats.id, currentStats.id));
  }
}

// Use DatabaseStorage for real database connectivity
export const storage = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
