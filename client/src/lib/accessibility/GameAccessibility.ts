export class GameAccessibility {
    private static highContrast: boolean = false;
    private static reduceMotion: boolean = false;
    private static audioDescription: boolean = false;
    private static keyboardOnly: boolean = false;
    private static fontSize: number = 1.0;
    private static colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' = 'none';
    
    // Screen reader integration
    private static announcements: string[] = [];
    private static lastAnnouncement: number = 0;
  
    public static initialize(): void {
      this.detectUserPreferences();
      this.loadSavedSettings();
      this.setupScreenReader();
      this.setupKeyboardNavigation();
      console.log('Accessibility features initialized');
    }
  
    private static detectUserPreferences(): void {
      // Detect system preferences
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.reduceMotion = true;
      }
  
      if (window.matchMedia('(prefers-contrast: high)').matches) {
        this.highContrast = true;
      }
  
      // Listen for changes
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', (e) => {
          this.reduceMotion = e.matches;
          this.applySettings();
        });
  
      window.matchMedia('(prefers-contrast: high)')
        .addEventListener('change', (e) => {
          this.highContrast = e.matches;
          this.applySettings();
        });
    }
  
    private static loadSavedSettings(): void {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          this.highContrast = settings.highContrast ?? this.highContrast;
          this.reduceMotion = settings.reduceMotion ?? this.reduceMotion;
          this.audioDescription = settings.audioDescription ?? false;
          this.keyboardOnly = settings.keyboardOnly ?? false;
          this.fontSize = settings.fontSize ?? 1.0;
          this.colorBlindMode = settings.colorBlindMode ?? 'none';
        } catch (error) {
          console.warn('Failed to load accessibility settings');
        }
      }
      this.applySettings();
    }
  
    private static saveSettings(): void {
      const settings = {
        highContrast: this.highContrast,
        reduceMotion: this.reduceMotion,
        audioDescription: this.audioDescription,
        keyboardOnly: this.keyboardOnly,
        fontSize: this.fontSize,
        colorBlindMode: this.colorBlindMode
      };
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }
  
    private static applySettings(): void {
      const root = document.documentElement;
      
      // High contrast mode
      root.classList.toggle('high-contrast', this.highContrast);
      
      // Reduced motion
      root.classList.toggle('reduce-motion', this.reduceMotion);
      
      // Font size scaling
      root.style.setProperty('--font-scale', this.fontSize.toString());
      
      // Color blind mode
      root.setAttribute('data-color-blind-mode', this.colorBlindMode);
      
      // Keyboard only mode
      root.classList.toggle('keyboard-only', this.keyboardOnly);
    }
  
    private static setupScreenReader(): void {
      // Create live region for announcements
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
      `;
      document.body.appendChild(liveRegion);
  
      // Announce game events
      setInterval(() => {
        if (this.announcements.length > 0) {
          const announcement = this.announcements.shift();
          if (announcement) {
            liveRegion.textContent = announcement;
          }
        }
      }, 1000);
    }
  
    private static setupKeyboardNavigation(): void {
      document.addEventListener('keydown', (e) => {
        // Enable keyboard-only mode on tab usage
        if (e.key === 'Tab') {
          this.keyboardOnly = true;
          this.applySettings();
        }
  
        // Game-specific keyboard shortcuts
        if (e.altKey) {
          switch (e.key) {
            case '1':
              e.preventDefault();
              this.announceGameState();
              break;
            case '2':
              e.preventDefault();
              this.announcePlayerStatus();
              break;
            case '3':
              e.preventDefault();
              this.announceEnemyStatus();
              break;
          }
        }
      });
  
      // Disable keyboard-only mode on mouse usage
      document.addEventListener('mousedown', () => {
        this.keyboardOnly = false;
        this.applySettings();
      });
    }
  
    // Public API methods
    public static setHighContrast(enabled: boolean): void {
      this.highContrast = enabled;
      this.applySettings();
      this.saveSettings();
    }
  
    public static setReduceMotion(enabled: boolean): void {
      this.reduceMotion = enabled;
      this.applySettings();
      this.saveSettings();
    }
  
    public static setAudioDescription(enabled: boolean): void {
      this.audioDescription = enabled;
      this.saveSettings();
    }
  
    public static setFontSize(scale: number): void {
      this.fontSize = Math.max(0.5, Math.min(2.0, scale));
      this.applySettings();
      this.saveSettings();
    }
  
    public static setColorBlindMode(mode: typeof this.colorBlindMode): void {
      this.colorBlindMode = mode;
      this.applySettings();
      this.saveSettings();
    }
  
    // Game-specific accessibility features
    public static announceToScreenReader(message: string): void {
      const now = Date.now();
      if (now - this.lastAnnouncement > 500) { // Prevent spam
        this.announcements.push(message);
        this.lastAnnouncement = now;
      }
    }
  
    public static announceGameState(): void {
      // This would integrate with the game state
      this.announceToScreenReader('Game state information requested');
    }
  
    public static announcePlayerStatus(): void {
      this.announceToScreenReader('Player status information requested');
    }
  
    public static announceEnemyStatus(): void {
      this.announceToScreenReader('Enemy status information requested');
    }
  
    public static announceScore(score: number): void {
      if (this.audioDescription) {
        this.announceToScreenReader(`Score: ${score}`);
      }
    }
  
    public static announceLevel(level: number): void {
      if (this.audioDescription) {
        this.announceToScreenReader(`Level ${level} started`);
      }
    }
  
    public static announceEnemyDestroyed(): void {
      if (this.audioDescription) {
        this.announceToScreenReader('Enemy destroyed');
      }
    }
  
    public static announcePowerUp(type: string): void {
      if (this.audioDescription) {
        this.announceToScreenReader(`Power-up collected: ${type}`);
      }
    }
  
    public static announcePlayerHit(): void {
      if (this.audioDescription) {
        this.announceToScreenReader('Player hit, health decreased');
      }
    }
  
    public static announceGameOver(score: number): void {
      this.announceToScreenReader(`Game over. Final score: ${score}`);
    }
  
    // Color blind accessibility
    public static getColorBlindSafeColor(originalColor: string, type: 'enemy' | 'player' | 'powerup' | 'ui'): string {
      if (this.colorBlindMode === 'none') return originalColor;
  
      const colorMaps = {
        protanopia: {
          '#ff0000': '#ffaa00', // Red to Orange
          '#00ff00': '#0099ff', // Green to Blue
          '#ff00ff': '#aa00ff', // Magenta to Purple
        },
        deuteranopia: {
          '#ff0000': '#ff6600', // Red to Orange-Red
          '#00ff00': '#0066ff', // Green to Blue
          '#ffff00': '#ffcc00', // Yellow to Gold
        },
        tritanopia: {
          '#0000ff': '#00cccc', // Blue to Cyan
          '#ffff00': '#ff6666', // Yellow to Pink
          '#00ff00': '#00cc99', // Green to Teal
        }
      };
  
      const colorMap = colorMaps[this.colorBlindMode];
      return colorMap[originalColor] || originalColor;
    }
  
    // Pattern-based accessibility for motion-sensitive users
    public static shouldUseReducedMotion(): boolean {
      return this.reduceMotion;
    }
  
    public static getMotionScale(): number {
      return this.reduceMotion ? 0.2 : 1.0;
    }
  
    // Focus management for keyboard users
    public static manageFocus(element: HTMLElement): void {
      if (this.keyboardOnly) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  
    // High contrast mode utilities
    public static isHighContrastMode(): boolean {
      return this.highContrast;
    }
  
    public static getContrastColor(baseColor: string): string {
      if (!this.highContrast) return baseColor;
  
      // Convert to high contrast equivalent
      const contrastMap: { [key: string]: string } = {
        '#ffffff': '#000000',
        '#000000': '#ffffff',
        '#ff0000': '#ffff00', // Red to Yellow
        '#00ff00': '#00ffff', // Green to Cyan
        '#0000ff': '#ffffff', // Blue to White
      };
  
      return contrastMap[baseColor] || baseColor;
    }
  
    public static getSettings() {
      return {
        highContrast: this.highContrast,
        reduceMotion: this.reduceMotion,
        audioDescription: this.audioDescription,
        keyboardOnly: this.keyboardOnly,
        fontSize: this.fontSize,
        colorBlindMode: this.colorBlindMode
      };
    }
  }