import { Enemy } from './Enemy';

export type EnemyVariant = 'basic' | 'scout' | 'heavy' | 'bomber' | 'kamikaze';

export class EnemyScout extends Enemy {
  private dashTimer: number = 0;
  private dashCooldown: number = 180; // 3 seconds at 60fps
  private isDashing: boolean = false;
  
  constructor(x: number, y: number, level: number) {
    super(x, y, 20, 15, 2 + (level - 1) * 0.5); // Smaller, faster
    this.health = 1;
    this.dashTimer = Math.random() * 120; // Random initial cooldown
  }

  public update(canvasWidth: number, canvasHeight: number) {
    // Base movement
    super.update(canvasWidth, canvasHeight);
    
    // Dash behavior
    this.dashTimer++;
    if (this.dashTimer >= this.dashCooldown && !this.isDashing) {
      this.isDashing = true;
      this.speed *= 3; // Triple speed during dash
      this.dashTimer = 0;
      
      // Dash lasts for 1 second
      setTimeout(() => {
        this.isDashing = false;
        this.speed /= 3; // Return to normal speed
      }, 1000);
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Different color for scout - bright blue
    if (this.isDashing) {
      ctx.shadowColor = '#00AAFF';
      ctx.shadowBlur = 15;
    }
    
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Triangle shape for aerodynamic look
    ctx.fillStyle = '#0088CC';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 3, this.height / 4);
    ctx.lineTo(this.width / 3, this.height / 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export class EnemyHeavy extends Enemy {
  private shieldHealth: number;
  private maxShieldHealth: number;
  
  constructor(x: number, y: number, level: number) {
    super(x, y, 45, 35, 0.5 + (level - 1) * 0.2); // Larger, slower
    this.health = 3 + Math.floor(level / 2);
    this.shieldHealth = 2;
    this.maxShieldHealth = 2;
  }

  public takeDamage(damage: number): boolean {
    if (this.shieldHealth > 0) {
      this.shieldHealth -= damage;
      return false; // Still alive
    } else {
      this.health -= damage;
      return this.health <= 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Heavy enemy - dark red/brown
    ctx.fillStyle = '#AA2222';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Armor plating
    ctx.fillStyle = '#666666';
    ctx.fillRect(-this.width / 3, -this.height / 3, this.width * 2/3, this.height * 2/3);
    
    // Shield indicator
    if (this.shieldHealth > 0) {
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class EnemyBomber extends Enemy {
  private bombTimer: number = 0;
  private bombCooldown: number = 240; // 4 seconds
  
  constructor(x: number, y: number, level: number) {
    super(x, y, 35, 25, 1 + (level - 1) * 0.3); // Medium size and speed
    this.health = 2;
    this.bombTimer = Math.random() * 120; // Random initial timing
  }

  public update(canvasWidth: number, canvasHeight: number): {shouldBomb: boolean, bombX: number, bombY: number} {
    super.update(canvasWidth, canvasHeight);
    
    this.bombTimer++;
    const shouldBomb = this.bombTimer >= this.bombCooldown;
    
    if (shouldBomb) {
      this.bombTimer = 0;
      return {
        shouldBomb: true,
        bombX: this.x,
        bombY: this.y + this.height / 2
      };
    }
    
    return { shouldBomb: false, bombX: 0, bombY: 0 };
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Bomber - green/orange colors
    ctx.fillStyle = '#228822';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Bomb bay
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(-this.width / 4, this.height / 4, this.width / 2, this.height / 4);
    
    // Wings
    ctx.fillStyle = '#114411';
    ctx.fillRect(-this.width / 2 - 5, -this.height / 6, 5, this.height / 3);
    ctx.fillRect(this.width / 2, -this.height / 6, 5, this.height / 3);

    ctx.restore();
  }
}

export class EnemyKamikaze extends Enemy {
  private targetPlayerX: number = 0;
  private isCharging: boolean = false;
  private chargeSpeed: number = 4;
  
  constructor(x: number, y: number, level: number) {
    super(x, y, 25, 20, 1.5 + (level - 1) * 0.4); // Fast and aggressive
    this.health = 1;
  }

  public update(canvasWidth: number, canvasHeight: number, playerX?: number): void {
    if (playerX !== undefined) {
      this.targetPlayerX = playerX;
    }
    
    // If player is below, charge towards them
    if (this.y > canvasHeight / 3 && !this.isCharging) {
      this.isCharging = true;
    }
    
    if (this.isCharging) {
      // Move towards player
      const dx = this.targetPlayerX - this.x;
      const distance = Math.abs(dx);
      
      if (distance > 5) {
        this.x += (dx / distance) * this.chargeSpeed;
      }
      
      // Increase downward speed
      this.speed = this.chargeSpeed;
    }
    
    super.update(canvasWidth, canvasHeight);
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Kamikaze - bright red with warning effects
    if (this.isCharging) {
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 10;
    }
    
    ctx.fillStyle = '#FF2222';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Warning stripes
    ctx.fillStyle = '#FFFF00';
    for (let i = 0; i < 3; i++) {
      const stripeY = -this.height / 2 + (i * this.height / 3);
      ctx.fillRect(-this.width / 2, stripeY, this.width, 2);
    }
    
    // Thruster effect when charging
    if (this.isCharging) {
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(-this.width / 4, this.height / 2, this.width / 2, 8);
    }

    ctx.restore();
  }
}

export class EnemyFactory {
  public static createEnemy(variant: EnemyVariant, x: number, y: number, level: number): Enemy {
    switch (variant) {
      case 'scout':
        return new EnemyScout(x, y, level);
      case 'heavy':
        return new EnemyHeavy(x, y, level);
      case 'bomber':
        return new EnemyBomber(x, y, level);
      case 'kamikaze':
        return new EnemyKamikaze(x, y, level);
      case 'basic':
      default:
        return new Enemy(x, y, 30, 20, 1 + (level - 1) * 0.3);
    }
  }

  public static getRandomVariant(level: number): EnemyVariant {
    const variants: EnemyVariant[] = ['basic'];
    
    // Unlock new enemy types based on level
    if (level >= 2) variants.push('scout');
    if (level >= 3) variants.push('kamikaze');
    if (level >= 4) variants.push('bomber');
    if (level >= 5) variants.push('heavy');
    
    // Weight distribution (basic enemies become less common at higher levels)
    const weights = {
      basic: Math.max(0.5, 1 - level * 0.1),
      scout: level >= 2 ? 0.3 : 0,
      kamikaze: level >= 3 ? 0.2 : 0,
      bomber: level >= 4 ? 0.15 : 0,
      heavy: level >= 5 ? 0.1 : 0
    };
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const [variant, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return variant as EnemyVariant;
      }
    }
    
    return 'basic';
  }
}