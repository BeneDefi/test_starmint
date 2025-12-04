import { Player } from "./Player";
import { Enemy } from "./Enemy";
import { Bullet } from "./Bullet";
import { Particle } from "./Particle";
import { CollisionSystem } from "./CollisionSystem";
import { PowerUp } from "./PowerUp";
import { Boss, BossType } from "./Boss";
import { EnemyFactory, EnemyVariant, EnemyBomber, EnemyKamikaze } from "./EnemyTypes";
import { WeaponSystem } from "./WeaponSystems";
import { GameOptimizer } from "../performance/GameOptimizer";

export interface GameState {
  score: number;
  lives: number;
  level: number;
  enemiesKilled: number;
  levelProgress: number;
  gameOver: boolean;
  activePowerUps: string[];
  bossActive: boolean;
  bossHealth?: number;
  bossMaxHealth?: number;
  bossType?: BossType;
}

export class GameEngine {
  public player: Player;
  private enemies: Enemy[] = [];
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private collisionSystem: CollisionSystem;
  private weaponSystem: WeaponSystem;
  private boss: Boss | null = null;
  
  private score = 0;
  private lives = 3;
  private level = 1;
  private enemiesKilled = 0;
  private gameOver = false;
  
  // Level progression settings
  private readonly ENEMIES_PER_LEVEL = 10; // Enemies to kill to advance level
  
  // Dynamic difficulty settings (adjusted per level)
  private enemySpawnTimer = 0;
  private enemySpawnDelay = 120; // frames (gets faster each level)
  private readonly BASE_ENEMY_SPAWN_DELAY = 120;
  private readonly MIN_ENEMY_SPAWN_DELAY = 30;
  
  private playerFireTimer = 0;
  private playerFireDelay = 15; // frames
  
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  // Responsive bullet scaling
  private bulletScale: number = 1.0;
  
  // Performance tracking
  private lastFrameTime: number = 0;
  private starField: Array<{x: number, y: number, size: number}> = [];
  private frameCount: number = 0;
  
  // Power-up state tracking to prevent duration coupling
  private activePowerUpStates: Map<string, boolean> = new Map();

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    
    this.player = new Player(width / 2, height - 80, 60, 40);
    this.collisionSystem = new CollisionSystem();
    this.weaponSystem = new WeaponSystem();
    
    // Calculate initial bullet scale based on screen size
    this.updateBulletScale();
    
    // Initialize performance optimizer
    GameOptimizer.initialize();
    
    // Generate star field
    this.generateStarField();
    
