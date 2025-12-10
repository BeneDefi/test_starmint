import { WalletManager } from '../web3/wallet';
import type { Address } from 'viem/accounts';

export interface NFTReward {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes: Record<string, string | number>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tokenReward: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'score' | 'streak' | 'social' | 'time';
    value: number;
  };
  reward: NFTReward;
  unlocked: boolean;
}

export class NFTMintingSystem {
  private static instance: NFTMintingSystem;
  private walletManager: WalletManager;
  
  // Demo NFT contract address on Base (would be real contract in production)
  private NFT_CONTRACT_ADDRESS: Address = '0x1234567890123456789012345678901234567890';

  static getInstance(): NFTMintingSystem {
    if (!NFTMintingSystem.instance) {
      NFTMintingSystem.instance = new NFTMintingSystem();
    }
    return NFTMintingSystem.instance;
  }

  constructor() {
    this.walletManager = WalletManager.getInstance();
  }

  // Predefined achievement NFTs
  getAvailableAchievements(): Achievement[] {
    return [
      {
        id: 'first-flight',
        name: 'First Flight',
        description: 'Complete your first mission',
        icon: '🚀',
        requirement: { type: 'score', value: 1000 },
        reward: {
          id: 'first-flight-nft',
          name: 'Rookie Pilot Badge',
          description: 'Your first steps into the cosmos',
          imageUrl: '/nft/rookie-pilot.png',
          attributes: { rarity: 'common', type: 'achievement', mission: 'first' },
          rarity: 'common',
          tokenReward: 100
        },
        unlocked: false
      },
      {
        id: 'ace-pilot',
        name: 'Ace Pilot',
        description: 'Score over 50,000 points in a single game',
        icon: '✈️',
        requirement: { type: 'score', value: 50000 },
        reward: {
          id: 'ace-pilot-nft',
          name: 'Ace Pilot Wings',
          description: 'Elite pilot recognition',
          imageUrl: '/nft/ace-pilot.png',
          attributes: { rarity: 'rare', type: 'skill', level: 'ace' },
          rarity: 'rare',
          tokenReward: 500
        },
        unlocked: false
      },
      {
        id: 'social-commander',
        name: 'Social Commander',
        description: 'Invite 5 friends to play',
        icon: '👥',
        requirement: { type: 'social', value: 5 },
        reward: {
          id: 'social-commander-nft',
          name: 'Squad Leader Badge',
          description: 'Built a formidable space squadron',
          imageUrl: '/nft/squad-leader.png',
          attributes: { rarity: 'epic', type: 'social', friends: '5+' },
          rarity: 'epic',
          tokenReward: 1000
        },
        unlocked: false
      },
      {
        id: 'galaxy-legend',
        name: 'Galaxy Legend',
        description: 'Reach #1 on global leaderboard',
        icon: '👑',
        requirement: { type: 'score', value: 200000 },
        reward: {
          id: 'galaxy-legend-nft',
          name: 'Cosmic Crown',
          description: 'Ultimate galactic supremacy',
          imageUrl: '/nft/cosmic-crown.png',
          attributes: { rarity: 'legendary', type: 'champion', rank: 1 },
          rarity: 'legendary',
          tokenReward: 5000
        },
        unlocked: false
      }
    ];
  }

  checkAchievements(gameStats: {
    highScore: number;
    totalScore: number;
    gamesPlayed: number;
    socialShares: number;
    friendsInvited: number;
    streakDays: number;
  }): Achievement[] {
    const achievements = this.getAvailableAchievements();
    const unlockedAchievements: Achievement[] = [];

    achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      let unlocked = false;
      
      switch (achievement.requirement.type) {
        case 'score':
          unlocked = gameStats.highScore >= achievement.requirement.value;
          break;
        case 'social':
          unlocked = gameStats.friendsInvited >= achievement.requirement.value;
          break;
        case 'streak':
          unlocked = gameStats.streakDays >= achievement.requirement.value;
          break;
        case 'time':
          unlocked = gameStats.gamesPlayed >= achievement.requirement.value;
          break;
      }

      if (unlocked) {
        achievement.unlocked = true;
        unlockedAchievements.push(achievement);
      }
    });

    return unlockedAchievements;
  }

  async mintAchievementNFT(achievement: Achievement): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      // Ensure user is on Base network
      const switchedToBase = await this.walletManager.switchToBase();
      if (!switchedToBase) {
        return { success: false, error: 'Please switch to Base network' };
      }

      // Get user account
      const account = await this.walletManager.getAccount();
      if (!account) {
        return { success: false, error: 'Wallet not connected' };
      }

      // In a real implementation, this would call the NFT contract
      // For demo purposes, we'll simulate the minting process
      console.log('Minting NFT for achievement:', achievement.name);
      
      // Simulate contract interaction
      const mintData = this.encodeMintFunction(account, achievement);
      
      // Send transaction (simulation)
      const txHash = await this.walletManager.sendTransaction(
        this.NFT_CONTRACT_ADDRESS,
        '0', // No ETH required for minting
        mintData
      );

      if (txHash) {
        // In real app, would track NFT ownership
        console.log('NFT minted successfully:', txHash);
        return { success: true, txHash };
      } else {
        return { success: false, error: 'Transaction failed' };
      }

    } catch (error) {
      console.error('NFT minting failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async mintTokenReward(amount: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const account = await this.walletManager.getAccount();
      if (!account) {
        return { success: false, error: 'Wallet not connected' };
      }

      // Simulate STARMINT token minting
      console.log(`Minting ${amount} STARMINT tokens to ${account}`);
      
      // In real implementation, would call token contract mint function
      return { 
        success: true, 
        txHash: '0x' + Math.random().toString(36).substring(2, 66) 
      };
      
    } catch (error) {
      console.error('Token minting failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private encodeMintFunction(to: Address, achievement: Achievement): string {
    // This would encode the actual contract function call
    // For demo purposes, return mock encoded data
    return `0x${to.slice(2)}${achievement.id}`;
  }

  getRarityColor(rarity: NFTReward['rarity']): string {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
    }
  }

  getRarityGradient(rarity: NFTReward['rarity']): string {
    switch (rarity) {
      case 'common': return 'from-gray-600 to-gray-800';
      case 'rare': return 'from-blue-600 to-blue-800';
      case 'epic': return 'from-purple-600 to-purple-800';
      case 'legendary': return 'from-yellow-600 to-yellow-800';
    }
  }
}