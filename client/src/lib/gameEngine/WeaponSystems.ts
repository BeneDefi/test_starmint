import { Bullet, BulletSize, BulletEffectType } from './Bullet';
import { Particle } from './Particle';

export type WeaponType = 'basic' | 'laser' | 'spread' | 'homing' | 'plasma' | 'explosive' | 'piercing' | 'bouncing' | 'splitting' | 'energy' | 'charged' | 'ultimate';

export interface WeaponEffect {
  type: WeaponType;
  duration: number; // in milliseconds
  isActive: boolean;
  startTime: number;
  ammo?: number; // For limited ammo weapons
}

export class WeaponSystem {
  private currentWeapon: WeaponType = 'basic';
  private weaponEffects: Map<WeaponType, WeaponEffect> = new Map();
  private fireTimer: number = 0;
  private homeTargets: Array<{x: number, y: number}> = [];
  private fireRate: number = 15; // Default fire rate

  public setWeapon(weapon: WeaponType, duration: number = 10000, ammo?: number) {
    const currentTime = Date.now();
    
    this.weaponEffects.set(weapon, {
      type: weapon,
      duration,
      isActive: true,
      startTime: currentTime,
      ammo: ammo
    });
    
    this.currentWeapon = weapon;
  }

  public getCurrentWeapon(): WeaponType {
    this.updateWeaponEffects();
    return this.currentWeapon;
  }

  public updateWeaponEffects() {
    const currentTime = Date.now();
    
    Array.from(this.weaponEffects.entries()).forEach(([weaponType, effect]) => {
      if (effect.isActive) {
        // Check if weapon has expired
        if (currentTime - effect.startTime > effect.duration) {
          effect.isActive = false;
          if (this.currentWeapon === weaponType) {
            this.currentWeapon = 'basic';
          }
        }
        
        // Check if ammo depleted
        if (effect.ammo !== undefined && effect.ammo <= 0) {
          effect.isActive = false;
          if (this.currentWeapon === weaponType) {
            this.currentWeapon = 'basic';
          }
        }
      }
    });
  }

  public updateTargets(enemies: Array<{x: number, y: number}>) {
    this.homeTargets = enemies;
  }

  public setFireRate(rate: number) {
    this.fireRate = rate;
  }

  public clearWeapon(weaponType?: WeaponType) {
    if (weaponType) {
      const effect = this.weaponEffects.get(weaponType);
      if (effect) {
        effect.isActive = false;
      }
      if (this.currentWeapon === weaponType) {
        this.currentWeapon = 'basic';
      }
    } else {
      // Clear current weapon
      this.currentWeapon = 'basic';
    }
  }

  public updateFireTimer() {
    this.fireTimer++;
  }

  public canFire(fireDelay: number): boolean {
    // Different fire rates for different weapons
    const weaponFireDelay = this.getWeaponFireDelay(fireDelay);
    
    if (this.fireTimer >= weaponFireDelay) {
      this.fireTimer = 0;
      return true;
    }
    return false;
  }

  private getWeaponFireDelay(baseDelay: number): number {
    switch (this.currentWeapon) {
      case 'laser':
        return Math.floor(baseDelay * 0.3); // Very fast
      case 'spread':
        return Math.floor(baseDelay * 1.5); // Slower
      case 'homing':
        return Math.floor(baseDelay * 2); // Much slower
      case 'plasma':
        return Math.floor(baseDelay * 0.8); // Slightly faster
      case 'explosive':
        return Math.floor(baseDelay * 2.5); // Slow for balance
      case 'piercing':
        return Math.floor(baseDelay * 0.7); // Fast
      case 'bouncing':
        return Math.floor(baseDelay * 1.2); // Slightly slower
      case 'splitting':
        return Math.floor(baseDelay * 1.8); // Slower
      case 'energy':
        return Math.floor(baseDelay * 1.0); // Standard
      case 'charged':
        return Math.floor(baseDelay * 3); // Very slow, high damage
      case 'ultimate':
        return Math.floor(baseDelay * 6); // Extremely slow, devastating
      case 'basic':
      default:
        return baseDelay;
    }
  }

  public fire(playerX: number, playerY: number, bulletScale: number = 1.0): Bullet[] {
    if (!this.canFire(this.fireRate)) return [];

    const bullets: Bullet[] = [];
    
    // Consume ammo if applicable
    const currentEffect = this.weaponEffects.get(this.currentWeapon);
    if (currentEffect && currentEffect.ammo !== undefined) {
      currentEffect.ammo--;
    }

    switch (this.currentWeapon) {
      case 'basic':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -8,
          7 * bulletScale,
          '#00ff00',
          'player',
          'medium',
          'basic'
        ));
        break;

