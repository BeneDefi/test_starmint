import { create } from "zustand";

interface VibrationState {
  isVibrationEnabled: boolean;
  isVibrationSupported: boolean;
  
  // Control functions
  toggleVibration: () => void;
  checkVibrationSupport: () => void;
  vibrateShoot: () => void;
  vibrateHit: () => void;
  vibrateEnemyDestroyed: () => void;
  vibratePlayerHit: () => void;
  vibrateGameOver: () => void;
}

export const useVibration = create<VibrationState>((set, get) => ({
  isVibrationEnabled: true, // Start enabled by default for mobile users
  isVibrationSupported: false,
  
  checkVibrationSupport: () => {
    // Check if the device supports vibration
    const supported = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
    set({ isVibrationSupported: supported });
    
    if (supported) {
      console.log("Vibration is supported on this device");
    } else {
      console.log("Vibration is not supported on this device");
    }
  },
  
  toggleVibration: () => {
    const { isVibrationEnabled } = get();
    const newVibrationState = !isVibrationEnabled;
    
    set({ isVibrationEnabled: newVibrationState });
    
    console.log(`Vibration ${newVibrationState ? 'enabled' : 'disabled'}`);
    
    // Give feedback when toggling
    if (newVibrationState && get().isVibrationSupported) {
      navigator.vibrate(50); // Short feedback vibration
    }
  },
  
  vibrateShoot: () => {
    const { isVibrationEnabled, isVibrationSupported } = get();
    if (isVibrationEnabled && isVibrationSupported) {
      // Light, quick vibration for shooting (10ms)
      navigator.vibrate(10);
    }
  },
  
  vibrateHit: () => {
    const { isVibrationEnabled, isVibrationSupported } = get();
    if (isVibrationEnabled && isVibrationSupported) {
      // Medium vibration for general hits (50ms)
      navigator.vibrate(50);
    }
  },
  
  vibrateEnemyDestroyed: () => {
    const { isVibrationEnabled, isVibrationSupported } = get();
    if (isVibrationEnabled && isVibrationSupported) {
      // Satisfying pattern for destroying enemies [hit-pause-hit]
      navigator.vibrate([30, 20, 40]);
    }
  },
  
  vibratePlayerHit: () => {
    const { isVibrationEnabled, isVibrationSupported } = get();
    if (isVibrationEnabled && isVibrationSupported) {
      // Strong vibration for player taking damage (100ms)
      navigator.vibrate(100);
    }
  },
  
  vibrateGameOver: () => {
    const { isVibrationEnabled, isVibrationSupported } = get();
    if (isVibrationEnabled && isVibrationSupported) {
      // Dramatic pattern for game over [long-pause-short-pause-short]
      navigator.vibrate([200, 100, 50, 50, 50]);
    }
  }
}));