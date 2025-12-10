export type PowerUpType = 'shield' | 'slow-motion' | 'rapid-fire' | 'multi-shot' | 'extra-life';

export interface PowerUpEffect {
  type: PowerUpType;
  duration: number; // in milliseconds
  isActive: boolean;
  startTime: number;
}

export class PowerUp {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: PowerUpType;
  public color: string;
  public speed: number;
  public pulseTime: number = 0;
  
  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.type = type;
    this.speed = 1;
    
    // Set color based on power-up type
    switch (type) {
      case 'shield':
        this.color = '#00ffff'; // Cyan
        break;
      case 'slow-motion':
        this.color = '#ffff00'; // Yellow
        break;
      case 'rapid-fire':
        this.color = '#ff8800'; // Orange
        break;
      case 'multi-shot':
        this.color = '#ff00ff'; // Magenta
        break;
      case 'extra-life':
        this.color = '#00ff00'; // Green
        break;
    }
  }
  
  public update() {
    this.y += this.speed;
    this.pulseTime += 0.1;
  }
  
  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Pulsing glow effect
    const glowIntensity = 0.7 + 0.3 * Math.sin(this.pulseTime * 3);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 * glowIntensity;
    
    // Draw power-up icon based on type
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const centerX = this.x;
    const centerY = this.y;
    const size = this.width / 2;
    
    switch (this.type) {
      case 'shield':
        // Draw shield shape
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size * 0.7, centerY - size * 0.3);
        ctx.lineTo(centerX + size * 0.7, centerY + size * 0.3);
        ctx.lineTo(centerX, centerY + size);
        ctx.lineTo(centerX - size * 0.7, centerY + size * 0.3);
        ctx.lineTo(centerX - size * 0.7, centerY - size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'slow-motion':
        // Draw clock/time symbol
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Clock hands
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - size * 0.5);
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + size * 0.3, centerY);
        ctx.stroke();
        break;
        
      case 'rapid-fire':
        // Draw multiple arrows/bullets
        for (let i = 0; i < 3; i++) {
          const offsetY = (i - 1) * size * 0.4;
          ctx.beginPath();
          ctx.moveTo(centerX - size * 0.5, centerY + offsetY);
          ctx.lineTo(centerX + size * 0.5, centerY + offsetY);
          ctx.lineTo(centerX + size * 0.3, centerY + offsetY - size * 0.2);
          ctx.moveTo(centerX + size * 0.5, centerY + offsetY);
          ctx.lineTo(centerX + size * 0.3, centerY + offsetY + size * 0.2);
          ctx.stroke();
        }
        break;
        
      case 'multi-shot':
        // Draw spreading arrows
        const angles = [-0.3, 0, 0.3];
        for (const angle of angles) {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-size * 0.5, 0);
          ctx.lineTo(size * 0.5, 0);
          ctx.lineTo(size * 0.3, -size * 0.2);
          ctx.moveTo(size * 0.5, 0);
          ctx.lineTo(size * 0.3, size * 0.2);
          ctx.stroke();
          ctx.restore();
        }
        break;
        
      case 'extra-life':
        // Draw heart shape
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + size * 0.3);
        ctx.bezierCurveTo(
          centerX - size, centerY - size * 0.3,
          centerX - size, centerY - size * 0.8,
          centerX, centerY - size * 0.5
        );
        ctx.bezierCurveTo(
          centerX + size, centerY - size * 0.8,
          centerX + size, centerY - size * 0.3,
          centerX, centerY + size * 0.3
        );
        ctx.fill();
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  }
  
  public static getRandomType(): PowerUpType {
    const types: PowerUpType[] = ['shield', 'slow-motion', 'rapid-fire', 'multi-shot', 'extra-life'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  public static getDescription(type: PowerUpType): string {
    switch (type) {
      case 'shield':
        return 'Temporary invincibility shield';
      case 'slow-motion':
        return 'Slows down enemy movement';
      case 'rapid-fire':
        return 'Increases firing rate';
      case 'multi-shot':
        return 'Fires multiple bullets';
      case 'extra-life':
        return 'Gain an extra life';
    }
  }
}