      case 'laser':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -12,
          4 * bulletScale,
          '#ff00ff',
          'player',
          'small',
          'piercing'
        ));
        break;

      case 'spread':
        const spreadAngles = [-0.6, -0.3, 0, 0.3, 0.6];
        for (const angle of spreadAngles) {
          bullets.push(new Bullet(
            playerX + Math.sin(angle) * 10,
            playerY - 20,
            Math.sin(angle) * 4,
            -8 * Math.cos(angle),
            6 * bulletScale,
            '#ffaa00',
            'player',
            'small',
            'basic'
          ));
        }
        break;

      case 'homing':
        if (this.homeTargets.length > 0) {
          const target = this.homeTargets[Math.floor(Math.random() * this.homeTargets.length)];
          const dx = target.x - playerX;
          const dy = target.y - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            bullets.push(new HomingBullet(
              playerX,
              playerY - 20,
              (dx / distance) * 6,
              (dy / distance) * 6,
              8 * bulletScale,
              '#00ffff',
              'player',
              target
            ));
          }
        } else {
          bullets.push(new Bullet(
            playerX,
            playerY - 20,
            0,
            -6,
            8 * bulletScale,
            '#00ffff',
            'player',
            'medium',
            'basic'
          ));
        }
        break;

      case 'plasma':
        bullets.push(new PlasmaBullet(
          playerX,
          playerY - 20,
          0,
          -5,
          14 * bulletScale,
          '#00ff88',
          'player'
        ));
        break;

      case 'explosive':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -7,
          10 * bulletScale,
          '#ff4400',
          'player',
          'large',
          'explosive'
        ));
        break;

      case 'piercing':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -10,
          6 * bulletScale,
          '#ffffff',
          'player',
          'small',
          'piercing'
        ));
        break;

      case 'bouncing':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          Math.random() * 4 - 2,
          -6,
          8 * bulletScale,
          '#00aaff',
          'player',
          'medium',
          'bouncing'
        ));
        break;

      case 'splitting':
        bullets.push(new SplittingBullet(
          playerX,
          playerY - 20,
          0,
          -8,
          9 * bulletScale,
          '#aa00ff',
          'player'
        ));
        break;

      case 'energy':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -9,
          8 * bulletScale,
          '#00ffaa',
          'player',
          'medium',
          'energy'
        ));
        break;

      case 'charged':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -6,
          12 * bulletScale,
          '#ffff00',
          'player',
          'large',
          'charged'
        ));
        break;

      case 'ultimate':
        // Screen-clearing ultimate weapon
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -4,
          20 * bulletScale,
          '#ff00ff',
          'player',
          'massive',
          'ultimate'
        ));
        // Add side projectiles
        for (let i = -2; i <= 2; i++) {
          if (i !== 0) {
            bullets.push(new Bullet(
              playerX + i * 30,
              playerY - 10,
              i * 2,
              -6,
              8 * bulletScale,
              '#ff00ff',
              'player',
              'medium',
              'energy'
            ));
          }
        }
        break;
    }

    return bullets;
  }

  public getWeaponDescription(weapon: WeaponType): string {
    switch (weapon) {
      case 'laser':
        return 'High-speed piercing laser beam';
      case 'spread':
        return 'Five-way spread shot';
      case 'homing':
        return 'Auto-targeting missiles';
      case 'plasma':
        return 'Devastating plasma cannon';
      case 'explosive':
        return 'Area-damage explosive rounds';
      case 'piercing':
        return 'Armor-penetrating bullets';
      case 'bouncing':
        return 'Ricocheting projectiles';
      case 'splitting':
        return 'Bullets that split mid-flight';
      case 'energy':
        return 'Pulsing energy projectiles';
      case 'charged':
        return 'High-damage charged shots';
      case 'ultimate':
        return 'Screen-clearing mega weapon';
      case 'basic':
      default:
        return 'Standard blaster';
    }
  }

  public getRemainingAmmo(weapon: WeaponType): number | undefined {
    const effect = this.weaponEffects.get(weapon);
    return effect?.ammo;
  }

  public getRemainingTime(weapon: WeaponType): number {
    const effect = this.weaponEffects.get(weapon);
    if (!effect || !effect.isActive) return 0;
    
    const elapsed = Date.now() - effect.startTime;
    return Math.max(0, effect.duration - elapsed);
  }
}

