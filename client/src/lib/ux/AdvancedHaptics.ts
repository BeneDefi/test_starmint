export class AdvancedHaptics {
    private static isSupported: boolean = false;
    private static isEnabled: boolean = true;
    private static intensity: number = 1.0;
    
    // Haptic pattern library
    private static patterns = {
      // Combat feedback
      weakHit: [30],
      strongHit: [80],
      criticalHit: [20, 20, 100],
      playerHit: [200],
      
      // UI feedback
      buttonPress: [10],
      menuOpen: [15, 10, 25],
      levelUp: [50, 50, 100, 50, 150],
      achievement: [30, 30, 30, 30, 100],
      
      // Game events
      enemyDestroyed: [40, 30, 60],
      powerUpCollected: [25, 25, 50],
      bossAppear: [100, 100, 200],
      gameOver: [300, 200, 100, 200, 100],
      
      // Weapons
      laserShot: [8],
      rapidFire: [5],
      chargedShot: [15, 10, 80],
      
      // Environment
      backgroundTension: [5, 995], // Very subtle, long interval
      warningPulse: [30, 50, 30],
      countdown: [50, 950] // One pulse per second
    };
  
    // Advanced haptic effects
    private static activePatterns: Map<string, NodeJS.Timeout> = new Map();
  
    public static initialize(): void {
      this.checkSupport();
      this.loadUserPreferences();
      console.log(`Haptic feedback ${this.isSupported ? 'supported' : 'not supported'}`);
    }
  
    private static checkSupport(): void {
      this.isSupported = 'vibrate' in navigator && 
                        typeof navigator.vibrate === 'function' &&
                        navigator.vibrate !== undefined;
                        
      // Enhanced detection for better haptic support
      if (this.isSupported) {
        // Test with a minimal vibration
        try {
          navigator.vibrate(1);
        } catch (error) {
          this.isSupported = false;
          console.warn('Haptic feedback disabled due to vibration test failure');
        }
      }
    }
  
    private static loadUserPreferences(): void {
      const saved = localStorage.getItem('haptic-preferences');
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          this.isEnabled = prefs.enabled ?? true;
          this.intensity = prefs.intensity ?? 1.0;
        } catch (error) {
          console.warn('Failed to load haptic preferences');
        }
      }
    }
  
    public static savePreferences(): void {
      const prefs = {
        enabled: this.isEnabled,
        intensity: this.intensity
      };
      localStorage.setItem('haptic-preferences', JSON.stringify(prefs));
    }
  
    public static setEnabled(enabled: boolean): void {
      this.isEnabled = enabled;
      this.savePreferences();
      
      if (!enabled) {
        this.stopAllPatterns();
      }
    }
  
    public static setIntensity(intensity: number): void {
      this.intensity = Math.max(0, Math.min(2, intensity));
      this.savePreferences();
    }
  
    // Basic haptic feedback
    public static vibrate(pattern: string | number[]): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      let vibratePattern: number[];
      
      if (typeof pattern === 'string') {
        vibratePattern = this.patterns[pattern as keyof typeof this.patterns] || [50];
      } else {
        vibratePattern = pattern;
      }
  
      // Apply intensity scaling
      const scaledPattern = vibratePattern.map((duration, index) => {
        // Only scale vibration durations (odd indices), not pauses (even indices)
        return index % 2 === 0 ? Math.round(duration * this.intensity) : duration;
      });
  
      try {
        navigator.vibrate(scaledPattern);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  
    // Advanced haptic patterns with timing
    public static startContinuousPattern(patternName: string, interval: number = 1000): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      this.stopPattern(patternName);
  
      const pattern = this.patterns[patternName as keyof typeof this.patterns];
      if (!pattern) return;
  
      const intervalId = setInterval(() => {
        this.vibrate(pattern);
      }, interval);
  
      this.activePatterns.set(patternName, intervalId);
    }
  
    public static stopPattern(patternName: string): void {
      const intervalId = this.activePatterns.get(patternName);
      if (intervalId) {
        clearInterval(intervalId);
        this.activePatterns.delete(patternName);
      }
    }
  
    public static stopAllPatterns(): void {
      this.activePatterns.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      this.activePatterns.clear();
      navigator.vibrate(0); // Stop any current vibration
    }
  
    // Context-aware haptic feedback
    public static contextualFeedback(event: string, intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      const intensityMultiplier = {
        light: 0.5,
        medium: 1.0,
        heavy: 1.5
      }[intensity];
  
      const originalIntensity = this.intensity;
      this.intensity = originalIntensity * intensityMultiplier;
  
      switch (event) {
        case 'enemy-hit-weak':
          this.vibrate('weakHit');
          break;
        case 'enemy-hit-strong':
          this.vibrate('strongHit');
          break;
        case 'enemy-destroyed':
          this.vibrate('enemyDestroyed');
          break;
        case 'player-hit':
          this.vibrate('playerHit');
          break;
        case 'player-shoot':
          this.vibrate('laserShot');
          break;
        case 'power-up':
          this.vibrate('powerUpCollected');
          break;
        case 'level-up':
          this.vibrate('levelUp');
          break;
        case 'boss-appear':
          this.vibrate('bossAppear');
          break;
        case 'game-over':
          this.vibrate('gameOver');
          break;
        case 'menu-select':
          this.vibrate('buttonPress');
          break;
        default:
          this.vibrate([50]);
      }
  
      this.intensity = originalIntensity;
    }
  
    // Adaptive haptics based on game state
    public static adaptiveGameFeedback(gameState: any): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      // Background tension based on enemy count and player health
      if (gameState.enemies > 10 && gameState.playerHealth < 30) {
        this.startContinuousPattern('backgroundTension', 2000);
      } else {
        this.stopPattern('backgroundTension');
      }
  
      // Warning pulse when health is critically low
      if (gameState.playerHealth <= 10) {
        this.startContinuousPattern('warningPulse', 1500);
      } else {
        this.stopPattern('warningPulse');
      }
  
      // Boss battle intensity
      if (gameState.bossActive) {
        // Increase base intensity during boss fights
        this.intensity = Math.min(2.0, this.intensity * 1.2);
      }
    }
  
    // Directional haptics (for devices that support it)
    public static directionalFeedback(direction: 'left' | 'right' | 'center', intensity: number = 50): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      // For devices without directional haptics, vary the pattern
      switch (direction) {
        case 'left':
          this.vibrate([intensity, 100, intensity * 0.5]);
          break;
        case 'right':
          this.vibrate([intensity * 0.5, 100, intensity]);
          break;
        case 'center':
          this.vibrate([intensity]);
          break;
      }
    }
  
    // Accessibility features
    public static accessibilityAlert(type: 'warning' | 'error' | 'success' | 'info'): void {
      if (!this.isSupported || !this.isEnabled) return;
  
      const patterns = {
        warning: [100, 100, 100],
        error: [200, 100, 200],
        success: [50, 50, 50, 50, 100],
        info: [75]
      };
  
      this.vibrate(patterns[type]);
    }
  
    public static getStatus() {
      return {
        supported: this.isSupported,
        enabled: this.isEnabled,
        intensity: this.intensity,
        activePatterns: Array.from(this.activePatterns.keys())
      };
    }
  }