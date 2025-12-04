import { useRef, useEffect } from "react";
import { useGameState } from "../lib/stores/useGameState";

export default function TouchControls() {
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const { gamePhase } = useGameState();

  useEffect(() => {
    if (gamePhase !== "playing") return;

    const touchArea = touchAreaRef.current;
    if (!touchArea) return;

    let currentTouch: Touch | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        currentTouch = touch;
        updatePlayerPosition(touch.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!currentTouch) return;
      
      const touch = Array.from(e.touches).find(t => t.identifier === currentTouch!.identifier);
      if (touch) {
        currentTouch = touch;
        updatePlayerPosition(touch.clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (currentTouch) {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === currentTouch!.identifier);
        if (touch) {
          currentTouch = null;
        }
      }
    };

    const updatePlayerPosition = (touchX: number) => {
      const rect = touchArea.getBoundingClientRect();
      const relativeX = (touchX - rect.left) / rect.width;
      
      // Dispatch custom event with player position
      window.dispatchEvent(new CustomEvent('playerMove', {
        detail: { position: Math.max(0, Math.min(1, relativeX)) }
      }));
    };

    touchArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    touchArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    touchArea.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      touchArea.removeEventListener('touchstart', handleTouchStart);
      touchArea.removeEventListener('touchmove', handleTouchMove);
      touchArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gamePhase]);

  if (gamePhase !== "playing") return null;

  return (
    <div
      ref={touchAreaRef}
      className="absolute inset-0 z-5"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/50 text-xs bg-black/30 px-2 py-1 rounded">
        Touch anywhere to move
      </div>
    </div>
  );
}