// Specialized bullet types
export class HomingBullet extends Bullet {
  private target: {x: number, y: number};
  private turnSpeed: number = 0.1;
  
  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy', target: {x: number, y: number}) {
    super(x, y, vx, vy, radius, color, type);
    this.target = target;
  }

  public update() {
    // Homing behavior
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const targetVx = (dx / distance) * 6;
      const targetVy = (dy / distance) * 6;
      
      // Gradually turn towards target
      this.vx += (targetVx - this.vx) * this.turnSpeed;
      this.vy += (targetVy - this.vy) * this.turnSpeed;
    }
    
    super.update();
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Trail effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    
    // Missile body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    
    // Thruster flame
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(this.x - 2, this.y + this.height/2, 4, 6);
    
    ctx.restore();
  }
}

export class PlasmaBullet extends Bullet {
  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy') {
    super(x, y, vx, vy, radius, color, type, 'large', 'energy');
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Pulsing glow effect using base class pulseTime
    const glowIntensity = 0.8 + 0.4 * Math.sin(this.pulseTime * 3);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15 * glowIntensity;
    
    // Core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner glow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width/4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

export class SplittingBullet extends Bullet {
  private hasSplit: boolean = false;
  private spawnY: number;
  private splitDistance: number = 100;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy') {
    super(x, y, vx, vy, radius, color, type, 'medium', 'splitting');
    this.spawnY = y;
  }

  public update() {
    super.update();
    
    // Check if should split based on distance traveled from spawn point
    const distanceTraveled = Math.abs(this.y - this.spawnY);
    if (!this.hasSplit && distanceTraveled >= this.splitDistance) {
      this.hasSplit = true;
    }
  }

  public shouldSplit(): boolean {
    return this.hasSplit;
  }

  public createSplitBullets(): Bullet[] {
    const splitBullets: Bullet[] = [];
    
    // Create 3 smaller bullets with proper radius values
    const angles = [-0.4, 0, 0.4];
    const splitRadius = this.width * 0.3; // Use proper radius, not width
    
    for (const angle of angles) {
      splitBullets.push(new Bullet(
        this.x,
        this.y,
        Math.sin(angle) * 6,
        this.vy * 1.2,
        splitRadius,
        this.color,
        this.type,
        'small',
        'basic'
      ));
    }
    
    return splitBullets;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Unstable energy effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 + Math.random() * 4;
    
    // Main bullet with crackling effect
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Crackling energy lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = this.width * (0.3 + Math.random() * 0.4);
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(angle) * length,
        this.y + Math.sin(angle) * length
      );
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

// Weapon pickup
export class WeaponPickup {
  public x: number;
  public y: number;
  public width: number = 25;
  public height: number = 25;
  public weaponType: WeaponType;
  public color: string;
  public speed: number = 1;
  public pulseTime: number = 0;
  public duration?: number;
  public ammo?: number;

  constructor(x: number, y: number, weaponType: WeaponType) {
    this.x = x;
    this.y = y;
    this.weaponType = weaponType;
    
    // Set properties based on weapon type
    switch (weaponType) {
      case 'laser':
        this.color = '#ff00ff';
        this.duration = 8000;
        break;
      case 'spread':
        this.color = '#ffaa00';
        this.duration = 12000;
        break;
      case 'homing':
        this.color = '#00ffff';
        this.ammo = 20;
        break;
      case 'plasma':
        this.color = '#00ff88';
        this.ammo = 15;
        break;
      default:
        this.color = '#ffffff';
    }
  }

  public update() {
    this.y += this.speed;
    this.pulseTime += 0.15;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Pulsing glow effect
    const glowIntensity = 0.7 + 0.3 * Math.sin(this.pulseTime * 4);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12 * glowIntensity;
    
    // Weapon icon based on type
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const centerX = this.x;
    const centerY = this.y;
    const size = this.width / 2;
    
    switch (this.weaponType) {
      case 'laser':
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size/2, centerY - size/3);
        ctx.lineTo(centerX - size/3, centerY - size/3);
        ctx.lineTo(centerX + size/3, centerY + size/3);
        ctx.lineTo(centerX - size/2, centerY + size/3);
        ctx.lineTo(centerX, centerY + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'spread':
        // Fan pattern
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI * 0.75 + (i * Math.PI * 0.5 / 4);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + Math.cos(angle) * size, centerY + Math.sin(angle) * size);
          ctx.stroke();
        }
        break;
        
      case 'homing':
        // Target/crosshair
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY);
        ctx.lineTo(centerX + size, centerY);
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX, centerY + size);
        ctx.stroke();
        break;
        
      case 'plasma':
        // Energy ball
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner energy
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    // Ammo indicator
    if (this.ammo) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.ammo.toString(), centerX, centerY + size + 12);
    }
    
    ctx.restore();
  }

  public static getRandomWeapon(): WeaponType {
    const weapons: WeaponType[] = ['laser', 'spread', 'homing', 'plasma'];
    return weapons[Math.floor(Math.random() * weapons.length)];
  }
}