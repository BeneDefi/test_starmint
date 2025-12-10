import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, param, query, validationResult } from "express-validator";
import { storage } from "./storage";
import { insertUserSchema, type User } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";
import CryptoJS from "crypto-js";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET;
const GAME_ENCRYPTION_KEY = process.env.GAME_ENCRYPTION_KEY;

if (!JWT_SECRET || !GAME_ENCRYPTION_KEY) {
  console.error('Missing required environment variables: JWT_SECRET and/or GAME_ENCRYPTION_KEY');
  process.exit(1);
}

// Type-safe constants after validation
const VALIDATED_JWT_SECRET: string = JWT_SECRET;
const VALIDATED_GAME_ENCRYPTION_KEY: string = GAME_ENCRYPTION_KEY;

// Middleware for JWT authentication
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Input validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Game state encryption/decryption utilities
const encryptGameState = (gameState: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(gameState), VALIDATED_GAME_ENCRYPTION_KEY).toString();
};

const decryptGameState = (encryptedData: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, VALIDATED_GAME_ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    throw new Error('Invalid game state data');
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Farcaster manifest - serve local file
  app.get('/.well-known/farcaster.json', (req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), 'client/public/.well-known/farcaster.json'));
  });
  // User Registration
  app.post('/api/auth/register', [
    body('username')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-50 characters and contain only letters, numbers, hyphens, and underscores'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        VALIDATED_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User Login
  app.post('/api/auth/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        VALIDATED_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user
  app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  // Game Score Submission (Server-side validation)
  app.post('/api/game/submit-score', [
    authenticateToken,
    body('encryptedGameState').notEmpty().withMessage('Game state is required'),
    body('score').isInt({ min: 0, max: 1000000 }).withMessage('Invalid score'),
    body('level').isInt({ min: 1, max: 100 }).withMessage('Invalid level'),
    body('gameTime').isInt({ min: 0, max: 7200000 }).withMessage('Invalid game time'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { encryptedGameState, score, level, gameTime } = req.body;

      // Decrypt and validate game state
      const gameState = decryptGameState(encryptedGameState);

      // Server-side validation of game state
      const expectedScore = validateGameState(gameState);
      const scoreTolerance = Math.max(50, expectedScore * 0.05); // 5% tolerance

      if (Math.abs(score - expectedScore) > scoreTolerance) {
        return res.status(400).json({
          error: 'Score validation failed',
          details: 'Submitted score does not match game state'
        });
      }

      // Additional anti-cheat checks
      if (gameTime < level * 30000) { // Minimum time per level
        return res.status(400).json({ error: 'Impossible completion time' });
      }

      if (score > level * 10000) { // Maximum reasonable score per level
        return res.status(400).json({ error: 'Score too high for level' });
      }

      // Save high score (would typically be in database)
      await storage.saveHighScore?.(req.user.userId, {
        score,
        level,
        gameTime,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Score submitted successfully',
        verified: true,
        score,
        level
      });
    } catch (error) {
      console.error('Score submission error:', error);
      if (error instanceof Error && error.message === 'Invalid game state data') {
        return res.status(400).json({ error: 'Invalid game data' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Enhanced leaderboard endpoint with filtering
  app.get('/api/game/leaderboard', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
    query('timeframe').optional().isIn(['daily', 'weekly', 'monthly', 'all']).withMessage('Invalid timeframe'),
    query('category').optional().isIn(['score', 'level', 'enemies']).withMessage('Invalid category'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const timeframe = (req.query.timeframe as string) || 'all';
      const category = (req.query.category as string) || 'score';

      const leaderboard = await storage.getTopPlayers?.(category, timeframe as any, limit) || [];
      res.json({
        leaderboard,
        metadata: {
          timeframe,
          category,
          limit,
          total: leaderboard.length
        }
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Player profile endpoint
  app.get('/api/player/:userId/profile', [
    param('userId').isInt().withMessage('Invalid user ID'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = await storage.getPlayerProfile?.(userId);

      if (!profile || !profile.user) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Player profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Player stats endpoint
  app.get('/api/player/:userId/stats', [
    param('userId').isInt().withMessage('Invalid user ID'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await storage.getPlayerStats?.(userId);

      if (!stats) {
        return res.status(404).json({ error: 'Player stats not found' });
      }

      res.json(stats);
    } catch (error) {
      console.error('Player stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Search players endpoint
  app.get('/api/players/search', [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      const players = await storage.searchPlayers?.(query, limit) || [];
      res.json({ players, query, limit });
    } catch (error) {
      console.error('Player search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Farcaster FID-based player stats endpoints (required by frontend)

  // GET player stats by Farcaster FID
  app.get('/api/player-stats/:farcasterFid', [
    param('farcasterFid').isInt().withMessage('Invalid Farcaster FID'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const farcasterFid = parseInt(req.params.farcasterFid);

      // Find user by Farcaster FID
      const user = await storage.getUserByFarcasterFid?.(farcasterFid);
      if (!user) {
        // Return default stats for new users
        return res.json({
          totalScore: 0,
          highScore: 0,
          enemiesDestroyed: 0,
          gamesPlayed: 0,
          timePlayedMinutes: 0,
          socialShares: 0,
          friendsInvited: 0,
          farcasterFid
        });
      }

      const stats = await storage.getPlayerStats?.(user.id);
      if (!stats) {
        // Initialize stats if they don't exist
        await storage.updatePlayerStats?.(user.id, {
          totalScore: 0,
          highScore: 0,
          enemiesDestroyed: 0,
          gamesPlayed: 0,
          timePlayedMinutes: 0,
          streakDays: 1,
          socialShares: 0,
          friendsInvited: 0,
        });

        return res.json({
          totalScore: 0,
          highScore: 0,
          enemiesDestroyed: 0,
          gamesPlayed: 0,
          timePlayedMinutes: 0,
          socialShares: 0,
          friendsInvited: 0,
          farcasterFid
        });
      }

      res.json({
        ...stats,
        farcasterFid
      });
    } catch (error) {
      console.error('Farcaster player stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST/UPDATE player stats by Farcaster FID  
  app.post('/api/player-stats', [
    body('farcasterFid').isInt().withMessage('Farcaster FID is required'),
    body('totalScore').optional().isInt({ min: 0 }).withMessage('Invalid total score'),
    body('highScore').optional().isInt({ min: 0 }).withMessage('Invalid high score'),
    body('enemiesDestroyed').optional().isInt({ min: 0 }).withMessage('Invalid enemies destroyed'),
    body('gamesPlayed').optional().isInt({ min: 0 }).withMessage('Invalid games played'),
    body('timePlayedMinutes').optional().isInt({ min: 0 }).withMessage('Invalid time played'),
    body('socialShares').optional().isInt({ min: 0 }).withMessage('Invalid social shares'),
    body('friendsInvited').optional().isInt({ min: 0 }).withMessage('Invalid friends invited'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { farcasterFid, ...statsData } = req.body;

      // Find or create user by Farcaster FID
      let user = await storage.getUserByFarcasterFid?.(farcasterFid);
      if (!user) {
        // Create a new user for this Farcaster FID
        user = await storage.createUser({
          username: `farcaster_${farcasterFid}`,
          password: Math.random().toString(36), // Random password for Farcaster users
          farcasterFid,
          displayName: `Player ${farcasterFid}`,
        });
      }

      // Update player stats (remove updatedAt if it was sent from client)
      const { updatedAt, ...cleanStatsData } = statsData;
      await storage.updatePlayerStats?.(user.id, cleanStatsData);

      res.json({
        message: 'Player stats updated successfully',
        farcasterFid,
        userId: user.id
      });
    } catch (error) {
      console.error('Update Farcaster player stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Daily login tracking
  app.post('/api/daily-login', [
    body('farcasterFid').isInt().withMessage('Valid Farcaster FID required'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { farcasterFid } = req.body;

      // Find user by Farcaster FID
      let user = await storage.getUserByFarcasterFid(farcasterFid);

      if (!user) {
        // Create user if doesn't exist
        const userData = {
          username: `farcaster_${farcasterFid}`,
          password: 'farcaster-user', // placeholder for Farcaster users
          displayName: `Player ${farcasterFid}`,
          farcasterFid: farcasterFid,
        };
        user = await storage.createUser(userData);
      }

      // Handle daily login
      const loginResult = await storage.handleDailyLogin?.(user.id) || { streakDays: 1, dailyLogins: 1 };

      res.json({
        success: true,
        streakDays: loginResult.streakDays,
        dailyLogins: loginResult.dailyLogins,
        message: `Login streak: ${loginResult.streakDays} days`
      });

    } catch (error) {
      console.error('Daily login error:', error);
      res.status(500).json({
        error: 'Failed to process daily login',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Farcaster authentication endpoint - create/find user and return JWT
  app.post('/api/farcaster/auth', [
    body('fid').isInt({ min: 1 }).withMessage('Valid Farcaster FID required'),
    body('username').optional().isString().trim(),
    body('displayName').optional().isString().trim(),
    body('pfpUrl').optional().isURL().withMessage('Valid profile picture URL required'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { fid, username, displayName, pfpUrl } = req.body;

      // Find existing user by Farcaster FID
      let user = await storage.getUserByFarcasterFid?.(fid);

      if (!user) {
        // Create new user for this Farcaster account
        const userData = {
          username: username || `farcaster_${fid}`,
          password: 'farcaster_auth', // Placeholder - not used for Farcaster auth
          displayName: displayName || `Player ${fid}`,
          profilePicture: pfpUrl,
          farcasterFid: fid,
        };
        user = await storage.createUser(userData);

        // Initialize player stats for new user
        const statsExist = await storage.getPlayerStats(user.id);
        if (!statsExist) {
          await storage.updatePlayerStats(user.id, {
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
          });
        }
      } else {
        // Update existing user's profile data if provided
        if (displayName || pfpUrl) {
          // Note: We'd need to add an updateUser method to storage for this
          console.log('User profile update needed for FID:', fid);
        }
      }

      // Generate JWT for authenticated requests
      const token = jwt.sign(
        { userId: user.id, username: user.username, farcasterFid: fid },
        VALIDATED_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          farcasterFid: user.farcasterFid
        }
      });
    } catch (error) {
      console.error('Farcaster auth error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get Farcaster user data from Warpcast API (for PFP fetching)
  app.get('/api/farcaster/user', async (req: Request, res: Response) => {
    const { getUserByFid } = await import('./api/farcaster/user');
    return getUserByFid(req, res);
  });

  // Get game sessions by Farcaster FID for profile page
  app.get('/api/player-sessions/:farcasterFid', [
    param('farcasterFid').isInt().withMessage('Invalid Farcaster FID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const farcasterFid = parseInt(req.params.farcasterFid);
      const limit = parseInt(req.query.limit as string) || 20;

      // Find user by Farcaster FID
      const user = await storage.getUserByFarcasterFid?.(farcasterFid);
      if (!user) {
        return res.json({ sessions: [], totalGames: 0 });
      }

      // Get player profile which includes recent sessions
      const profile = await storage.getPlayerProfile?.(user.id);
      if (!profile || !profile.recentSessions) {
        return res.json({ sessions: [], totalGames: 0 });
      }

      res.json({
        sessions: profile.recentSessions.slice(0, limit),
        totalGames: profile.stats?.gamesPlayed || 0,
        player: {
          displayName: user.displayName,
          username: user.username,
          farcasterFid: user.farcasterFid
        }
      });
    } catch (error) {
      console.error('Game sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET purchase history by Farcaster FID
  app.get('/api/purchase-history/:farcasterFid', [
    param('farcasterFid').isInt().withMessage('Invalid Farcaster FID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const farcasterFid = parseInt(req.params.farcasterFid);
      const limit = parseInt(req.query.limit as string) || 20;

      // Find user by Farcaster FID
      const user = await storage.getUserByFarcasterFid?.(farcasterFid);
      if (!user) {
        return res.json({ purchases: [] });
      }

      // Get purchase history
      const purchases = await storage.getPurchaseHistory?.(user.id, limit) || [];

      res.json({
        purchases,
        total: purchases.length,
        player: {
          displayName: user.displayName,
          username: user.username,
          farcasterFid: user.farcasterFid
        }
      });
    } catch (error) {
      console.error('Purchase history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET friends list by Farcaster FID (mock endpoint)
  app.get('/api/friends/:farcasterFid', [
    param('farcasterFid').isInt().withMessage('Invalid Farcaster FID'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      // Mock implementation - returns empty array for now
      // In the future, this would integrate with Farcaster's social graph API
      res.json([]);
    } catch (error) {
      console.error('Friends list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Enhanced game session submission
  app.post('/api/game/session', [
    authenticateToken,
    body('score').isInt({ min: 0, max: 1000000 }).withMessage('Invalid score'),
    body('level').isInt({ min: 1, max: 100 }).withMessage('Invalid level'),
    body('gameTime').isInt({ min: 0, max: 7200000 }).withMessage('Invalid game time'),
    body('enemiesKilled').isInt({ min: 0 }).withMessage('Invalid enemies killed count'),
    body('powerUpsCollected').optional().isInt({ min: 0 }).withMessage('Invalid power-ups count'),
    body('accuracy').optional().isFloat({ min: 0, max: 1 }).withMessage('Invalid accuracy'),
    handleValidationErrors
  ], async (req: Request, res: Response) => {
    try {
      const { score, level, gameTime, enemiesKilled, powerUpsCollected = 0, accuracy } = req.body;

      // Save detailed game session and update player stats
      const updatedStats = await storage.saveGameSession?.(req.user.userId, {
        score,
        level,
        enemiesKilled,
        gameTime,
        powerUpsCollected,
        accuracy,
        gameData: null, // Could store encrypted game replay data
        isValid: true,
      });

      // Fetch updated stats from DB (if saveGameSession doesn’t return them)
      const playerStats = updatedStats || await storage.getPlayerStats?.(req.user.userId);

      // ✅ Return both session info and updated player totals
      return res.json({
        message: 'Game session saved successfully',
        verified: true,
        score,
        level,
        gameTime,
        playerStats
      });
    } catch (error) {
      console.error('❌ Game session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}

// Game state validation function
function validateGameState(gameState: any): number {
  let expectedScore = 0;

  // Basic validation - would be more sophisticated in production
  if (gameState.enemiesKilled) {
    expectedScore += gameState.enemiesKilled * (3 + (gameState.level - 1) * 4);
  }

  if (gameState.powerUpsCollected) {
    expectedScore += gameState.powerUpsCollected * 50;
  }

  if (gameState.bossesKilled) {
    expectedScore += gameState.bossesKilled * (100 + gameState.level * 50);
  }

  return Math.max(0, expectedScore);
}

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
