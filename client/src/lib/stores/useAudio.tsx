import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  shootSound: HTMLAudioElement | null;
  gameOverSound: HTMLAudioElement | null;
  isMuted: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setShootSound: (sound: HTMLAudioElement) => void;
  setGameOverSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playShoot: () => void;
  playGameOver: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  shootSound: null,
  gameOverSound: null,
  isMuted: true, // Start muted by default
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setShootSound: (sound) => set({ shootSound: sound }),
  setGameOverSound: (sound) => set({ gameOverSound: sound }),
  
  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    // Control background music based on mute state
    if (backgroundMusic) {
      if (newMutedState) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
      } else {
        // Only start playing if we're in a playing state
        const gamePhase = document.querySelector('[data-game-phase]')?.getAttribute('data-game-phase');
        if (gamePhase === 'playing') {
          backgroundMusic.play().catch(console.log);
        }
      }
    }
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }
      
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Success sound skipped (muted)");
        return;
      }
      
      successSound.currentTime = 0;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },

  playShoot: () => {
    const { shootSound, isMuted } = get();
    if (shootSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Shoot sound skipped (muted)");
        return;
      }
      
      // Clone the sound to allow rapid overlapping playback
      const soundClone = shootSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.2; // Quieter than hit sounds
      soundClone.playbackRate = 1.5; // Slightly faster/higher pitch
      soundClone.play().catch(error => {
        console.log("Shoot sound play prevented:", error);
      });
    }
  },

  playGameOver: () => {
    const { gameOverSound, isMuted } = get();
    if (gameOverSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Game over sound skipped (muted)");
        return;
      }
      
      gameOverSound.currentTime = 0;
      gameOverSound.volume = 0.5;
      gameOverSound.playbackRate = 0.7; // Slower/lower pitch for dramatic effect
      gameOverSound.play().catch(error => {
        console.log("Game over sound play prevented:", error);
      });
    }
  }
}));
