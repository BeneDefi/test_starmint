import { db } from "./db";
import { eq, desc, and, gte, lte, ilike, or, sql as drizzleSql } from "drizzle-orm";
import { 
  users, 
  playerStats, 
  gameSessions, 
  playerRankings,
  userAchievements,
  highScores,
  dailyLogins,
  purchaseHistory,
  type User, 
  type InsertUser, 
  type HighScore,
  type PlayerStats,
  type GameSession,
  type PlayerRanking,
  type DailyLogin,
  type PurchaseHistory
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
    
    // Initialize player stats for new user
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
    await db.insert(gameSessions).values({
      userId,
      ...sessionData,
    });
    
    // Update player stats
    const currentStats = await this.getPlayerStats(userId);
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
    
    if (timeframe === 'all') {
      // Get overall rankings
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
        })
        .from(playerStats)
        .innerJoin(users, eq(playerStats.userId, users.id))
        .orderBy(desc(playerStats.highScore))
        .limit(limit);
    } else {
      // Get time-based rankings from game sessions
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
      // Create new stats
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
}

// Use DatabaseStorage for real database connectivity
export const storage = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
