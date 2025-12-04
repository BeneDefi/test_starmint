export type BulletSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive';
export type BulletEffectType = 'basic' | 'explosive' | 'piercing' | 'bouncing' | 'splitting' | 'energy' | 'charged' | 'ultimate';

export interface BulletTrail {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public width: number;
  public height: number;
  public color: string;
  public type: 'player' | 'enemy';
  public bulletSize: BulletSize;
  public effectType: BulletEffectType;
  public damage: number;
  public penetrationCount: number;
  public maxPenetrations: number;
  public bounceCount: number;
  public maxBounces: number;
  public explosionRadius: number;
  public energyCost: number;
  public trail: BulletTrail[];
  public maxTrailLength: number;
  public glowIntensity: number;
  public rotationAngle: number;
  public rotationSpeed: number;
  public pulseTime: number;

  private static playerRocketImage: HTMLImageElement | null = null;
  private static enemyRocketImage: HTMLImageElement | null = null;
  private static playerImageLoaded: boolean = false;
  private static enemyImageLoaded: boolean = false;

  constructor(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    radius: number, 
    color: string, 
    type: 'player' | 'enemy',
    bulletSize: BulletSize = 'medium',
    effectType: BulletEffectType = 'basic'
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.bulletSize = bulletSize;
    this.effectType = effectType;
    this.color = color;
    this.type = type;
    
    // Set size based on bulletSize
    const sizeMultiplier = this.getSizeMultiplier(bulletSize);
    this.width = radius * 2 * sizeMultiplier;
    this.height = radius * 2 * sizeMultiplier;
    
    // Set properties based on bullet type and size
    this.damage = this.calculateDamage();
    this.penetrationCount = 0;
    this.maxPenetrations = effectType === 'piercing' ? 3 : 0;
    this.bounceCount = 0;
    this.maxBounces = effectType === 'bouncing' ? 5 : 0;
    this.explosionRadius = effectType === 'explosive' ? this.width * 2 : 0;
    this.energyCost = this.calculateEnergyCost();
    this.trail = [];
    this.maxTrailLength = effectType === 'energy' ? 10 : effectType === 'charged' ? 15 : 5;
    this.glowIntensity = 1;
    this.rotationAngle = 0;
    this.rotationSpeed = Math.random() * 0.2 - 0.1;
    this.pulseTime = 0;
    
    // Load images if not already loaded
    if (!Bullet.playerRocketImage) {
      Bullet.loadPlayerImage();
    }
    if (!Bullet.enemyRocketImage) {
      Bullet.loadEnemyImage();
    }
  }

  private getSizeMultiplier(size: BulletSize): number {
    switch (size) {
      case 'tiny': return 0.5;
      case 'small': return 0.75;
      case 'medium': return 1.0;
      case 'large': return 1.5;
      case 'massive': return 2.5;
      default: return 1.0;
    }
  }

  private calculateDamage(): number {
    const baseDamage = 10;
    const sizeMultiplier = this.getSizeMultiplier(this.bulletSize);
    
    switch (this.effectType) {
      case 'explosive': return Math.floor(baseDamage * sizeMultiplier * 2.5);
      case 'piercing': return Math.floor(baseDamage * sizeMultiplier * 1.5);
      case 'charged': return Math.floor(baseDamage * sizeMultiplier * 3);
      case 'ultimate': return Math.floor(baseDamage * sizeMultiplier * 5);
      case 'energy': return Math.floor(baseDamage * sizeMultiplier * 2);
      default: return Math.floor(baseDamage * sizeMultiplier);
    }
  }

  private calculateEnergyCost(): number {
    const baseCost = 1;
    const sizeMultiplier = this.getSizeMultiplier(this.bulletSize);
    
    switch (this.effectType) {
      case 'explosive': return Math.floor(baseCost * sizeMultiplier * 3);
      case 'ultimate': return Math.floor(baseCost * sizeMultiplier * 10);
      case 'energy': return Math.floor(baseCost * sizeMultiplier * 5);
      case 'charged': return Math.floor(baseCost * sizeMultiplier * 7);
      default: return Math.floor(baseCost * sizeMultiplier);
    }
  }

