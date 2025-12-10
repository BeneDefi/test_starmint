import {
  ArrowLeft,
  User,
  Trophy,
  Target,
  Package,
  Star,
  Zap,
  Shield,
  Rocket,
  Crown,
  Medal,
  TrendingUp,
  Clock,
  Gamepad2,
  Calendar,
  Award,
  Users,
  Flame,
  ShoppingBag,
  Gift,
  Activity,
  Heart,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { useMiniKit } from "../../lib/miniapp/minikit";
import { usePlayerStats } from "../../lib/stores/usePlayerStats";
import { useEffect, useState } from "react";
import { SocialLeaderboard } from "../../lib/social/leaderboard";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface ProfilePageProps {
  onBack: () => void;
}

// ProfilePicture component with proper error handling
function ProfilePicture({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    const initials = alt
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={`${className} bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold border-2 border-cyan-400`}>
        <span className="text-xs">{initials || <User className="w-4 h-4" />}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover border-2 border-cyan-400`}
      onError={() => {
        console.log("🖼️ ProfilePage: Profile picture failed to load:", src, "for user:", alt);
        setImageError(true);
      }}
      onLoad={() => {
        console.log("✅ ProfilePage: Profile picture loaded successfully:", src, "for user:", alt);
      }}
    />
  );
}

// Real inventory will be loaded from purchase history

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user } = useMiniKit();
  const {
    stats,
    isLoading,
    loadPlayerStats,
    setUserData,
    checkDailyLogin,
    purchaseHistory,
    currentStreak,
    lastLoginDate,
    farcasterFid,
    displayName,
    profilePicture,
  } = usePlayerStats();
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [friendsRanking, setFriendsRanking] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [gameSessions, setGameSessions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // Wallet hooks
  const { address, isConnecting, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    console.log("🔍 ProfilePage useEffect triggered with user:", user);

    let activeUser = user;

    // If no user from MiniKit hook, check global context
    if (!activeUser) {
      console.log(
        "❌ No MiniKit user context from hook, checking global context...",
      );
      const globalContext = (window as any).__miniKitContext__;
      if (globalContext?.user) {
        console.log(
          "✅ Found user in global MiniKit context:",
          globalContext.user,
        );
        activeUser = globalContext.user;
      }
    }

    if (activeUser) {
      console.log("👤 Using user context:", {
        fid: activeUser.fid,
        displayName: activeUser.displayName,
      });
      // Set user data in the store
      setUserData(
        activeUser.fid,
        activeUser.displayName || `Player ${activeUser.fid}`,
        activeUser.pfpUrl || "",
      );
      // Load player statistics
      console.log("📊 About to call loadPlayerStats with FID:", activeUser.fid);
      loadPlayerStats(activeUser.fid);

      // Check daily login
      checkDailyLogin();

      // Load social data
      loadSocialData(activeUser.fid);

      // Load detailed game history
      loadGameHistory(activeUser.fid);
    } else {
      console.log(
        "❌ No user context available anywhere, checking for persisted data...",
      );

      // Fallback: try to get user data from persisted store or JWT token
      const persistedFid = farcasterFid;
      console.log("🔄 Checking persisted FID from store:", persistedFid);

      if (persistedFid) {
        console.log("✅ Using persisted FID for data loading:", persistedFid);
        // Load data with persisted FID
        loadPlayerStats(persistedFid);
        checkDailyLogin();
        loadSocialData(persistedFid);
        loadGameHistory(persistedFid);
      } else {
        console.log("🔑 No persisted FID available, using fallback data...");
        // No user data available, component will show default state
      }
    }
  }, [user, loadPlayerStats, setUserData, checkDailyLogin, farcasterFid]);

  // Listen for game completion events to refresh profile data
  useEffect(() => {
    const handleGameCompleted = (event: CustomEvent) => {
      console.log("🎮 Game completed event received:", event.detail);

      // Use same fallback mechanism as initial load
      let refreshUser = user;
      if (!refreshUser) {
        const globalContext = (window as any).__miniKitContext__;
        if (globalContext?.user) {
          console.log(
            "🔄 Using global context for game completion refresh:",
            globalContext.user,
          );
          refreshUser = globalContext.user;
        }
      }

      if (refreshUser) {
        // Refresh player stats and game history after game completion
        setTimeout(() => {
          loadPlayerStats(refreshUser.fid);
          loadGameHistory(refreshUser.fid);
          console.log("📊 Profile data refreshed after game completion");
        }, 1000); // Small delay to ensure server-side processing is complete
      } else if (farcasterFid) {
        // Fallback to stored FID
        console.log(
          "🔄 Using stored FID for game completion refresh:",
          farcasterFid,
        );
        setTimeout(() => {
          loadPlayerStats(farcasterFid);
          loadGameHistory(farcasterFid);
          console.log("📊 Profile data refreshed using stored FID");
        }, 1000);
      } else {
        console.log("⚠️ No user context available for game completion refresh");
      }
    };

    window.addEventListener(
      "gameCompleted",
      handleGameCompleted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "gameCompleted",
        handleGameCompleted as EventListener,
      );
    };
  }, [user, loadPlayerStats, farcasterFid]);

  // Note: Auto-wallet connection disabled - user must manually connect via UI
  // The MiniKit SDK UserProfile type doesn't include verified_accounts property

  const loadSocialData = async (fid: number) => {
    try {
      const leaderboard = SocialLeaderboard.getInstance();

      // Get player's global rank (mock implementation)
      const globalBoard = await leaderboard.getLeaderboard({
        timeframe: "allTime",
        friends: false,
      });

      // Ensure globalBoard is an array before calling findIndex
      if (Array.isArray(globalBoard)) {
        const rank = globalBoard.findIndex((entry) => entry.fid === fid) + 1;
        setPlayerRank(rank > 0 ? rank : null);
      } else {
        console.error("globalBoard is not an array:", globalBoard);
        setPlayerRank(null);
      }

      // Get friends ranking
      const friends = await leaderboard.getFriendsRanking(fid);
      if (Array.isArray(friends)) {
        setFriendsRanking(friends.slice(0, 3)); // Top 3 friends
      } else {
        console.error("friends is not an array:", friends);
        setFriendsRanking([]);
      }
    } catch (error) {
      console.error("Failed to load social data:", error);
    }
  };

  const loadGameHistory = async (fid: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/player-sessions/${fid}?limit=20`);
      if (response.ok) {
        const data = await response.json();
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        setGameSessions(sessions);

        // Create recent activity from game sessions with validation
        const activities = sessions
          .slice(0, 5)
          .map((session: any, index: number) => {
            // Validate session data and provide fallbacks
            const safeScore =
              typeof session.score === "number" ? session.score : 0;
            const safeLevel =
              typeof session.level === "number" ? session.level : 1;
            const safeGameTime =
              typeof session.gameTime === "number" ? session.gameTime : 0;
            const safePlayedAt = session.playedAt
              ? new Date(session.playedAt)
              : new Date();

            return {
              id: `session-${session.id || index}`,
              type: "game",
              title: `Game Session #${sessions.length - index}`,
              description: `Score: ${safeScore.toLocaleString()} | Level: ${safeLevel} | ${Math.round(safeGameTime / 60000)}m ${Math.round((safeGameTime % 60000) / 1000)}s`,
              timestamp: safePlayedAt,
              icon: "gamepad",
              value: safeScore,
            };
          });
        setRecentActivity(activities);
      } else {
        console.warn(
          "Failed to fetch game sessions:",
          response.status,
          response.statusText,
        );
        setGameSessions([]);
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("Failed to load game history:", error);
      setGameSessions([]);
      setRecentActivity([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculate experience level based on total score
  const experienceLevel = Math.floor(stats.totalScore / 1000) + 1;
  const nextLevelXP = experienceLevel * 1000;
  const currentLevelProgress = stats.totalScore % 1000;

  // Format time played
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format game time from milliseconds
  const formatGameTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Calculate average score
  const averageScore =
    stats.gamesPlayed > 0
      ? Math.round(stats.totalScore / stats.gamesPlayed)
      : 0;

  // Calculate accuracy from game sessions with error handling
  const calculateOverallAccuracy = () => {
    if (!Array.isArray(gameSessions) || gameSessions.length === 0) return 0;
    const accuracySessions = gameSessions.filter(
      (s) =>
        s &&
        typeof s.accuracy === "number" &&
        s.accuracy >= 0 &&
        s.accuracy <= 1,
    );
    if (accuracySessions.length === 0) return 0;
    const totalAccuracy = accuracySessions.reduce(
      (sum, s) => sum + s.accuracy * 100,
      0,
    );
    return Math.round(totalAccuracy / accuracySessions.length);
  };

  const overallAccuracy = calculateOverallAccuracy();

  // Get player title based on stats
  const getPlayerTitle = () => {
    if (stats.highScore > 50000)
      return { title: "Space Legend", color: "text-purple-400", icon: Crown };
    if (stats.enemiesDestroyed > 500)
      return { title: "Elite Warrior", color: "text-orange-400", icon: Medal };
    if (stats.gamesPlayed > 50)
      return { title: "Veteran Pilot", color: "text-blue-400", icon: Award };
    return { title: "Space Cadet", color: "text-gray-400", icon: User };
  };

  const playerTitle = getPlayerTitle();

  // Share functionality
  const shareUrl = 'https://farcaster.xyz/miniapps/DEE7X1AmwTMp/space-shooter-game';
  const shareText = `🚀 Just scored ${stats.highScore.toLocaleString()} points in STARMINT! 🎮\n\nCheck out my stats:\n⭐ Level ${experienceLevel}\n🎯 ${stats.enemiesDestroyed} enemies destroyed\n🔥 ${currentStreak} day streak\n\nCan you beat my score? Play now!`;

  const handleShare = (platform: string) => {
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    
    let shareLink = '';
    
    switch (platform) {
      case 'farcaster':
        shareLink = `https://warpcast.com/~/compose?text=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer');
      setShowShareDialog(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareDialog(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Space background elements */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute top-10 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/30 rounded-full blur-2xl" />

      {/* Stars */}
      {Array.from({ length: 50 }, (_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}

      <div className="relative z-10 p-3 sm:p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onBack}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                PROFILE
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Button */}
            <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
              <DialogTrigger asChild>
                <button className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-cyan-400 font-medium hidden sm:inline">Wallet</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-cyan-500/30">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Wallet
                  </DialogTitle>
                </DialogHeader>
                
                {isConnected && address && !walletError ? (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-300">Verified Farcaster Wallet</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 text-sm bg-slate-700/30 rounded-lg p-3">
                      <span className="font-mono text-cyan-400">
                        {`${address.slice(0, 6)}...${address.slice(-4)}`}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(address);
                            setCopiedAddress(true);
                            setTimeout(() => setCopiedAddress(false), 2000);
                          } catch (error) {
                            console.error('Failed to copy:', error);
                          }
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {copiedAddress ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        disconnect();
                        setShowWalletDialog(false);
                      }}
                      className="w-full text-sm text-red-400 hover:text-red-300 py-2 transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : walletError ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
                    <p className="text-sm text-red-400">{walletError}</p>
                  </div>
                ) : isConnecting ? (
                  <div className="text-center py-6">
                    <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Connecting wallet...</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-400">
                    No wallet connected
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Share Button */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <button className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] flex items-center gap-2">
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                  <span className="text-cyan-400 font-medium hidden sm:inline">Share</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-cyan-500/30">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-cyan-400" />
                  Share Your Stats
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                {/* Farcaster */}
                <button
                  onClick={() => handleShare('farcaster')}
                  className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 hover:border-purple-400/60 rounded-lg p-4 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-purple-400" viewBox="0 0 1000 1000" fill="currentColor">
                    <path d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"/>
                    <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
                    <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.445H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H675.556V746.667Z"/>
                  </svg>
                  <span className="text-sm text-purple-400 font-medium">Farcaster</span>
                </button>

                {/* X/Twitter */}
                <button
                  onClick={() => handleShare('twitter')}
                  className="bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 hover:border-blue-400/60 rounded-lg p-4 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-sm text-blue-400 font-medium">X / Twitter</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => handleShare('telegram')}
                  className="bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 hover:border-sky-400/60 rounded-lg p-4 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span className="text-sm text-sky-400 font-medium">Telegram</span>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 hover:border-green-400/60 rounded-lg p-4 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="text-sm text-green-400 font-medium">WhatsApp</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="bg-gray-600/20 hover:bg-gray-600/40 border border-gray-500/30 hover:border-gray-400/60 rounded-lg p-4 transition-all duration-200 flex flex-col items-center gap-2 col-span-2 sm:col-span-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-8 h-8 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-400 font-medium">Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 md:space-y-6">
          {/* Player Stats */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              {user || displayName ? (
                <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                  {user?.pfpUrl || profilePicture ? (
                    <img
                      src={user?.pfpUrl || profilePicture || ""}
                      alt={user?.displayName || displayName || "User profile"}
                      className="w-full h-full rounded-full border-2 border-cyan-400 object-cover"
                      onError={(e) => {
                        console.log(
                          "Profile picture failed to load:",
                          user?.pfpUrl || profilePicture,
                        );
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallbackDiv =
                          target.nextElementSibling as HTMLDivElement;
                        if (fallbackDiv) {
                          fallbackDiv.classList.remove("hidden");
                        }
                      }}
                      onLoad={() => {
                        console.log(
                          "Profile picture loaded successfully:",
                          user?.pfpUrl || profilePicture,
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-cyan-400 ${user?.pfpUrl || profilePicture ? "hidden" : ""}`}
                  >
                    <span className="text-white font-bold text-sm sm:text-base">
                      {user?.displayName || displayName
                        ? (user?.displayName || displayName || "")
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-cyan-400">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
                    {user?.displayName || displayName || "Player"}
                  </h2>
                  {playerRank && playerRank <= 10 && (
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mt-1 sm:mt-0" />
                  )}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                  <playerTitle.icon
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${playerTitle.color}`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-medium ${playerTitle.color}`}
                  >
                    {playerTitle.title}
                  </span>
                </div>
                <div className="text-gray-300 text-xs sm:text-sm space-y-1">
                  {user && (
                    <div className="text-cyan-400">@{user.username}</div>
                  )}
                  {playerRank && <div>Rank #{playerRank.toLocaleString()}</div>}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-3 mt-2">
                  <div className="text-xs sm:text-sm shrink-0">
                    <span className="text-gray-400">Level </span>
                    <span className="text-white font-bold">
                      {experienceLevel}
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(currentLevelProgress / 1000) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 shrink-0">
                    {currentLevelProgress}/{1000} XP
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3 animate-pulse">
                  <div className="h-8 bg-slate-600 rounded mb-1"></div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    High Score
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3 animate-pulse">
                  <div className="h-8 bg-slate-600 rounded mb-1"></div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Enemies Defeated
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3 animate-pulse">
                  <div className="h-8 bg-slate-600 rounded mb-1"></div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Games Played
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3 animate-pulse">
                  <div className="h-8 bg-slate-600 rounded mb-1"></div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Time Played
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-cyan-400">
                    {stats.highScore.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    High Score
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-cyan-400">
                    {stats.enemiesDestroyed.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Enemies Defeated
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-cyan-400">
                    {stats.gamesPlayed}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Games Played
                  </div>
                </div>
                <div className="text-center bg-slate-700/30 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-cyan-400">
                    {formatTime(stats.timePlayedMinutes)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Time Played
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Streak & Login Stats */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
              {/* Current Streak */}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-3 sm:p-4 border border-orange-500/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 shrink-0" />
                    <span className="text-xs sm:text-sm text-white font-medium truncate">
                      Current Streak
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold text-orange-400">
                      {currentStreak}
                    </div>
                    <div className="text-xs text-gray-400">days</div>
                  </div>
                </div>
              </div>

              {/* Max Streak */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 sm:p-4 border border-purple-500/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />
                    <span className="text-xs sm:text-sm text-white font-medium truncate">
                      Best Streak
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold text-purple-400">
                      {stats.maxStreak}
                    </div>
                    <div className="text-xs text-gray-400">days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Status */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 sm:p-4 border border-green-500/30 mt-3 sm:mt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0" />
                  <span className="text-sm sm:text-base text-white font-medium truncate">
                    Login Days
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-green-400">
                    {stats.dailyLogins}
                  </div>
                  <div className="text-xs text-gray-400">total days</div>
                </div>
              </div>
            </div>
          </div>

          {/* Friends Ranking */}
          {friendsRanking.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  Friends Ranking
                </h3>
              </div>
              <div className="space-y-3">
                {friendsRanking.map((friend, index) => (
                  <div
                    key={friend.fid}
                    className="flex items-center space-x-4 p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div className="text-2xl font-bold text-cyan-400">
                      #{index + 1}
                    </div>
                    <ProfilePicture
                      src={friend.pfpUrl}
                      alt={friend.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-white">
                        {friend.displayName}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {friend.score.toLocaleString()} pts
                      </p>
                    </div>
                    {index === 0 && (
                      <Crown className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Statistics */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Performance Analytics
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 sm:p-4 border border-purple-500/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />
                    <span className="text-xs sm:text-sm text-white font-medium truncate">
                      Avg Score
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold text-purple-400">
                      {averageScore.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">per game</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg p-3 sm:p-4 border border-cyan-500/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                    <span className="text-xs sm:text-sm text-white font-medium truncate">
                      Accuracy
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold text-cyan-400">
                      {overallAccuracy}%
                    </div>
                    <div className="text-xs text-gray-400">overall</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 sm:p-4 border border-green-500/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0" />
                  <span className="text-sm sm:text-base text-white font-medium truncate">
                    Total Score Accumulated
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {stats.totalScore.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Game History */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Game History
                </h3>
              </div>
              {gameSessions.length > 0 && (
                <div className="text-xs sm:text-sm text-gray-400">
                  {gameSessions.length} recent games
                </div>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
              {loadingHistory ? (
                <div className="text-center py-4 text-gray-400">
                  Loading game history...
                </div>
              ) : gameSessions.length > 0 ? (
                gameSessions.map((session, index) => {
                  const gameDate = new Date(session.playedAt);
                  const isToday =
                    gameDate.toDateString() === new Date().toDateString();
                  const isYesterday =
                    gameDate.toDateString() ===
                    new Date(Date.now() - 86400000).toDateString();

                  let dateLabel = gameDate.toLocaleDateString();
                  if (isToday) dateLabel = "Today";
                  else if (isYesterday) dateLabel = "Yesterday";

                  return (
                    <div
                      key={session.id || index}
                      className="p-3 sm:p-4 bg-slate-700/50 rounded-lg border border-gray-600/30 hover:border-cyan-500/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-xs sm:text-sm">
                              #{gameSessions.length - index}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-white font-medium text-sm sm:text-base truncate">
                                Game #{gameSessions.length - index}
                              </h4>
                              <div className="text-xs text-gray-400">
                                {dateLabel}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div>
                                <span className="text-gray-400">Score: </span>
                                <span className="text-cyan-400 font-medium">
                                  {session.score.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Level: </span>
                                <span className="text-white font-medium">
                                  {session.level}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Enemies: </span>
                                <span className="text-orange-400 font-medium">
                                  {session.enemiesKilled}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Time: </span>
                                <span className="text-green-400 font-medium">
                                  {formatGameTime(session.gameTime)}
                                </span>
                              </div>
                              {session.accuracy && (
                                <div className="col-span-2">
                                  <span className="text-gray-400">
                                    Accuracy:{" "}
                                  </span>
                                  <span className="text-purple-400 font-medium">
                                    {Math.round(session.accuracy * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right shrink-0">
                          <div className="text-lg sm:text-xl font-bold text-cyan-400">
                            {session.score.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {gameDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No games played yet</p>
                  <p className="text-sm">
                    Start playing to see your game history!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Recent Activity
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={activity.id || index}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {activity.title}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {activity.timestamp
                        ? activity.timestamp.toLocaleDateString() ===
                          new Date().toLocaleDateString()
                          ? "Today"
                          : activity.timestamp.toLocaleDateString() ===
                              new Date(
                                Date.now() - 86400000,
                              ).toLocaleDateString()
                            ? "Yesterday"
                            : activity.timestamp.toLocaleDateString()
                        : "Recent"}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          High Score
                        </p>
                        <p className="text-gray-400 text-xs">
                          {stats.highScore.toLocaleString()} points
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Best</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          Total Games
                        </p>
                        <p className="text-gray-400 text-xs">
                          {stats.gamesPlayed} sessions played
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">All time</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Inventory */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">
                Inventory & Power-ups
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Show power-up collection stats */}
              <div className="bg-slate-700/50 rounded-lg p-3 border border-cyan-500/30">
                <div className="flex items-center space-x-2 mb-1">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-white text-sm font-medium">Shield</span>
                </div>
                <p className="text-xs text-gray-400">Protection power-up</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3 border border-orange-500/30">
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-white text-sm font-medium">
                    Rapid Fire
                  </span>
                </div>
                <p className="text-xs text-gray-400">Speed boost power-up</p>
              </div>

              {/* Inventory items from purchase history will be shown here */}
            </div>

            <div className="text-center py-4 text-gray-400">
              <p className="text-sm">Collect items by playing the game!</p>
            </div>
          </div>

          {/* Purchase History */}
          {purchaseHistory.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <div className="flex items-center space-x-3 mb-4">
                <ShoppingBag className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  Purchase History
                </h3>
                <div className="bg-cyan-500/20 px-2 py-1 rounded-full">
                  <span className="text-cyan-400 text-xs font-medium">
                    {purchaseHistory.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {purchaseHistory.slice(0, 10).map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          purchase.itemType === "weapons"
                            ? "bg-red-500/20 border border-red-500/50"
                            : purchase.itemType === "defense"
                              ? "bg-blue-500/20 border border-blue-500/50"
                              : "bg-green-500/20 border border-green-500/50"
                        }`}
                      >
                        {purchase.itemType === "weapons" ? (
                          <Zap className="w-4 h-4 text-red-400" />
                        ) : purchase.itemType === "defense" ? (
                          <Shield className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Rocket className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">
                          {purchase.itemName}
                        </h4>
                        <p className="text-xs text-gray-400 capitalize">
                          {purchase.itemType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-cyan-400">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full" />
                        <span className="text-sm font-medium">
                          {purchase.price}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                {purchaseHistory.length > 10 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400">
                      +{purchaseHistory.length - 10} more purchases
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Social Features */}
          {(user || farcasterFid) && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <div className="flex items-center space-x-3 mb-4">
                <Heart className="w-6 h-6 text-pink-400" />
                <h3 className="text-xl font-bold text-white">
                  Farcaster Profile
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
                  <div className="relative w-12 h-12">
                    {user?.pfpUrl || profilePicture ? (
                      <img
                        src={user?.pfpUrl || profilePicture || ""}
                        alt={user?.displayName || displayName || "Profile"}
                        className="w-12 h-12 rounded-full border-2 border-cyan-400 object-cover"
                        onError={(e) => {
                          console.log(
                            "Farcaster profile picture failed to load",
                          );
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallbackDiv =
                            target.nextElementSibling as HTMLDivElement;
                          if (fallbackDiv) {
                            fallbackDiv.classList.remove("hidden");
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`absolute inset-0 w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-cyan-400 ${user?.pfpUrl || profilePicture ? "hidden" : ""}`}
                    >
                      <span className="text-white font-bold text-sm">
                        {user?.displayName || displayName
                          ? (user?.displayName || displayName || "")
                              .charAt(0)
                              .toUpperCase()
                          : "U"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white">
                      {user?.displayName || displayName || "Player"}
                    </h4>
                    <p className="text-cyan-400">
                      @{user?.username || `fid:${user?.fid || farcasterFid}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      FID: {user?.fid || farcasterFid}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-cyan-400">
                      {stats.socialShares}
                    </div>
                    <div className="text-xs text-gray-400">Shares</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-cyan-400">
                      {stats.friendsInvited}
                    </div>
                    <div className="text-xs text-gray-400">Invited</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
