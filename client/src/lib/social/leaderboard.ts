// Social leaderboard system for Galaxiga Mini App

export interface LeaderboardEntry {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    score: number;
    rank: number;
    lastPlayed: Date;
    achievements: string[];
    totalGames: number;
  }
  
  export interface LeaderboardFilters {
    timeframe: 'daily' | 'weekly' | 'monthly' | 'allTime';
    friends: boolean;
    region?: string;
  }
  
  export class SocialLeaderboard {
    private static instance: SocialLeaderboard;
    private cache: Map<string, LeaderboardEntry[]> = new Map();
    private lastUpdate: Map<string, Date> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
    static getInstance(): SocialLeaderboard {
      if (!SocialLeaderboard.instance) {
        SocialLeaderboard.instance = new SocialLeaderboard();
      }
      return SocialLeaderboard.instance;
    }
  
    async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
      const cacheKey = this.getCacheKey(filters);
      const cached = this.cache.get(cacheKey);
      const lastUpdate = this.lastUpdate.get(cacheKey);
  
      // Return cached data if still fresh
      if (cached && lastUpdate && Date.now() - lastUpdate.getTime() < this.CACHE_DURATION) {
        return cached;
      }
  
      try {
        // In a real implementation, this would fetch from your backend API
        const leaderboard = await this.fetchLeaderboardData(filters);
        
        // Cache the results
        this.cache.set(cacheKey, leaderboard);
        this.lastUpdate.set(cacheKey, new Date());
        
        return leaderboard;
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Return cached data or empty array as fallback
        return cached || this.getMockLeaderboard();
      }
    }
  
    async submitScore(score: number, userFid: number): Promise<boolean> {
      try {
        // In a real implementation, this would submit to your backend
        await this.submitScoreToBackend(score, userFid);
        
        // Clear relevant caches to force refresh
        this.clearCaches();
        
        return true;
      } catch (error) {
        console.error('Failed to submit score:', error);
        return false;
      }
    }
  
    async getFriendsRanking(userFid: number): Promise<LeaderboardEntry[]> {
      // Get friends list from Farcaster
      const friends = await this.getFriendsList(userFid);
      
      // Get leaderboard with friends filter
      const friendsLeaderboard = await this.getLeaderboard({
        timeframe: 'weekly',
        friends: true
      });
  
      return friendsLeaderboard.filter(entry => 
        friends.includes(entry.fid) || entry.fid === userFid
      );
    }
  
    private getCacheKey(filters: LeaderboardFilters): string {
      return `${filters.timeframe}_${filters.friends}_${filters.region || 'global'}`;
    }
  
    private async fetchLeaderboardData(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
      try {
        const timeframe = filters.timeframe === 'allTime' ? 'all' : filters.timeframe;
        const response = await fetch(`/api/game/leaderboard?timeframe=${timeframe}&limit=50`);
    
        if (!response.ok) {
          console.warn(`Leaderboard API returned ${response.status}, using mock data`);
          return this.getMockLeaderboard();
        }
    
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Leaderboard API returned non-JSON response, using mock data');
          return this.getMockLeaderboard();
        }
    
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data && Array.isArray(data.leaderboard)) {
          return data.leaderboard;
        } else if (data && Array.isArray(data.entries)) {
          return data.entries;
        } else {
          console.error('Unexpected leaderboard response format:', data);
          return this.getMockLeaderboard();
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        return this.getMockLeaderboard();
      }
    }
  
    private async submitScoreToBackend(score: number, userFid: number): Promise<void> {
      // Mock implementation - replace with actual API call
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, userFid, timestamp: Date.now() })
      });
  
      if (!response.ok) {
        throw new Error('Failed to submit score');
      }
    }
  
    private async getFriendsList(userFid: number): Promise<number[]> {
      // Mock implementation - replace with Farcaster API call
      try {
        const response = await fetch(`/api/friends/${userFid}`);
        if (!response.ok) {
          console.warn(`Friends API returned ${response.status}, returning empty list`);
          return [];
        }
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Friends API returned non-JSON response, returning empty list');
          return [];
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Failed to get friends list:', error);
        return [];
      }
    }
  
    private clearCaches(): void {
      this.cache.clear();
      this.lastUpdate.clear();
    }
  
    private getMockLeaderboard(): LeaderboardEntry[] {
      return [
        {
          fid: 3621,
          username: 'spacehero',
          displayName: 'Space Hero',
          pfpUrl: 'https://example.com/pfp1.png',
          score: 125420,
          rank: 1,
          lastPlayed: new Date(),
          achievements: ['centurion', 'high_scorer'],
          totalGames: 47
        },
        {
          fid: 1234,
          username: 'starhunter',
          displayName: 'Star Hunter',
          pfpUrl: 'https://example.com/pfp2.png',
          score: 98750,
          rank: 2,
          lastPlayed: new Date(),
          achievements: ['first_blood', 'social_butterfly'],
          totalGames: 32
        },
        {
          fid: 5678,
          username: 'cosmicrider',
          displayName: 'Cosmic Rider',
          pfpUrl: 'https://example.com/pfp3.png',
          score: 87320,
          rank: 3,
          lastPlayed: new Date(),
          achievements: ['marathon_gamer'],
          totalGames: 28
        }
      ];
    }
  }
  
  // Real-time leaderboard updates using WebSocket
  export class RealtimeLeaderboard {
    private ws: WebSocket | null = null;
    private callbacks: ((entry: LeaderboardEntry) => void)[] = [];
  
    connect(): void {
      try {
        // TODO: WebSocket server not configured - disable real-time updates for now
        console.log('🔄 Real-time leaderboard disabled (WebSocket server not configured)');
        return;
        
        // Temporarily disabled until WebSocket server is set up
        // this.ws = new WebSocket(`wss://${window.location.host}/ws/leaderboard`);
        // 
        // this.ws.onmessage = (event) => {
        //   const data = JSON.parse(event.data);
        //   this.callbacks.forEach(callback => callback(data));
        // };
        // 
        // this.ws.onclose = () => {
        //   // Reconnect after 5 seconds
        //   setTimeout(() => this.connect(), 5000);
        // };
      } catch (error) {
        console.error('Failed to connect to realtime leaderboard:', error);
      }
    }
  
    onUpdate(callback: (entry: LeaderboardEntry) => void): void {
      this.callbacks.push(callback);
    }
  
    disconnect(): void {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.callbacks = [];
    }
  }