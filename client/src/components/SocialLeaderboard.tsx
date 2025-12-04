import { useState, useEffect } from 'react';
import { Trophy, Users, Crown, Medal, Award, User } from 'lucide-react';
import { SocialManager, type GameScore, type SocialUser } from '../lib/social/neynar';
import { useMiniKit } from '../lib/miniapp/minikit';

interface SocialLeaderboardProps {
  onClose?: () => void;
}

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
      <div className={`${className} bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs`}>
        {initials || <User className="w-4 h-4" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}

export default function SocialLeaderboard({ onClose }: SocialLeaderboardProps) {
  const { user } = useMiniKit();
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('friends');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<GameScore[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<GameScore[]>([]);
  const [userRank, setUserRank] = useState<{ global: number; friends: number }>({ global: 0, friends: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [following, setFollowing] = useState<SocialUser[]>([]);

  const socialManager = SocialManager.getInstance();

  useEffect(() => {
    if (user) {
      loadLeaderboardData();
    }
  }, [user]);

  const loadLeaderboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's following list for friends leaderboard
      const userFollowing = await socialManager.getUserFollowing(user.fid);
      setFollowing(userFollowing);

      // Mock game scores data (in real app, this would come from your backend)
      const mockScores: GameScore[] = [
        {
          fid: user.fid,
          username: user.username || 'you',
          displayName: user.displayName || 'You',
          pfpUrl: user.pfpUrl || '/default-avatar.png',
          score: 85000,
          timestamp: new Date(),
        },
        // Add some mock friend scores based on following
        ...userFollowing.slice(0, 8).map((friend, index) => ({
          fid: friend.fid,
          username: friend.username,
          displayName: friend.displayName,
          pfpUrl: friend.pfpUrl,
          score: Math.floor(Math.random() * 150000) + 10000,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        })),
        // Add some mock global players
        ...Array.from({ length: 20 }, (_, index) => ({
          fid: 10000 + index,
          username: `player${index + 1}`,
          displayName: `Player ${index + 1}`,
          pfpUrl: '/default-avatar.png',
          score: Math.floor(Math.random() * 200000) + 5000,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        }))
      ];

      const leaderboardData = socialManager.createSocialLeaderboard(mockScores, user.fid, userFollowing);
      
      setGlobalLeaderboard(leaderboardData.globalLeaderboard);
      setFriendsLeaderboard(leaderboardData.friendsLeaderboard);
      setUserRank(leaderboardData.userRank);

    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
    setIsLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-cyan-400 font-bold w-5 text-center">{rank}</span>;
    }
  };

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : friendsLeaderboard;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/50 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <span>Leaderboard</span>
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Your Rank Summary */}
        {user && (
          <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <ProfilePicture
                src={user.pfpUrl}
                alt={user.displayName || 'You'}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <div className="text-white font-bold">{user.displayName || 'You'}</div>
                <div className="text-sm text-gray-300">
                  Global: #{userRank.global || '—'} • Friends: #{userRank.friends || '—'}
                </div>
              </div>
              <div className="text-cyan-400 font-bold">
                {currentLeaderboard.find(p => p.fid === user.fid)?.score.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'friends'
                ? 'bg-cyan-500 text-black'
                : 'bg-slate-700 text-gray-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends ({friendsLeaderboard.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'global'
                ? 'bg-cyan-500 text-black'
                : 'bg-slate-700 text-gray-300 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Global</span>
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-cyan-400">Loading rankings...</span>
            </div>
          ) : currentLeaderboard.length > 0 ? (
            currentLeaderboard.slice(0, 50).map((player) => (
              <div
                key={player.fid}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  user && player.fid === user.fid
                    ? 'bg-cyan-900/40 border border-cyan-500/40'
                    : 'bg-slate-700/30 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center w-6">
                  {getRankIcon(player.rank || 0)}
                </div>
                <ProfilePicture
                  src={player.pfpUrl}
                  alt={player.displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{player.displayName}</div>
                  <div className="text-cyan-400 text-xs">@{player.username}</div>
                </div>
                <div className="text-cyan-400 font-bold">
                  {player.score.toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No scores available</p>
              <p className="text-sm">Be the first to play and set a score!</p>
            </div>
          )}
        </div>

        {/* Social Encouragement */}
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
          <div className="text-sm text-gray-300 text-center">
            {activeTab === 'friends' ? (
              <>🎯 Compete with {following.length} friends • Invite more to climb higher!</>
            ) : (
              <>🌟 Compete globally with {globalLeaderboard.length.toLocaleString()} players!</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}