import { SocialUser } from '../social/neynar';

export interface ShareImageData {
  score: number;
  rank: { global: number; friends: number };
  user: {
    displayName: string;
    pfpUrl: string;
    username: string;
  };
  achievements: string[];
  friendsPlaying: SocialUser[];
}

export class CustomShareGenerator {
  private static instance: CustomShareGenerator;

  static getInstance(): CustomShareGenerator {
    if (!CustomShareGenerator.instance) {
      CustomShareGenerator.instance = new CustomShareGenerator();
    }
    return CustomShareGenerator.instance;
  }

  generateShareImageUrl(data: ShareImageData): string {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      score: data.score.toString(),
      globalRank: data.rank.global.toString(),
      friendsRank: data.rank.friends.toString(),
      username: data.user.username,
      displayName: data.user.displayName,
      pfpUrl: data.user.pfpUrl,
      achievements: data.achievements.join(','),
      friendsCount: data.friendsPlaying.length.toString(),
    });
    
    return `${baseUrl}/api/share/image?${params.toString()}`;
  }

  generatePersonalizedShareUrl(fid: number): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${fid}`;
  }

  generateViralShareText(data: ShareImageData): string {
    const { score, rank, user, friendsPlaying } = data;
    
    let shareText = `🚀 Just scored ${score.toLocaleString()} points in Galaxiga Classic Space Shooter!\\n\\n`;
    
    // Add rank boasting
    if (rank.friends > 0 && rank.friends <= 5) {
      shareText += `💪 I'm #${rank.friends} among my friends! `;
    }
    
    if (rank.global > 0 && rank.global <= 100) {
      shareText += `🌟 Global rank: #${rank.global}! `;
    }
    
    // Add social proof
    if (friendsPlaying.length > 0) {
      const friendNames = friendsPlaying.slice(0, 3).map(f => `@${f.username}`);
      shareText += `\\n\\n${friendNames.join(', ')} - think you can beat my score? 👾`;
    }
    
    shareText += '\\n\\n🎮 Play now and compete for the leaderboard!';
    
    return shareText;
  }

  generateAchievementShareText(achievement: string, reward: string): string {
    return `🏆 Achievement Unlocked: "${achievement}"!\\n\\n` +
           `💰 Earned: ${reward} STARMINT tokens\\n\\n` +
           `🎮 Join me in Galaxiga Classic Space Shooter and unlock your own rewards!`;
  }

  // Generate dynamic share metadata for embeds
  generateShareMetadata(data: ShareImageData) {
    const imageUrl = this.generateShareImageUrl(data);
    
    return {
      title: `🚀 ${data.user.displayName} scored ${data.score.toLocaleString()} points!`,
      description: `Ranked #${data.rank.friends || data.rank.global} • Join the space battle and compete for the top spot!`,
      image: imageUrl,
      url: window.location.origin,
      type: 'website',
      siteName: 'Galaxiga Classic Space Shooter'
    };
  }
}