import { useEffect, useRef, useCallback } from "react";
import { GameEngine } from "../lib/gameEngine/GameEngine";
import { useGameState } from "../lib/stores/useGameState";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>();
  const { gamePhase, setScore, setLevel, setLives, endGame, incrementEnemiesKilled, incrementPowerUpsCollected, incrementBulletStats } = useGameState();

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }, []);

  // Initialize game engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize game engine only once
    if (!gameEngineRef.current) {
      const gameEngine = new GameEngine(ctx, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      gameEngineRef.current = gameEngine;
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  // Game loop effect
  useEffect(() => {
    if (!gameEngineRef.current) return;

    // Set up event listeners for game stats tracking
    const handleEnemyKilled = () => incrementEnemiesKilled();
    const handlePowerUpCollected = () => incrementPowerUpsCollected();
    const handleBulletFired = () => incrementBulletStats(true, false);
    const handleBulletHit = () => incrementBulletStats(false, true);

    window.addEventListener('enemyKilled', handleEnemyKilled);
    window.addEventListener('powerUpCollected', handlePowerUpCollected);
    window.addEventListener('bulletFired', handleBulletFired);
    window.addEventListener('bulletHit', handleBulletHit);

    const gameLoop = () => {
      if (gamePhase === "playing") {
        const gameState = gameEngineRef.current!.update();
        
        setScore(gameState.score);
        setLevel(gameState.level);
        setLives(gameState.lives);
        
        if (gameState.gameOver) {
          // Pass final game statistics to the endGame function
          endGame({
            enemiesKilled: gameState.enemiesKilled,
            maxLevel: gameState.level,
          });
          return;
        }
      }
      
      gameEngineRef.current!.render();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Clean up event listeners
      window.removeEventListener('enemyKilled', handleEnemyKilled);
      window.removeEventListener('powerUpCollected', handlePowerUpCollected);
      window.removeEventListener('bulletFired', handleBulletFired);
      window.removeEventListener('bulletHit', handleBulletHit);
    };
  }, [gamePhase, setScore, setLevel, setLives, endGame]);

  useEffect(() => {
    if (gameEngineRef.current) {
      if (gamePhase === "ready") {
        gameEngineRef.current.reset();
      }
    }
  }, [gamePhase]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameEngineRef.current) return;
      
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          gameEngineRef.current.player.moveLeft = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          gameEngineRef.current.player.moveRight = true;
          e.preventDefault();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameEngineRef.current) return;
      
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          gameEngineRef.current.player.moveLeft = false;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          gameEngineRef.current.player.moveRight = false;
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
