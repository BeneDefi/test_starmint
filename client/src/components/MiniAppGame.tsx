import { useState, useEffect, useRef } from 'react';
import { Share, Trophy, Users, Wallet, Star, Gift, Award, Bell } from 'lucide-react';
import { useMiniKit } from '../lib/miniapp/minikit';
import { CustomShareGenerator, type ShareImageData } from '../lib/sharing/customImages';
import { NFTMintingSystem, type Achievement } from '../lib/rewards/nftMinting';
import { PushNotificationSystem } from '../lib/notifications/pushSystem';
import GameCanvas from './GameCanvas';
import { useGameState } from '../lib/stores/useGameState';
import WalletConnect from './WalletConnect';
import SocialLeaderboard from './SocialLeaderboard';

export default function MiniAppGame() {
  const { user, isConnected, signIn, shareScore, addToApp } = useMiniKit();
  const { score, gamePhase, lives, level } = useGameState();
  const [showAchievement, setShowAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [gameStats, setGameStats] = useState({
    totalScore: 0,
    highScore: 0,
    enemiesDestroyed: 0,
    gamesPlayed: 0,
    timePlayedMinutes: 0,
    streakDays: 1,
    socialShares: 0,
    friendsInvited: 0
  });
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const shareGenerator = useRef(CustomShareGenerator.getInstance());
  const nftSystem = useRef(NFTMintingSystem.getInstance());
  const notificationSystem = useRef(PushNotificationSystem.getInstance());

  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      const enabled = await notificationSystem.current.initialize();
      setNotificationsEnabled(enabled);
      
      if (user && enabled) {
        await notificationSystem.current.generateNotificationToken(user.fid);
      }
    };
    
    initNotifications();
  }, [user]);

  useEffect(() => {
    // Check for new achievements when score changes
    if (score > 0) {
      const updatedStats = {
        ...gameStats,
        totalScore: gameStats.totalScore + score,
        highScore: Math.max(gameStats.highScore, score),
        enemiesDestroyed: gameStats.enemiesDestroyed + Math.floor(score / 100)
      };
      
      const achievements = nftSystem.current.checkAchievements(updatedStats);
      if (achievements.length > 0) {
        setNewAchievements(achievements);
        setNewAchievement(achievements[0]);
        setShowAchievement(true);
        
        // Send achievement notification
        if (user && notificationsEnabled) {
          notificationSystem.current.sendSocialTriggerNotification(user.fid, {
            type: 'achievement_unlocked',
            achievement: achievements[0].name
          });
        }
      }
      
      setGameStats(updatedStats);
    }
  }, [score, user, notificationsEnabled]);

  useEffect(() => {
    // Handle game end - update stats and check for social triggers
    if (gamePhase === 'ended' && user && score > 0) {
      const newStats = {
        ...gameStats,
        gamesPlayed: gameStats.gamesPlayed + 1,
        highScore: Math.max(gameStats.highScore, score)
      };
      setGameStats(newStats);
      
      // Check if this is a new high score for notifications
      if (score > gameStats.highScore && notificationsEnabled) {
        // Could trigger friend notifications here
        console.log('New high score achieved!', score);
      }
    }
  }, [gamePhase, user, score, gameStats, notificationsEnabled]);

  const handleShare = async () => {
    if (score > 0 && user) {
      // Generate viral share content
      const shareData: ShareImageData = {
        score,
        rank: { global: 15, friends: 3 }, // Mock ranks
        user: {
          displayName: user.displayName || 'Anonymous',
          pfpUrl: user.pfpUrl || '/default-avatar.png',
          username: user.username || 'user'
        },
        achievements: newAchievements.map(a => a.name),
        friendsPlaying: [] // Mock friends data
      };
      
      const viralText = shareGenerator.current.generateViralShareText(shareData);
      const personalizedUrl = shareGenerator.current.generatePersonalizedShareUrl(user.fid);
      
      // Share with enhanced content
      await shareScore(score);
      setGameStats(prev => ({ ...prev, socialShares: prev.socialShares + 1 }));
      
      console.log('Generated viral share:', viralText);
      console.log('Personalized URL:', personalizedUrl);
    }
  };

  const handleAddToApp = async () => {
    await addToApp();
  };

  const handleWalletConnect = async () => {
    if (!isConnected) {
      await signIn();
    } else {
      setShowWallet(true);
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-black via-purple-900/20 to-black">
      {/* Game Canvas */}
      <GameCanvas />

      {/* Mini App HUD */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="flex items-center justify-between">
          {/* User Profile */}
          <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-cyan-500/30">
            {user ? (
              <>
                <img 
                  src={user.pfpUrl} 
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <div className="text-white text-sm font-medium">{user.displayName}</div>
                  <div className="text-cyan-400 text-xs">@{user.username}</div>
                </div>
              </>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm">Sign In</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300"
            >
              <Trophy className="w-5 h-5 text-cyan-400" />
            </button>
            
            <button
              onClick={handleShare}
              className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300"
            >
              <Share className="w-5 h-5 text-cyan-400" />
            </button>
            
            <button
              onClick={handleWalletConnect}
              className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300"
            >
              <Wallet className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Achievement Notification */}
      {showAchievement && newAchievement && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/50 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">{newAchievement.icon}</div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Achievement Unlocked!</h3>
            <h4 className="text-lg font-medium text-white mb-2">{newAchievement.name}</h4>
            <p className="text-gray-300 mb-4">{newAchievement.description}</p>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Gift className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 font-bold">+{newAchievement.reward?.tokenReward || 0} STARMINT</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  if (newAchievement && user) {
                    const result = await nftSystem.current.mintAchievementNFT(newAchievement);
                    if (result.success) {
                      alert('🎉 NFT minted successfully!');
                    } else {
                      alert('❌ Minting failed: ' + result.error);
                    }
                  }
                  setShowAchievement(false);
                }}
                className="bg-purple-500 hover:bg-purple-400 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>Mint NFT</span>
              </button>
              <button
                onClick={() => setShowAchievement(false)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Ready State - Add to App Prompt */}
      {gamePhase === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-40">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/50 max-w-md mx-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to Galaxiga!</h2>
            <p className="text-gray-300 mb-6">
              Save this game to your apps for quick access and notifications when friends beat your score!
            </p>
            
            <div className="space-y-4">
              <button
                onClick={handleAddToApp}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Add to My Apps</span>
              </button>
              
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Trophy className="w-5 h-5" />
                <span>View Leaderboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Stats Display */}
      <div className="absolute bottom-4 left-4 right-4 z-40">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-cyan-400 text-lg font-bold">{score.toLocaleString()}</div>
              <div className="text-gray-300 text-xs">Score</div>
            </div>
            <div>
              <div className="text-cyan-400 text-lg font-bold">{gameStats.highScore.toLocaleString()}</div>
              <div className="text-gray-300 text-xs">Best</div>
            </div>
            <div>
              <div className="text-cyan-400 text-lg font-bold">{level}</div>
              <div className="text-gray-300 text-xs">Level</div>
            </div>
            <div>
              <div className="text-cyan-400 text-lg font-bold">{achievements.current.getTotalRewards()}</div>
              <div className="text-gray-300 text-xs">STARMINT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}