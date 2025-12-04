import { useEffect, useRef } from "react";
import GameCanvas from "./GameCanvas";
import GameUI from "./GameUI";
import TouchControls from "./TouchControls";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";
import { useVibration } from "../lib/stores/useVibration";

interface GameProps {
  onBackToMenu?: () => void;
}

export default function Game({ onBackToMenu }: GameProps) {
  const { gamePhase, startGame } = useGameState();
  const { backgroundMusic, isMuted, playShoot, playGameOver } = useAudio();
  const { 
    checkVibrationSupport, 
    vibrateShoot, 
    vibrateHit, 
    vibrateEnemyDestroyed, 
    vibratePlayerHit, 
    vibrateGameOver 
  } = useVibration();
  const musicStarted = useRef(false);

  useEffect(() => {
    // Check vibration support on component mount
    checkVibrationSupport();
  }, [checkVibrationSupport]);

  useEffect(() => {
    // Control background music based on game phase and mute state
    if (backgroundMusic) {
      if (gamePhase === "playing" && !isMuted && !musicStarted.current) {
        backgroundMusic.play().catch(console.log);
        musicStarted.current = true;
      } else if (gamePhase === "playing" && isMuted && musicStarted.current) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
      } else if (gamePhase !== "playing") {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        musicStarted.current = false;
      }
    }
    
    // Play game over sound and vibration when game ends
    if (gamePhase === "ended") {
      playGameOver();
      vibrateGameOver();
    }
  }, [gamePhase, backgroundMusic, isMuted, playGameOver, vibrateGameOver]);

  useEffect(() => {
    // Listen for game events from game engine
    const handleShootSound = () => {
      playShoot();
      vibrateShoot();
    };
    
    const handleHitSound = () => {
      vibrateHit();
    };
    
    const handleEnemyDestroyed = () => {
      vibrateEnemyDestroyed();
    };
    
    const handlePlayerHit = () => {
      vibratePlayerHit();
    };
    
    window.addEventListener('playShootSound', handleShootSound);
    window.addEventListener('playHitSound', handleHitSound);
    window.addEventListener('enemyDestroyed', handleEnemyDestroyed);
    window.addEventListener('playerHit', handlePlayerHit);
    
    return () => {
      window.removeEventListener('playShootSound', handleShootSound);
      window.removeEventListener('playHitSound', handleHitSound);
      window.removeEventListener('enemyDestroyed', handleEnemyDestroyed);
      window.removeEventListener('playerHit', handlePlayerHit);
    };
  }, [playShoot, vibrateShoot, vibrateHit, vibrateEnemyDestroyed, vibratePlayerHit]);

  const handleStart = () => {
    startGame();
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-black via-purple-900/20 to-black" data-game-phase={gamePhase}>
      <GameCanvas />
      <GameUI onStart={handleStart} onBackToMenu={onBackToMenu} />
      {gamePhase === "playing" && <TouchControls />}
    </div>
  );
}
