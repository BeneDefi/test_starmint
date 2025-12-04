import CryptoJS from 'crypto-js';

export class GameSecurity {
  private static readonly ENCRYPTION_KEY = 'game-security-key-2024'; // Would be env var in production
  private static readonly INTEGRITY_KEY = 'integrity-check-key';
  
  // Anti-cheat timing validation
  private static gameStartTime: number = 0;
  private static lastActionTime: number = 0;
  private static actionCount: number = 0;
  
  // Game state integrity tracking
  private static stateChecksum: string = '';
  private static validationHistory: Array<{timestamp: number, score: number, level: number}> = [];

  public static startGameSession(): void {
    this.gameStartTime = Date.now();
    this.lastActionTime = this.gameStartTime;
    this.actionCount = 0;
    this.validationHistory = [];
    this.stateChecksum = this.generateChecksum({score: 0, level: 1, lives: 3});
  }

  public static validateAction(actionType: string): boolean {
    const now = Date.now();
    const timeSinceLastAction = now - this.lastActionTime;
    
    // Prevent impossibly fast actions (human reaction time limits)
    if (timeSinceLastAction < 16) { // 60fps limit
      console.warn('Action too fast, possible automation detected');
      return false;
    }
    
    // Track action frequency for bot detection
    this.actionCount++;
    const avgActionsPerSecond = this.actionCount / ((now - this.gameStartTime) / 1000);
    
    if (avgActionsPerSecond > 30) { // Unrealistic action rate
      console.warn('Excessive action rate detected');
      return false;
    }
    
    this.lastActionTime = now;
    return true;
  }

  public static validateGameState(gameState: any): boolean {
    // Check state progression logic
    const expectedChecksum = this.generateChecksum(gameState);
    
    // Validate score progression
    if (gameState.score < 0 || gameState.score > gameState.level * 15000) {
      console.warn('Invalid score for level');
      return false;
    }
    
    // Validate level progression
    if (gameState.level < 1 || gameState.level > 100) {
      console.warn('Invalid level');
      return false;
    }
    
    // Validate game time consistency
    const gameTime = Date.now() - this.gameStartTime;
    if (gameTime < gameState.level * 20000) { // Minimum time per level
      console.warn('Level completed too quickly');
      return false;
    }
    
    // Add to validation history
    this.validationHistory.push({
      timestamp: Date.now(),
      score: gameState.score,
      level: gameState.level
    });
    
    // Keep only last 10 entries
    if (this.validationHistory.length > 10) {
      this.validationHistory.shift();
    }
    
    this.stateChecksum = expectedChecksum;
    return true;
  }

  public static encryptGameState(gameState: any): string {
    const stateWithMetadata = {
      ...gameState,
      timestamp: Date.now(),
      sessionStart: this.gameStartTime,
      actionCount: this.actionCount,
      validationHistory: this.validationHistory,
      checksum: this.generateChecksum(gameState)
    };
    
    return CryptoJS.AES.encrypt(JSON.stringify(stateWithMetadata), this.ENCRYPTION_KEY).toString();
  }

  public static decryptGameState(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      
      // Validate integrity
      const expectedChecksum = this.generateChecksum({
        score: decryptedData.score,
        level: decryptedData.level,
        lives: decryptedData.lives
      });
      
      if (decryptedData.checksum !== expectedChecksum) {
        throw new Error('Game state integrity check failed');
      }
      
      return decryptedData;
    } catch (error) {
      throw new Error('Invalid or corrupted game state');
    }
  }

  private static generateChecksum(gameState: any): string {
    const stateString = JSON.stringify({
      score: gameState.score,
      level: gameState.level,
      lives: gameState.lives,
      timestamp: Math.floor(Date.now() / 10000) // 10-second resolution
    });
    
    return CryptoJS.HmacSHA256(stateString, this.INTEGRITY_KEY).toString();
  }

  public static detectAnomalies(): Array<string> {
    const anomalies: Array<string> = [];
    
    // Check for score jumps
    if (this.validationHistory.length >= 2) {
      const recent = this.validationHistory.slice(-2);
      const scoreDiff = recent[1].score - recent[0].score;
      const timeDiff = recent[1].timestamp - recent[0].timestamp;
      
      if (scoreDiff > 1000 && timeDiff < 5000) {
        anomalies.push('Unusual score increase detected');
      }
    }
    
    // Check for consistent performance (bot-like behavior)
    if (this.validationHistory.length >= 5) {
      const scores = this.validationHistory.slice(-5).map(h => h.score);
      const intervals = [];
      for (let i = 1; i < scores.length; i++) {
        intervals.push(scores[i] - scores[i-1]);
      }
      
      // Check if score increases are too consistent (low variance)
      const mean = intervals.reduce((a, b) => a + b) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
      
      if (variance < 10 && mean > 100) {
        anomalies.push('Suspiciously consistent performance detected');
      }
    }
    
    return anomalies;
  }
}