  private static loadPlayerImage() {
    Bullet.playerRocketImage = new Image();
    Bullet.playerRocketImage.onload = () => {
      Bullet.playerImageLoaded = true;
      console.log('Player rocket image loaded successfully');
    };
    Bullet.playerRocketImage.onerror = () => {
      console.error('Failed to load player rocket image');
    };
    Bullet.playerRocketImage.src = '/rocket.png';
  }

  private static loadEnemyImage() {
    Bullet.enemyRocketImage = new Image();
    Bullet.enemyRocketImage.onload = () => {
      Bullet.enemyImageLoaded = true;
      console.log('Enemy rocket image loaded successfully');
    };
    Bullet.enemyRocketImage.onerror = () => {
      console.error('Failed to load enemy rocket image');
    };
    Bullet.enemyRocketImage.src = '/enemey_rockets.png';
  }

  public update(canvasWidth?: number, canvasHeight?: number) {
    // Update trail
    this.updateTrail();
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Update rotation and effects
    this.rotationAngle += this.rotationSpeed;
    this.pulseTime += 0.15;
    
    // Handle bouncing with proper canvas dimensions
    if (this.effectType === 'bouncing' && this.bounceCount < this.maxBounces) {
      this.handleBouncing(canvasWidth, canvasHeight);
    }
    
    // Update glow intensity based on effect type
    switch (this.effectType) {
      case 'energy':
        this.glowIntensity = 0.8 + 0.4 * Math.sin(this.pulseTime * 2);
        break;
      case 'charged':
        this.glowIntensity = 1.2 + 0.6 * Math.sin(this.pulseTime * 4);
        break;
      case 'ultimate':
        this.glowIntensity = 1.5 + 0.8 * Math.sin(this.pulseTime * 6);
        break;
      default:
        this.glowIntensity = 1.0;
    }
  }

  private updateTrail() {
    // Add current position to trail
    this.trail.unshift({
      x: this.x,
      y: this.y,
      alpha: 1.0,
      size: this.width
    });

    // Update existing trail points
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.85;
      this.trail[i].size *= 0.95;
    }

    // Remove old trail points
    if (this.trail.length > this.maxTrailLength) {
      this.trail = this.trail.slice(0, this.maxTrailLength);
    }

