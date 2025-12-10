export class GameOptimizer {
    private static frameTimeHistory: number[] = [];
    private static lastFrameTime: number = 0;
    private static adaptiveQuality: 'low' | 'medium' | 'high' = 'high';
    private static particleLimit: number = 100;
    private static renderSkipCounter: number = 0;
  
    // Object pooling for bullets and particles
    private static bulletPool: Array<any> = [];
    private static particlePool: Array<any> = [];
    private static enemyPool: Array<any> = [];
  
    // Performance monitoring
    private static performanceMetrics = {
      averageFps: 60,
      frameDrops: 0,
      memoryUsage: 0,
      renderTime: 0
    };
  
    public static initialize(): void {
      this.detectDeviceCapabilities();
      this.setupPerformanceMonitoring();
    }
  
    private static detectDeviceCapabilities(): void {
      // Detect device performance tier
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      let tier = 'high';
      
      // Check for mobile device
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        tier = 'medium';
        
        // Further reduce quality for older mobile devices
        if (navigator.hardwareConcurrency <= 2) {
          tier = 'low';
        }
      }
      
      // Check WebGL capabilities
      if (gl && 'getParameter' in gl) {
        try {
          const webgl = gl as WebGLRenderingContext;
          const renderer = webgl.getParameter(webgl.RENDERER);
          if (renderer && typeof renderer === 'string' && (renderer.includes('Mali') || renderer.includes('Adreno 3'))) {
            tier = 'low';
          }
        } catch (error) {
          console.warn('Could not detect WebGL renderer:', error);
        }
      } else {
        tier = 'low';
      }
      
      this.adaptiveQuality = tier as 'low' | 'medium' | 'high';
      this.adjustQualitySettings();
      
      console.log(`Device performance tier: ${tier}`);
    }
  
    private static adjustQualitySettings(): void {
      switch (this.adaptiveQuality) {
        case 'low':
          this.particleLimit = 30;
          break;
        case 'medium':
          this.particleLimit = 60;
          break;
        case 'high':
          this.particleLimit = 100;
          break;
      }
    }
  
    private static setupPerformanceMonitoring(): void {
      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.performanceMetrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          
          // Trigger GC hint if memory usage is high
          if (this.performanceMetrics.memoryUsage > 0.8) {
            this.triggerGarbageCollection();
          }
        }, 5000);
      }
    }
  
    public static trackFrameTime(deltaTime: number): void {
      this.frameTimeHistory.push(deltaTime);
      
      // Keep only last 60 frames
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      
      // Calculate average FPS
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
      this.performanceMetrics.averageFps = 1000 / avgFrameTime;
      
      // Detect frame drops
      if (deltaTime > 33) { // Below 30 FPS
        this.performanceMetrics.frameDrops++;
        this.handlePerformanceDrop();
      }
    }
  
    private static handlePerformanceDrop(): void {
      if (this.performanceMetrics.averageFps < 30) {
        // Reduce quality dynamically
        if (this.adaptiveQuality === 'high') {
          this.adaptiveQuality = 'medium';
          this.adjustQualitySettings();
          console.log('Reduced quality to medium due to performance issues');
        } else if (this.adaptiveQuality === 'medium') {
          this.adaptiveQuality = 'low';
          this.adjustQualitySettings();
          console.log('Reduced quality to low due to performance issues');
        }
      }
    }
  
    // Object pooling methods
    public static getBullet(): any {
      return this.bulletPool.pop() || { x: 0, y: 0, dx: 0, dy: 0, active: false, type: 'player' };
    }
  
    public static returnBullet(bullet: any): void {
      bullet.active = false;
      this.bulletPool.push(bullet);
    }
  
    public static getParticle(): any {
      return this.particlePool.pop() || { 
        x: 0, y: 0, dx: 0, dy: 0, life: 0, maxLife: 0, color: '#ffffff', active: false 
      };
    }
  
    public static returnParticle(particle: any): void {
      particle.active = false;
      this.particlePool.push(particle);
    }
  
    public static getEnemy(): any {
      return this.enemyPool.pop() || { 
        x: 0, y: 0, dx: 0, dy: 0, health: 1, maxHealth: 1, type: 'basic', active: false 
      };
    }
  
    public static returnEnemy(enemy: any): void {
      enemy.active = false;
      this.enemyPool.push(enemy);
    }
  
    // Rendering optimizations
    public static shouldSkipFrame(): boolean {
      if (this.performanceMetrics.averageFps < 20) {
        this.renderSkipCounter++;
        if (this.renderSkipCounter % 2 === 0) {
          return true; // Skip every other frame
        }
      }
      return false;
    }
  
    public static shouldLimitParticles(currentCount: number): boolean {
      return currentCount >= this.particleLimit;
    }
  
    public static getOptimalParticleCount(): number {
      return Math.max(10, Math.floor(this.particleLimit * (this.performanceMetrics.averageFps / 60)));
    }
  
    // Memory management
    private static triggerGarbageCollection(): void {
      // Clean up object pools if they're getting too large
      if (this.bulletPool.length > 50) {
        this.bulletPool = this.bulletPool.slice(0, 25);
      }
      if (this.particlePool.length > 100) {
        this.particlePool = this.particlePool.slice(0, 50);
      }
      if (this.enemyPool.length > 30) {
        this.enemyPool = this.enemyPool.slice(0, 15);
      }
      
      console.log('Performed memory cleanup');
    }
  
    // Batch rendering utilities
    public static batchRenderParticles(ctx: CanvasRenderingContext2D, particles: any[]): void {
      const particlesByColor: { [color: string]: any[] } = {};
      
      // Group particles by color for batch rendering
      particles.forEach(particle => {
        if (!particlesByColor[particle.color]) {
          particlesByColor[particle.color] = [];
        }
        particlesByColor[particle.color].push(particle);
      });
      
      // Render each color group in one draw call
      Object.entries(particlesByColor).forEach(([color, colorParticles]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        colorParticles.forEach(particle => {
          ctx.rect(particle.x - 1, particle.y - 1, 2, 2);
        });
        
        ctx.fill();
      });
    }
  
    public static getPerformanceMetrics() {
      return { ...this.performanceMetrics };
    }
  
    public static getQualityLevel(): 'low' | 'medium' | 'high' {
      return this.adaptiveQuality;
    }
  
    // Adaptive LOD (Level of Detail)
    public static shouldUseSimpleRendering(distance: number): boolean {
      if (this.adaptiveQuality === 'low') return distance > 100;
      if (this.adaptiveQuality === 'medium') return distance > 200;
      return distance > 300;
    }
  }