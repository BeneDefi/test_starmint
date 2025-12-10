import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";
import { useVibration } from "../lib/stores/useVibration";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Volume2, VolumeX, Play, RotateCcw, Pause, Star, Vibrate, ArrowLeft, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareOrMintModal } from "./ShareOrMintModal";

interface GameUIProps {
  onStart: () => void;
  onBackToMenu?: () => void;
}

export default function GameUI({ onStart, onBackToMenu }: GameUIProps) {
  const { gamePhase, score, lives, level, restartGame, pauseGame, resumeGame } = useGameState();
  const { toggleMute, isMuted } = useAudio();
  const { toggleVibration, isVibrationEnabled, isVibrationSupported } = useVibration();
  const [levelUpNotification, setLevelUpNotification] = useState<{ show: boolean; level: number } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Listen for level up events
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      setLevelUpNotification({ show: true, level: event.detail.level });
      setTimeout(() => {
        setLevelUpNotification(null);
      }, 3000);
    };

    window.addEventListener('levelUp', handleLevelUp as EventListener);
    return () => {
      window.removeEventListener('levelUp', handleLevelUp as EventListener);
    };
  }, []);

  if (gamePhase === "ready") {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="w-full max-w-xs sm:max-w-sm mx-3 sm:mx-4 bg-black/80 border-purple-500">
          <CardContent className="p-4 sm:p-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Starmint</h1>
            <p className="text-purple-300 mb-4 sm:mb-6 text-sm sm:text-base">Classic Space Shooter</p>
            
            <div className="space-y-3 sm:space-y-4">
              <Button 
                onClick={onStart}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base min-h-[44px]"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Game
              </Button>
              
              {onBackToMenu && (
                <Button 
                  onClick={onBackToMenu}
                  variant="outline"
                  className="w-full border-purple-500 text-purple-300 text-sm sm:text-base min-h-[44px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Menu
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={toggleMute}
                className="w-full border-purple-500 text-purple-300 text-sm sm:text-base min-h-[44px]"
              >
                {isMuted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"} Sound
              </Button>
              
              {isVibrationSupported && (
                <Button 
                  variant="outline"
                  onClick={toggleVibration}
                  className="w-full border-purple-500 text-purple-300 text-sm sm:text-base min-h-[44px]"
                >
                  <Vibrate className="mr-2 h-4 w-4" />
                  {isVibrationEnabled ? "Disable" : "Enable"} Vibration
                </Button>
              )}
            </div>
            
            <div className="mt-4 sm:mt-6 text-xs text-purple-400">
              <p>Desktop: Use Arrow Keys or WASD</p>
              <p>Mobile: Touch to move</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "paused") {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="w-full max-w-xs sm:max-w-sm mx-3 sm:mx-4 bg-black/80 border-yellow-500">
          <CardContent className="p-4 sm:p-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Game Paused</h2>
            <div className="text-yellow-300 mb-3 sm:mb-4 space-y-1 text-sm sm:text-base">
              <p>Level: {level}</p>
              <p>Score: {score}</p>
              <p>Lives: {lives}</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <Button 
                onClick={resumeGame}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm sm:text-base min-h-[44px]"
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              
              <Button 
                onClick={restartGame}
                variant="outline"
                className="w-full border-yellow-500 text-yellow-300 text-sm sm:text-base min-h-[44px]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </Button>
              
              {onBackToMenu && (
                <Button 
                  onClick={onBackToMenu}
                  variant="outline"
                  className="w-full border-yellow-500 text-yellow-300 text-sm sm:text-base min-h-[44px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Menu
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={toggleMute}
                className="w-full border-yellow-500 text-yellow-300 text-sm sm:text-base min-h-[44px]"
              >
                {isMuted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"} Sound
              </Button>
              
              {isVibrationSupported && (
                <Button 
                  variant="outline"
                  onClick={toggleVibration}
                  className="w-full border-yellow-500 text-yellow-300 text-sm sm:text-base min-h-[44px]"
                >
                  <Vibrate className="mr-2 h-4 w-4" />
                  {isVibrationEnabled ? "Disable" : "Enable"} Vibration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "ended") {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="w-full max-w-xs sm:max-w-sm mx-3 sm:mx-4 bg-black/80 border-red-500">
          <CardContent className="p-4 sm:p-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Game Over</h2>
            <div className="text-red-300 mb-3 sm:mb-4 space-y-1 text-sm sm:text-base">
              <p>Final Level: {level}</p>
              <p>Final Score: {score}</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <Button 
                onClick={() => setShowShareModal(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm sm:text-base min-h-[44px]"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share or Mint Score
              </Button>
              
              <Button 
                onClick={restartGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base min-h-[44px]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Play Again
              </Button>
              
              {onBackToMenu && (
                <Button 
                  onClick={onBackToMenu}
                  variant="outline"
                  className="w-full border-red-500 text-red-300 text-sm sm:text-base min-h-[44px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Menu
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={toggleMute}
                className="w-full border-red-500 text-red-300 text-sm sm:text-base min-h-[44px]"
              >
                {isMuted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"} Sound
              </Button>
              
              {isVibrationSupported && (
                <Button 
                  variant="outline"
                  onClick={toggleVibration}
                  className="w-full border-red-500 text-red-300 text-sm sm:text-base min-h-[44px]"
                >
                  <Vibrate className="mr-2 h-4 w-4" />
                  {isVibrationEnabled ? "Disable" : "Enable"} Vibration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <ShareOrMintModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          score={score}
          level={level}
        />
      </div>
    );
  }

  // Playing UI
  return (
    <>
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-start z-10">
        <div className="bg-black/60 rounded-lg p-2 sm:p-3 text-white space-y-1">
          <div className="text-base sm:text-lg font-bold text-purple-300">Level {level}</div>
          <div className="text-xs sm:text-sm">Score: {score}</div>
          <div className="text-xs sm:text-sm">Lives: {lives}</div>
        </div>
        
        <div className="flex gap-1 sm:gap-2">
          {onBackToMenu && (
            <Button 
              variant="outline"
              size="sm"
              onClick={onBackToMenu}
              className="bg-black/60 border-cyan-500 text-cyan-300 min-h-[44px] min-w-[44px] p-2 sm:p-3"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          
          <Button 
            variant="outline"
            size="sm"
            onClick={pauseGame}
            className="bg-black/60 border-yellow-500 text-yellow-300 min-h-[44px] min-w-[44px] p-2 sm:p-3"
          >
            <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="bg-black/60 border-purple-500 text-purple-300 min-h-[44px] min-w-[44px] p-2 sm:p-3"
          >
            {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          
          {isVibrationSupported && (
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleVibration}
              className={`bg-black/60 min-h-[44px] min-w-[44px] p-2 sm:p-3 ${isVibrationEnabled ? 'border-green-500 text-green-300' : 'border-gray-500 text-gray-400'}`}
            >
              <Vibrate className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Level Up Notification */}
      {levelUpNotification?.show && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 sm:p-6 shadow-2xl border-2 border-yellow-400 animate-pulse max-w-xs sm:max-w-sm">
            <div className="text-center text-white">
              <Star className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 text-yellow-400" />
              <h3 className="text-xl sm:text-2xl font-bold mb-1">LEVEL UP!</h3>
              <p className="text-base sm:text-lg">Level {levelUpNotification.level}</p>
              <p className="text-xs sm:text-sm text-yellow-200">Difficulty increased!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