    // Remove invisible points
    this.trail = this.trail.filter(point => point.alpha > 0.05);
  }

  private handleBouncing(canvasWidth: number = 800, canvasHeight: number = 600) {
    let bounced = false;
    
    if (this.x <= 0 || this.x >= canvasWidth) {
      this.vx = -this.vx;
      this.x = Math.max(0, Math.min(canvasWidth, this.x));
      bounced = true;
    }
    
    if (this.y <= 0 || this.y >= canvasHeight) {
      this.vy = -this.vy;
      this.y = Math.max(0, Math.min(canvasHeight, this.y));
      bounced = true;
    }
    
    if (bounced) {
      this.bounceCount++;
      // Add slight velocity decay on bounce
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Render trail first
    this.renderTrail(ctx);
    
    ctx.save();
    
    // Apply glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 * this.glowIntensity;
    
    // Apply rotation for spinning bullets
    if (this.effectType === 'energy' || this.effectType === 'charged' || this.effectType === 'ultimate') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotationAngle);
      ctx.translate(-this.x, -this.y);
    }
    
    // Render based on effect type and size
    this.renderBulletByType(ctx);
    
    ctx.restore();
    
    // Render special effects
    this.renderSpecialEffects(ctx);
  }

  private renderTrail(ctx: CanvasRenderingContext2D) {
    if (this.trail.length < 2) return;
    
    ctx.save();
    
    for (let i = 1; i < this.trail.length; i++) {
      const current = this.trail[i];
      const previous = this.trail[i - 1];
      
      ctx.globalAlpha = current.alpha * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, current.size * 0.3);
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  private renderBulletByType(ctx: CanvasRenderingContext2D) {
    switch (this.effectType) {
      case 'explosive':
        this.renderExplosiveBullet(ctx);
        break;
      case 'piercing':
        this.renderPiercingBullet(ctx);
        break;
      case 'energy':
        this.renderEnergyBullet(ctx);
        break;
      case 'charged':
        this.renderChargedBullet(ctx);
        break;
      case 'ultimate':
        this.renderUltimateBullet(ctx);
        break;
      default:
        this.renderBasicBullet(ctx);
    }
  }

  private renderBasicBullet(ctx: CanvasRenderingContext2D) {
    if (this.type === 'player') {
      if (Bullet.playerImageLoaded && Bullet.playerRocketImage) {
        ctx.drawImage(
          Bullet.playerRocketImage,
          this.x - this.width / 2,
          this.y - this.height / 2,
          this.width,
          this.height
        );
      } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
    } else {
      if (Bullet.enemyImageLoaded && Bullet.enemyRocketImage) {
        ctx.drawImage(
          Bullet.enemyRocketImage,
          this.x - this.width / 2,
          this.y - this.height / 2,
          this.width,
          this.height
        );
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderExplosiveBullet(ctx: CanvasRenderingContext2D) {
    // Outer shell
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Warning stripes
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    const stripes = 4;
    for (let i = 0; i < stripes; i++) {
      const angle = (i / stripes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(angle) * this.width / 3,
        this.y + Math.sin(angle) * this.width / 3
      );
      ctx.stroke();
    }
  }

  private renderPiercingBullet(ctx: CanvasRenderingContext2D) {
    // Sharp pointed projectile
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.height / 2);
    ctx.lineTo(this.x + this.width / 3, this.y);
    ctx.lineTo(this.x, this.y + this.height / 2);
    ctx.lineTo(this.x - this.width / 3, this.y);
    ctx.closePath();
    ctx.fill();
    
    // Core line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.height / 3);
    ctx.lineTo(this.x, this.y + this.height / 3);
    ctx.stroke();
  }

  private renderEnergyBullet(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.pulseTime * 3) * 0.3 + 1;
    
    // Energy core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, (this.width / 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    // Energy rings
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6 / i;
      ctx.beginPath();
      ctx.arc(this.x, this.y, (this.width / 2) * pulse + i * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private renderChargedBullet(ctx: CanvasRenderingContext2D) {
    const chargeIntensity = Math.sin(this.pulseTime * 4) * 0.5 + 1;
    
    // Main projectile
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Electric arcs
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = chargeIntensity * 0.8;
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + this.rotationAngle;
      const length = this.width * 0.4 * chargeIntensity;
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(angle) * length,
        this.y + Math.sin(angle) * length
      );
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  }

  private renderUltimateBullet(ctx: CanvasRenderingContext2D) {
    const intensity = Math.sin(this.pulseTime * 6) * 0.4 + 1.2;
    
    // Multiple layered effects
    const layers = [
      { radius: this.width * 0.6, color: '#ffffff', alpha: 0.9 },
      { radius: this.width * 0.4, color: this.color, alpha: 1.0 },
      { radius: this.width * 0.2, color: '#ffffff', alpha: 0.8 }
    ];
    
    layers.forEach(layer => {
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, layer.radius * intensity, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    
    // Surrounding energy field
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    for (let ring = 1; ring <= 2; ring++) {
      ctx.globalAlpha = 0.5 / ring;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width * ring * intensity, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  }

  private renderSpecialEffects(ctx: CanvasRenderingContext2D) {
    // Additional particle effects for certain bullet types
    if (this.effectType === 'ultimate' || this.effectType === 'charged') {
      this.renderSparkles(ctx);
    }
  }

  private renderSparkles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    const sparkleCount = this.effectType === 'ultimate' ? 8 : 4;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + this.pulseTime;
      const distance = this.width * 0.8 + Math.sin(this.pulseTime * 2) * 5;
      
      const x = this.x + Math.cos(angle) * distance;
      const y = this.y + Math.sin(angle) * distance;
      
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  // Utility methods for bullet behavior
  public canPenetrate(): boolean {
    return this.effectType === 'piercing' && this.penetrationCount < this.maxPenetrations;
  }

  public onPenetration() {
    if (this.effectType === 'piercing') {
      this.penetrationCount++;
    }
  }

  public shouldExplode(): boolean {
    return this.effectType === 'explosive';
  }

  public isOutOfBounds(screenWidth: number, screenHeight: number): boolean {
    const margin = Math.max(this.width, this.height);
    return (
      this.x < -margin || 
      this.x > screenWidth + margin || 
      this.y < -margin || 
      this.y > screenHeight + margin
    );
  }

  public getBoundingBox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}
