import { ArrowLeft, Trophy, Star, Target, Filter, Users, Clock, Zap, Search, Loader2, Medal, TrendingUp, Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlayerStats } from "../../lib/stores/usePlayerStats";

interface LeaderboardPageProps {
  onBack: () => void;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  displayName?: string;
  profilePicture?: string;
  score: number;
  totalScore?: number;
  level?: number;
  enemiesDestroyed?: number;
  gamesPlayed?: number;
  timePlayedMinutes?: number;
}

interface LeaderboardMetadata {
  timeframe: string;
  category: string;
  limit: number;
  total: number;
}

type TimeframeFilter = 'daily' | 'weekly' | 'monthly' | 'all';
type CategoryFilter = 'score' | 'level' | 'enemies';

function ProfilePicture({ src, alt, className, showBorder = true }: { src?: string; alt: string; className: string; showBorder?: boolean }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    const initials = alt
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={`${className} bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold ${showBorder ? 'border-2 border-cyan-400' : ''}`}>
        <span className="text-xs sm:text-sm">{initials || <User className="w-3 h-3 sm:w-4 sm:h-4" />}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${showBorder ? 'border-2 border-cyan-400' : ''} object-cover`}
      onError={(e) => {
        console.log("🖼️ Leaderboard profile picture failed to load:", src, "for user:", alt);
        setImageError(true);
      }}
      onLoad={() => {
        console.log("✅ Leaderboard profile picture loaded successfully:", src, "for user:", alt);
      }}
    />
  );
}

export default function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [metadata, setMetadata] = useState<LeaderboardMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { stats, farcasterFid, displayName, profilePicture } = usePlayerStats();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '50',
        timeframe,
        category,
      });
      
      const response = await fetch(`/api/game/leaderboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, category]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold">{rank}</span>;
  };

  const getCategoryLabel = (cat: CategoryFilter) => {
    switch (cat) {
      case 'score': return 'High Score';
      case 'level': return 'Level Reached';
      case 'enemies': return 'Enemies Destroyed';
      default: return 'Score';
    }
  };

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'score': return entry.score?.toLocaleString() || '0';
      case 'level': return entry.level?.toString() || '1';
      case 'enemies': return entry.enemiesDestroyed?.toLocaleString() || '0';
      default: return entry.score?.toLocaleString() || '0';
    }
  };

  const getTimeframeLabel = (tf: TimeframeFilter) => {
    switch (tf) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return entry.username.toLowerCase().includes(query) ||
           entry.displayName?.toLowerCase().includes(query);
  });

  const currentUserRank = filteredLeaderboard.findIndex(entry => entry.userId === farcasterFid) + 1;
  const currentUserEntry = filteredLeaderboard.find(entry => entry.userId === farcasterFid);

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
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight">LEADERBOARD</h1>
                <p className="text-cyan-400 text-xs sm:text-sm truncate">{getCategoryLabel(category)} • {getTimeframeLabel(timeframe)}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 flex-shrink-0"
          >
            <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-cyan-500/30 mb-4 sm:mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            
            {/* Filter buttons */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Time Period</label>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'all'] as TimeframeFilter[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        timeframe === tf
                          ? 'bg-cyan-500 text-black'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      <Clock className="w-4 h-4 inline mr-1" />
                      {getTimeframeLabel(tf)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {(['score', 'level', 'enemies'] as CategoryFilter[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        category === cat
                          ? 'bg-cyan-500 text-black'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {cat === 'score' && <Trophy className="w-4 h-4 inline mr-1" />}
                      {cat === 'level' && <TrendingUp className="w-4 h-4 inline mr-1" />}
                      {cat === 'enemies' && <Zap className="w-4 h-4 inline mr-1" />}
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Loading leaderboard...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 mb-4">Failed to load leaderboard</div>
              <button
                onClick={fetchLeaderboard}
                className="bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {!loading && !error && (
          <div className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto">
            {filteredLeaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchQuery ? 'No players found matching your search' : 'No players found for this timeframe'}
                </p>
              </div>
            ) : (
              filteredLeaderboard.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.userId === farcasterFid;
                
                return (
                  <div
                    key={player.userId}
                    className={`bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border transition-all duration-300 ${
                      rank <= 3
                        ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent'
                        : isCurrentUser
                        ? 'border-cyan-500/70 bg-gradient-to-r from-cyan-500/10 to-transparent'
                        : 'border-cyan-500/30 hover:border-cyan-400/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                            rank === 1
                              ? 'bg-yellow-500 text-black'
                              : rank === 2
                              ? 'bg-gray-400 text-black'
                              : rank === 3
                              ? 'bg-orange-500 text-black'
                              : isCurrentUser
                              ? 'bg-cyan-500 text-black'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {getRankIcon(rank)}
                        </div>
                        <div className="flex items-center space-x-3">
                          <ProfilePicture
                            src={player.profilePicture}
                            alt={player.displayName || player.username}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                              <span>{player.displayName || player.username}</span>
                              {isCurrentUser && <span className="text-cyan-400 text-sm">(You)</span>}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <Target className="w-4 h-4" />
                              <span>Level {player.level || 1}</span>
                              {player.gamesPlayed && (
                                <span className="text-gray-500">• {player.gamesPlayed} games</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-cyan-400">
                          {getCategoryValue(player)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {category === 'score' ? 'points' : category === 'level' ? 'max level' : 'destroyed'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Your Rank */}
        {!loading && currentUserEntry && (
          <div className="mt-4 sm:mt-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border-2 border-cyan-500/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-500 text-black font-bold flex-shrink-0 text-sm sm:text-base">
                  {currentUserRank || '?'}
                </div>
                <ProfilePicture
                  src={currentUserEntry.profilePicture || profilePicture || undefined}
                  alt={currentUserEntry.displayName || displayName || "Your profile"}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">Your Rank</h3>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-300">
                    <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Level {currentUserEntry.level || 1}</span>
                    {currentUserEntry.gamesPlayed && (
                      <span className="text-gray-500 hidden sm:inline">• {currentUserEntry.gamesPlayed} games</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg sm:text-xl font-bold text-cyan-400">
                  {getCategoryValue(currentUserEntry)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  {category === 'score' ? 'points' : category === 'level' ? 'max level' : 'destroyed'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {!loading && metadata && (
          <div className="mt-3 sm:mt-4 bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Showing {metadata.total} players</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                <span className="truncate">{getTimeframeLabel(timeframe)}</span>
                <span>•</span>
                <span className="truncate">{getCategoryLabel(category)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}