    // Listen for touch controls
    window.addEventListener('playerMove', this.handlePlayerMove.bind(this));
  }

  private handlePlayerMove = (event: Event) => {
    const customEvent = event as CustomEvent;
    const position = customEvent.detail.position;
    // Map position 0-1 to full screen width (0 to canvasWidth)
    const targetX = position * this.width;
    console.log(`Touch position: ${position.toFixed(2)}, Target X: ${targetX.toFixed(1)}, Canvas width: ${this.width}`);
    this.player.setTargetPosition(targetX);
  };

  private updateBulletScale(): void {
    // Calculate responsive bullet scale based on screen size
    const shortSide = Math.min(this.width, this.height);
    // Base scale calculation: smaller screens get bigger bullets
    const baseScale = 720 / shortSide; // 720 is the baseline reference
    // Clamp the scale between 1.0 and 2.5 for optimal visibility
    this.bulletScale = Math.max(1.0, Math.min(2.5, baseScale));
    
    console.log(`Screen: ${this.width}x${this.height}, Short side: ${shortSide}, Bullet scale: ${this.bulletScale.toFixed(2)}`);
  }

  public getBulletScale(): number {
    return this.bulletScale;
  }

  public updateCanvasSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.updateBulletScale();
  }

  public reset() {
    // Reset player position instead of creating new player
    this.player.x = this.width / 2;
    this.player.y = this.height - 80;
    this.player.targetX = this.width / 2;
    this.player.moveLeft = false;
    this.player.moveRight = false;
    
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUps = [];
    this.boss = null;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemiesKilled = 0;
    this.gameOver = false;
    this.enemySpawnTimer = 0;
    this.playerFireTimer = 0;
    
    // Reset difficulty settings
    this.enemySpawnDelay = this.BASE_ENEMY_SPAWN_DELAY;
  }

  public update(): GameState {
    // Track performance
    const currentTime = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime;
      GameOptimizer.trackFrameTime(deltaTime);
    }
    this.lastFrameTime = currentTime;
    this.frameCount++;
    if (this.gameOver) {
      return { 
        score: this.score, 
        lives: this.lives, 
        level: this.level,
        enemiesKilled: this.enemiesKilled,
        levelProgress: (this.enemiesKilled % this.ENEMIES_PER_LEVEL) / this.ENEMIES_PER_LEVEL,
        gameOver: this.gameOver,
        activePowerUps: this.player.getActivePowerUps().map(p => p.type),
        bossActive: false
      };
    }

    // Check if boss should spawn (every 5 levels)
    if (this.level % 5 === 0 && !this.boss && this.enemies.length === 0) {
      const bossType = Boss.getBossTypeForLevel(this.level);
      this.boss = new Boss(this.width / 2, 100, bossType, this.level);
      
      // Dispatch boss spawn event for UI feedback
      window.dispatchEvent(new CustomEvent('bossSpawn', { 
        detail: { type: bossType, level: this.level } 
      }));
    }

    // Update player
    this.player.update(this.width, this.height);

    // Auto-fire player bullets using WeaponSystem
    this.weaponSystem.updateFireTimer();
    
    // Update weapon effects
    this.weaponSystem.updateWeaponEffects();
    
    // Update weapon targets for homing bullets
    this.weaponSystem.updateTargets(this.enemies);
    
    // Handle power-ups with edge-triggered state changes to prevent duration coupling
    const hasMultiShot = this.player.hasPowerUp('multi-shot');
    const wasMultiShotActive = this.activePowerUpStates.get('multi-shot') || false;
    
    if (hasMultiShot && !wasMultiShotActive) {
      // Just activated multi-shot - get remaining duration from player
      const multiShotEffect = this.player.getActivePowerUps().find(p => p.type === 'multi-shot');
      if (multiShotEffect) {
        const remainingTime = multiShotEffect.duration - (Date.now() - multiShotEffect.startTime);
        this.weaponSystem.setWeapon('spread', Math.max(0, remainingTime));
      }
    } else if (!hasMultiShot && wasMultiShotActive) {
      // Just deactivated multi-shot - revert to basic weapon
      this.weaponSystem.clearWeapon('spread');
    }
    this.activePowerUpStates.set('multi-shot', hasMultiShot);
    
    // Handle rapid-fire (immediate effect, no duration coupling)
    if (this.player.hasPowerUp('rapid-fire')) {
      this.weaponSystem.setFireRate(5); // Faster fire rate
    } else {
      this.weaponSystem.setFireRate(15); // Normal fire rate
    }
    
    // Fire bullets using WeaponSystem
    const bullets = this.weaponSystem.fire(this.player.x, this.player.y - this.player.height / 2, this.bulletScale);
    if (bullets.length > 0) {
      this.playerBullets.push(...bullets);
      
      // Play shoot sound
      window.dispatchEvent(new CustomEvent('playShootSound'));
      window.dispatchEvent(new CustomEvent('bulletFired'));
    }

    // Spawn enemies with level-based difficulty (only if no boss), respecting performance limits
    if (!this.boss) {
      // Slow-motion effect
      const spawnDelay = this.player.hasPowerUp('slow-motion') ? this.enemySpawnDelay * 2 : this.enemySpawnDelay;
      
      // Performance-based enemy limit
      const maxEnemies = GameOptimizer.getQualityLevel() === 'low' ? 8 : 
                         GameOptimizer.getQualityLevel() === 'medium' ? 12 : 16;
      
      this.enemySpawnTimer++;
      if (this.enemySpawnTimer >= spawnDelay && this.enemies.length < maxEnemies) {
        const x = Math.random() * (this.width - 60) + 30;
        
        // Use enemy factory to create varied enemy types
        const variant = EnemyFactory.getRandomVariant(this.level);
        const enemy = EnemyFactory.createEnemy(variant, x, -20, this.level);
        
        this.enemies.push(enemy);
        this.enemySpawnTimer = 0;
      }
    }
    
    // Update boss if active
    if (this.boss) {
      const bossResult = this.boss.update(this.width, this.height);
      
      // Add boss bullets to enemy bullets array
      for (const bullet of bossResult.bullets) {
        this.enemyBullets.push(new Bullet(
          bullet.x,
          bullet.y,
          bullet.vx,
          bullet.vy,
          7 * this.bulletScale,
          '#ff4444',
          'enemy'
        ));
      }
    }

    // Update enemies and their special behaviors
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Handle special enemy behaviors
      if (enemy instanceof EnemyBomber) {
        const bomberResult = enemy.update(this.width, this.height);
        if (bomberResult.shouldBomb) {
          // Create bombing pattern - multiple bullets in a spread
          for (let j = -1; j <= 1; j++) {
            this.enemyBullets.push(new Bullet(
              bomberResult.bombX + j * 15,
              bomberResult.bombY,
              j * 0.5,
              4 + (this.level - 1) * 0.3,
              6 * this.bulletScale,
              '#ff6600',
              'enemy'
            ));
          }
          window.dispatchEvent(new CustomEvent('playShootSound'));
        }
      } else if (enemy instanceof EnemyKamikaze) {
        enemy.update(this.width, this.height, this.player.x);
      } else {
        enemy.update(this.width, this.height);
      }

      // Remove enemies that are off-screen
      if (enemy.y > this.height + 50) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Standard enemy firing (not for bombers or kamikaze)
      if (!(enemy instanceof EnemyBomber) && !(enemy instanceof EnemyKamikaze)) {
        const enemyFireChance = 0.003 + (this.level - 1) * 0.002;
        if (Math.random() < enemyFireChance) {
          this.enemyBullets.push(new Bullet(
            enemy.x,
            enemy.y + enemy.height / 2,
            0,
            4 + (this.level - 1) * 0.5,
            5 * this.bulletScale,
            '#ff0000',
            'enemy'
          ));
          window.dispatchEvent(new CustomEvent('playShootSound'));
        }
      }
    }

    // Update bullets
    this.updateBullets(this.playerBullets);
    this.updateBullets(this.enemyBullets);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }

    // Update power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      this.powerUps[i].update();
      
      // Remove power-ups that are off-screen
      if (this.powerUps[i].y > this.height + 50) {
        this.powerUps.splice(i, 1);
      }
    }

    // Handle collisions
    this.handleCollisions();

    return { 
      score: this.score, 
      lives: this.lives, 
      level: this.level,
      enemiesKilled: this.enemiesKilled,
      levelProgress: (this.enemiesKilled % this.ENEMIES_PER_LEVEL) / this.ENEMIES_PER_LEVEL,
      gameOver: this.gameOver,
      activePowerUps: this.player.getActivePowerUps().map(p => p.type),
      bossActive: !!this.boss,
      bossHealth: this.boss?.health,
      bossMaxHealth: this.boss?.maxHealth,
      bossType: this.boss?.type
    };
  }

  private updateBullets(bullets: Bullet[]) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].update();
      
      // Remove bullets that are off-screen
      if (bullets[i].y < -10 || bullets[i].y > this.height + 10) {
        bullets.splice(i, 1);
      }
    }
  }

  private handleCollisions() {
    // Player bullets vs enemies
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (this.collisionSystem.checkCollision(bullet, enemy)) {
          // Create explosion particles
          this.createExplosion(enemy.x, enemy.y, '#ffff00');
          
          // Remove bullet
          this.playerBullets.splice(i, 1);
          
          // Damage enemy and check if destroyed
          const enemyDestroyed = enemy.takeDamage(1);
          
          if (enemyDestroyed) {
            // Remove enemy
            this.enemies.splice(j, 1);
            
            // Update score and enemy kill count (different points for different types)
            let points = 3 + (this.level - 1) * 4;
            
            // Bonus points for special enemies
            if (enemy.constructor.name.includes('Heavy')) points *= 3;
            else if (enemy.constructor.name.includes('Bomber')) points *= 2;
            else if (enemy.constructor.name.includes('Scout')) points *= 1.5;
            else if (enemy.constructor.name.includes('Kamikaze')) points *= 2;
            
            this.score += Math.floor(points);
            this.enemiesKilled++;
            
            // Check for level progression
            this.checkLevelProgression();
            
            // Higher chance for power-ups from special enemies
            const powerUpChance = enemy.constructor.name === 'Enemy' ? 0.15 : 0.25;
            if (Math.random() < powerUpChance) {
              const powerUpType = PowerUp.getRandomType();
              this.powerUps.push(new PowerUp(enemy.x, enemy.y, powerUpType));
            }
            
            // Dispatch enemy destroyed event
            window.dispatchEvent(new CustomEvent('enemyDestroyed'));
            window.dispatchEvent(new CustomEvent('enemyKilled'));
          }
          
          // Play hit sound
          window.dispatchEvent(new CustomEvent('playHitSound'));
          window.dispatchEvent(new CustomEvent('bulletHit'));
          break;
        }
      }
    }

    // Player bullets vs boss
    if (this.boss) {
      for (let i = this.playerBullets.length - 1; i >= 0; i--) {
        const bullet = this.playerBullets[i];
        
        if (this.collisionSystem.checkCollision(bullet, this.boss)) {
          // Create explosion particles
          this.createExplosion(bullet.x, bullet.y, '#ffaa00');
          
          // Remove bullet
          this.playerBullets.splice(i, 1);
          
          // Damage boss
          const bossDestroyed = this.boss.takeDamage(1);
          
          // Play hit sound
          window.dispatchEvent(new CustomEvent('playHitSound'));
          
          if (bossDestroyed) {
            // Create big explosion
            this.createBigExplosion(this.boss.x, this.boss.y);
            
            // Reward player
            this.score += 100 + (this.level * 20); // Big score bonus
            
            // Drop multiple power-ups
            for (let k = 0; k < 3; k++) {
              const powerUpType = PowerUp.getRandomType();
              this.powerUps.push(new PowerUp(
                this.boss.x + (Math.random() - 0.5) * 60,
                this.boss.y + (Math.random() - 0.5) * 40,
                powerUpType
              ));
            }
            
            // Remove boss and advance level
            this.boss = null;
            this.enemiesKilled = this.level * this.ENEMIES_PER_LEVEL; // Force level progression
            this.checkLevelProgression();
            
            // Dispatch boss defeated event
            window.dispatchEvent(new CustomEvent('bossDefeated', { 
              detail: { level: this.level, score: this.score } 
            }));
            window.dispatchEvent(new CustomEvent('playSuccessSound'));
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      
      if (this.collisionSystem.checkCollision(bullet, this.player)) {
        // Check if player is shielded
        if (this.player.isShielded) {
          // Shield absorbs the hit
          this.enemyBullets.splice(i, 1);
          this.createExplosion(bullet.x, bullet.y, '#00ffff');
          continue;
        }
        
        // Create explosion particles
        this.createExplosion(this.player.x, this.player.y, '#ff0000');
        
        // Remove bullet
        this.enemyBullets.splice(i, 1);
        
        // Reduce lives
        this.lives--;
        
        // Play hit sound and dispatch player hit event
        window.dispatchEvent(new CustomEvent('playHitSound'));
        window.dispatchEvent(new CustomEvent('playerHit'));
        
        if (this.lives <= 0) {
          this.gameOver = true;
        }
        break;
      }
    }

    // Enemies vs player
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (this.collisionSystem.checkCollision(enemy, this.player)) {
        // Create explosion particles
        this.createExplosion(enemy.x, enemy.y, '#ff8800');
        
        // Remove enemy
        this.enemies.splice(i, 1);
        
        // Reduce lives
        this.lives--;
        
        // Play hit sound and dispatch player hit event
        window.dispatchEvent(new CustomEvent('playHitSound'));
        window.dispatchEvent(new CustomEvent('playerHit'));
        
        if (this.lives <= 0) {
          this.gameOver = true;
        }
        break;
      }
    }

    // Power-ups vs player
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      
      if (this.collisionSystem.checkCollision(powerUp, this.player)) {
        // Apply power-up effect
        if (powerUp.type === 'extra-life') {
          this.lives++;
        } else {
          this.player.applyPowerUp(powerUp.type);
        }
        
        // Remove power-up
        this.powerUps.splice(i, 1);
        
        // Create collection particles
        this.createExplosion(powerUp.x, powerUp.y, powerUp.color);
        
        // Play success sound
        window.dispatchEvent(new CustomEvent('playSuccessSound'));
        window.dispatchEvent(new CustomEvent('powerUpCollected'));
        break;
      }
    }
  }

  private checkLevelProgression() {
    // Check if enough enemies killed to advance level
    if (this.enemiesKilled >= this.level * this.ENEMIES_PER_LEVEL) {
      this.level++;
      
      // Update difficulty settings for new level
      this.updateDifficulty();
      
      // Dispatch level up event for UI feedback
      window.dispatchEvent(new CustomEvent('levelUp', { 
        detail: { level: this.level, score: this.score } 
      }));
      
      // Play success sound
      window.dispatchEvent(new CustomEvent('playSuccessSound'));
    }
  }

  private updateDifficulty() {
    // Decrease spawn delay (increase spawn rate) but don't go below minimum
    this.enemySpawnDelay = Math.max(
      this.MIN_ENEMY_SPAWN_DELAY,
      this.BASE_ENEMY_SPAWN_DELAY - (this.level - 1) * 15
    );
  }

  private createExplosion(x: number, y: number, color: string) {
    // Respect particle limits based on performance
    if (GameOptimizer.shouldLimitParticles(this.particles.length)) {
      return;
    }
    
    // Dynamic particle count based on performance
    const baseCount = 8;
    const qualityMultiplier = GameOptimizer.getQualityLevel() === 'low' ? 0.25 : 
                             GameOptimizer.getQualityLevel() === 'medium' ? 0.5 : 1.0;
    const particleCount = Math.max(2, Math.floor(baseCount * qualityMultiplier));
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 3 + 2;
      const particle = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        30
      );
      this.particles.push(particle);
    }
  }

  private createBigExplosion(x: number, y: number) {
    // Create larger explosion for boss defeat, respecting performance limits
    if (GameOptimizer.shouldLimitParticles(this.particles.length)) {
      // Fall back to smaller explosion if at particle limit
      this.createExplosion(x, y, '#ff4400');
      return;
    }
    
    const baseCount = 20;
    const qualityMultiplier = GameOptimizer.getQualityLevel() === 'low' ? 0.3 : 
                             GameOptimizer.getQualityLevel() === 'medium' ? 0.6 : 1.0;
    const particleCount = Math.max(6, Math.floor(baseCount * qualityMultiplier));
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 5 + 3;
      const colors = ['#ff4400', '#ffaa00', '#ff0044', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 30,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        50
      ));
    }
  }

  public render() {
    // Skip frame if performance is poor
    if (GameOptimizer.shouldSkipFrame()) {
      return;
    }
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 20, 0.2)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render star field
    this.renderStars();

    // Render player
    this.player.render(this.ctx);

    // Render enemies
    this.enemies.forEach(enemy => enemy.render(this.ctx));
    
    // Render boss
    if (this.boss) {
      this.boss.render(this.ctx);
    }

    // Render bullets
    this.playerBullets.forEach(bullet => bullet.render(this.ctx));
    this.enemyBullets.forEach(bullet => bullet.render(this.ctx));

    // Render power-ups
    this.powerUps.forEach(powerUp => powerUp.render(this.ctx));

    // Render particles with batching for better performance
    if (GameOptimizer.getQualityLevel() === 'low') {
      GameOptimizer.batchRenderParticles(this.ctx, this.particles);
    } else {
      this.particles.forEach(particle => particle.render(this.ctx));
    }
  }

  private generateStarField() {
    this.starField = [];
    const starCount = GameOptimizer.getQualityLevel() === 'low' ? 25 : 50;
    for (let i = 0; i < starCount; i++) {
      this.starField.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.5
      });
    }
  }

  private renderStars() {
    this.ctx.fillStyle = '#ffffff';
    const scrollSpeed = this.player.hasPowerUp('slow-motion') ? 0.25 : 1;
    
    for (const star of this.starField) {
      star.y += scrollSpeed;
      if (star.y > this.height) {
        star.y = -5;
        star.x = Math.random() * this.width;
      }
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }
}
