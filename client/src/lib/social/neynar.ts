import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Initialize Neynar client with demo key for now
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS', // Demo key
});

export const neynarClient = new NeynarAPIClient(config);

export interface SocialUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  followingCount: number;
  powerBadge: boolean;
}

export interface GameScore {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  score: number;
  timestamp: Date;
  rank?: number;
}

export class SocialManager {
  private static instance: SocialManager;

  static getInstance(): SocialManager {
    if (!SocialManager.instance) {
      SocialManager.instance = new SocialManager();
    }
    return SocialManager.instance;
  }

  async getUser(fid: number): Promise<SocialUser | null> {
    try {
      const response = await neynarClient.fetchBulkUsers({ fids: [fid] });
      const user = response.users[0];
      if (!user) return null;

      return {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfpUrl: user.pfpUrl || '/default-avatar.png',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        powerBadge: user.powerBadge || false,
      };
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }

  async getUserFollowing(fid: number): Promise<SocialUser[]> {
    try {
      const response = await neynarClient.fetchUserFollowing({ 
        fid, 
        limit: 150 // Get good sample of following
      });
      
      return response.users.map(user => ({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfpUrl: user.pfpUrl || '/default-avatar.png',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        powerBadge: user.powerBadge || false,
      }));
    } catch (error) {
      console.error('Failed to fetch user following:', error);
      return [];
    }
  }

  async getBestFriends(fid: number): Promise<SocialUser[]> {
    try {
      const response = await neynarClient.fetchBestFriends({ fid });
      
      return response.users.map(user => ({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfpUrl: user.pfpUrl || '/default-avatar.png',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        powerBadge: user.powerBadge || false,
      }));
    } catch (error) {
      console.error('Failed to fetch best friends:', error);
      return [];
    }
  }

  async composeCast(text: string, embeds?: string[]): Promise<boolean> {
    try {
      // This would typically use the managed signer
      // For now, we'll return success to indicate the API call would work
      console.log('Would compose cast:', { text, embeds });
      return true;
    } catch (error) {
      console.error('Failed to compose cast:', error);
      return false;
    }
  }

  // Social leaderboard functionality
  createSocialLeaderboard(scores: GameScore[], userFid: number, following: SocialUser[]): {
    globalLeaderboard: GameScore[];
    friendsLeaderboard: GameScore[];
    userRank: { global: number; friends: number };
  } {
    // Sort scores by highest first
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    
    // Add ranks
    const globalLeaderboard = sortedScores.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

    // Get following FIDs for friend filtering
    const followingFids = new Set(following.map(f => f.fid));
    followingFids.add(userFid); // Include user in friends leaderboard

    // Create friends-only leaderboard
    const friendsScores = globalLeaderboard.filter(score => 
      followingFids.has(score.fid)
    );
    const friendsLeaderboard = friendsScores.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

    // Find user ranks
    const userGlobalRank = globalLeaderboard.findIndex(score => score.fid === userFid) + 1;
    const userFriendsRank = friendsLeaderboard.findIndex(score => score.fid === userFid) + 1;

    return {
      globalLeaderboard,
      friendsLeaderboard,
      userRank: {
        global: userGlobalRank || 0,
        friends: userFriendsRank || 0,
      },
    };
  }

  generateShareText(score: number, userRank: { global: number; friends: number }, bestFriends: SocialUser[]): string {
    const friendTags = bestFriends.slice(0, 3).map(f => `@${f.username}`).join(' ');
    
    let shareText = `🚀 Just scored ${score.toLocaleString()} points in Galaxiga Classic Space Shooter! `;
    
    if (userRank.friends > 0 && userRank.friends <= 10) {
      shareText += `I'm ranked #${userRank.friends} among my friends! `;
    }
    
    if (userRank.global > 0 && userRank.global <= 100) {
      shareText += `Global rank: #${userRank.global}! `;
    }
    
    shareText += `Think you can beat me? 👾 ${friendTags}`;
    
    return shareText;
  }
}