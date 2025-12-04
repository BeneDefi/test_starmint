import { useEffect, useState } from "react";
import Game from "./components/Game";
import MainMenu from "./components/MainMenu";
import MiniAppGame from "./components/MiniAppGame";
import MiniAppHeader from "./components/MiniAppHeader";
import WelcomeDialog from "./components/WelcomeDialog";
import { MiniKitProvider, useMiniKit } from "./lib/miniapp/minikit";
import { useAudio } from "./lib/stores/useAudio";
import { useGameState } from "./lib/stores/useGameState";
import { GameAccessibility } from "./lib/accessibility/GameAccessibility";
import { AdvancedHaptics } from "./lib/ux/AdvancedHaptics";
import { WagmiProviderWrapper } from './providers/wagmi';
import { FarcasterAuthProvider } from './context/FarcasterAuthContext';
import "@fontsource/inter";
import "./index.css";
import "./styles/accessibility.css";

function AppContent() {
  const [showMenu, setShowMenu] = useState(true);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { gamePhase } = useGameState();
  const { setBackgroundMusic, setHitSound, setSuccessSound, setShootSound, setGameOverSound } = useAudio();
  const { isReady, context, notifyReady, user } = useMiniKit();

  useEffect(() => {
    // Check if running in Mini App context
    if (context || window.location.search.includes('miniapp=true')) {
      setIsMiniApp(true);
      setShowMenu(false);
    }

    // Initialize advanced systems
    GameAccessibility.initialize();
    AdvancedHaptics.initialize();

    // Initialize audio elements
    const backgroundMusic = new Audio("/sounds/acrade_background.mp3");
    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    const shootSound = new Audio("/sounds/hit.mp3"); // Use hit sound for shooting with different settings
    const gameOverSound = new Audio("/sounds/game_over.mp3");

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    setBackgroundMusic(backgroundMusic);
    setHitSound(hitSound);
    setSuccessSound(successSound);
    setShootSound(shootSound);
    setGameOverSound(gameOverSound);
  }, [setBackgroundMusic, setHitSound, setSuccessSound, setShootSound, setGameOverSound]);

  // Check if first-time user and show welcome dialog
  useEffect(() => {
    if (isReady && isMiniApp && user) {
      const hasSeenWelcome = localStorage.getItem('starmint_welcome_shown');
      if (!hasSeenWelcome) {
        const timer = setTimeout(() => {
          setShowWelcome(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isReady, isMiniApp, user]);

  // Call sdk.actions.ready() when app content is fully loaded and visible
  // Note: User identity is initialized by MiniKitProvider before gameplay starts
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        (async () => {
          await notifyReady();
        })();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady, notifyReady]);

  // Return to menu when game ends
  useEffect(() => {
    if (gamePhase === "ended") {
      const timer = setTimeout(() => {
        setShowMenu(true);
      }, 3000); // Show menu after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [gamePhase]);

  const handleStartGame = () => {
    setShowMenu(false);
  };

  const handleBackToMenu = () => {
    setShowMenu(true);
  };

  return (
    <div className={`w-full h-full bg-black ${showMenu ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      <MiniAppHeader
        title="Galaxiga Classic Space Shooter"
        description="Battle aliens in space, earn tokens, compete with friends in this classic arcade shooter reimagined for Web3."
        imageUrl="https://galaxiga.game/og-image.png"
      />

      {!isReady ? (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading Galaxiga...</p>
          </div>
        </div>
      ) : isMiniApp ? (
        <MiniAppGame />
      ) : showMenu ? (
        <MainMenu onStartGame={handleStartGame} />
      ) : (
        <Game onBackToMenu={handleBackToMenu} />
      )}

      {/* Welcome Dialog for first-time users */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}

function App() {
  return (
    <WagmiProviderWrapper>
      <MiniKitProvider>
        <FarcasterAuthProvider>
          <AppContent />
        </FarcasterAuthProvider>
      </MiniKitProvider>
    </WagmiProviderWrapper>
  );
}

export default App;
