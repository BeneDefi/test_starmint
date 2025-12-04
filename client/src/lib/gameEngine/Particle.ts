export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public life: number;
  public maxLife: number;

  constructor(x: number, y: number, vx: number, vy: number, color: string, life: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }

  public update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    
    // Apply friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  public isDead(): boolean {
    return this.life <= 0;
  }

  public render(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 3;
    
    const size = 2 + (alpha * 3);
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
    
    ctx.restore();
  }
}
