export type BossType = 'destroyer' | 'mothership' | 'dreadnought';

export class Boss {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public speed: number;
  public health: number;
  public maxHealth: number;
  public type: BossType;
  public attackTimer: number = 0;
  public movementTimer: number = 0;
  public isActive: boolean = true;
  
  private oscillationOffset: number;
  private moveDirection: number = 1;
  private static bossImage: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private attackPattern: number = 0;

  constructor(x: number, y: number, type: BossType, level: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.oscillationOffset = Math.random() * Math.PI * 2;
    
    // Boss stats based on type and level
    switch (type) {
      case 'destroyer':
        this.width = 80;
        this.height = 60;
        this.speed = 0.5;
        this.health = 15 + (level * 5);
        break;
      case 'mothership':
        this.width = 120;
        this.height = 80;
        this.speed = 0.3;
        this.health = 25 + (level * 7);
        break;
      case 'dreadnought':
        this.width = 150;
        this.height = 100;
        this.speed = 0.2;
        this.health = 35 + (level * 10);
        break;
    }
    
    this.maxHealth = this.health;
    
    // Load boss image if not already loaded
    if (!Boss.bossImage) {
      Boss.loadImage();
    }
  }

  private static loadImage() {
    Boss.bossImage = new Image();
    Boss.bossImage.onload = () => {
      Boss.imageLoaded = true;
      console.log('Boss image loaded successfully');
    };
    Boss.bossImage.onerror = () => {
      console.error('Failed to load boss image');
    };
    Boss.bossImage.src = '/Enemey_Space_Ship.png'; // Using enemy ship but larger for now
  }

  public update(canvasWidth: number, canvasHeight: number): { bullets: Array<{x: number, y: number, vx: number, vy: number}> } {
    this.movementTimer++;
    this.attackTimer++;
    
    const bullets: Array<{x: number, y: number, vx: number, vy: number}> = [];

    // Movement patterns based on boss type
    switch (this.type) {
      case 'destroyer':
        // Move side to side at top of screen
        this.x += this.speed * this.moveDirection;
        if (this.x <= this.width / 2 || this.x >= canvasWidth - this.width / 2) {
          this.moveDirection *= -1;
        }
        
        // Attack pattern - rapid fire bursts
        if (this.attackTimer >= 45 && this.attackTimer % 15 === 0) {
          bullets.push({
            x: this.x,
            y: this.y + this.height / 2,
            vx: 0,
            vy: 4
          });
          
          if (this.attackTimer >= 120) {
            this.attackTimer = 0;
          }
        }
        break;
        
      case 'mothership':
        // Slow oscillating movement
        this.x += Math.sin(this.movementTimer * 0.02) * 1.5;
        this.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, this.x));
        
        // Attack pattern - triple shot spread
        if (this.attackTimer >= 80) {
          const angles = [-0.3, 0, 0.3];
          for (const angle of angles) {
            bullets.push({
              x: this.x + Math.sin(angle) * 20,
              y: this.y + this.height / 2,
              vx: Math.sin(angle) * 2,
              vy: 3 + Math.cos(angle)
            });
          }
          this.attackTimer = 0;
        }
        break;
        
      case 'dreadnought':
        // Minimal movement, mostly stationary
        this.x += Math.sin(this.movementTimer * 0.01) * 0.5;
        this.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, this.x));
        
        // Complex attack pattern - alternating between spray and focused
        if (this.attackTimer >= 60) {
          if (this.attackPattern % 2 === 0) {
            // Spray pattern
            for (let i = -2; i <= 2; i++) {
              bullets.push({
                x: this.x + i * 15,
                y: this.y + this.height / 2,
                vx: i * 0.8,
                vy: 3.5
              });
            }
          } else {
            // Focused beam
            for (let i = 0; i < 3; i++) {
              bullets.push({
                x: this.x,
                y: this.y + this.height / 2 + i * 10,
                vx: 0,
                vy: 5
              });
            }
          }
          this.attackPattern++;
          this.attackTimer = 0;
        }
        break;
    }
    
    return { bullets };
  }

  public takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  public getHealthPercentage(): number {
    return this.health / this.maxHealth;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Flash red when damaged
    const healthPercent = this.getHealthPercentage();
    if (healthPercent < 0.3) {
      ctx.filter = 'hue-rotate(0deg) saturate(150%) brightness(120%)';
    }

    if (Boss.imageLoaded && Boss.bossImage) {
      // Draw the boss image (scaled up enemy ship)
      ctx.drawImage(
        Boss.bossImage,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback to colored rectangle
      const colors = {
        destroyer: '#8B0000',
        mothership: '#4B0082', 
        dreadnought: '#800080'
      };
      
      ctx.fillStyle = colors[this.type];
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      
      // Add some details
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2);
      
      // Add weapon ports
      ctx.fillStyle = '#FFFF00';
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(i * (this.width / 6), this.height / 2 - 5, 6, 8);
      }
    }

    ctx.restore();

    // Render health bar
    this.renderHealthBar(ctx);
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D) {
    const barWidth = this.width + 20;
    const barHeight = 8;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.height / 2 - 20;
    
    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health
    const healthPercent = this.getHealthPercentage();
    const healthColor = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  public static getBossTypeForLevel(level: number): BossType {
    const bossLevel = Math.floor(level / 5);
    const types: BossType[] = ['destroyer', 'mothership', 'dreadnought'];
    return types[bossLevel % types.length];
  }
}