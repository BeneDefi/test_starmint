import { create } from 'zustand';

interface NftConfig {
  contractAddress: string | null;
  chainId: number;
  chainName: string;
  mintFeeUsd: number;
  isEnabled: boolean;
  rarityThresholds: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

interface MintedNft {
  tokenId: number;
  txHash: string;
  score: number;
  level: number;
  enemiesDefeated: number;
  gameTime: number;
  rarity: string;
  mintedAt: string;
  viewUrl: string;
  openseaUrl: string;
}

interface NftStats {
  totalMinted: number;
  totalFeesCollectedEth: string;
  totalFeesCollectedUsd: string;
  commonMinted: number;
  uncommonMinted: number;
  rareMinted: number;
  epicMinted: number;
  legendaryMinted: number;
  highestScoreMinted: number;
}

interface MintFeeInfo {
  mintFeeUsd: number;
  mintFeeEth: string;
  mintFeeWei: string;
  ethPrice: number;
  timestamp: number;
}

interface NftMintingState {
  config: NftConfig | null;
  mintedNfts: MintedNft[];
  stats: NftStats | null;
  mintFee: MintFeeInfo | null;
  isLoading: boolean;
  isMinting: boolean;
  error: string | null;
  
  loadConfig: () => Promise<void>;
  loadMintedNfts: (walletAddress: string) => Promise<void>;
  loadStats: () => Promise<void>;
  loadMintFee: () => Promise<void>;
  requestMintSignature: (scoreData: {
    score: number;
    level: number;
    enemiesDefeated: number;
    gameTime: number;
    walletAddress: string;
    gameSessionId?: number;
    screenshotHash?: string;
  }) => Promise<{
    nonce: number;
    signature: string;
    expiresAt: string;
    externalUrl: string;
    screenshotHash: string;
    rarity: string;
  } | null>;
  confirmMint: (data: {
    txHash: string;
    tokenId: number;
    nonce: string;
    mintFeeEth: string;
    walletAddress: string;
  }) => Promise<MintedNft | null>;
  getRarity: (score: number) => string;
  reset: () => void;
}

const RARITY_THRESHOLDS = {
  legendary: 100000,
  epic: 50000,
  rare: 25000,
  uncommon: 10000,
  common: 0,
};

export const useNftMinting = create<NftMintingState>((set, get) => ({
  config: null,
  mintedNfts: [],
  stats: null,
  mintFee: null,
  isLoading: false,
  isMinting: false,
  error: null,

  loadConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/nft/config');
      if (response.ok) {
        const config = await response.json();
        set({ config });
      } else {
        throw new Error('Failed to load NFT config');
      }
    } catch (error) {
      console.error('Load config error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load config' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMintedNfts: async (walletAddress: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/nft/mints/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        set({ mintedNfts: data.mints || [] });
      }
    } catch (error) {
      console.error('Load minted NFTs error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load NFTs' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const response = await fetch('/api/nft/stats');
      if (response.ok) {
        const data = await response.json();
        set({ stats: data.stats });
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  },

  loadMintFee: async () => {
    try {
      const response = await fetch('/api/nft/mint-fee');
      if (response.ok) {
        const mintFee = await response.json();
        set({ mintFee });
      }
    } catch (error) {
      console.error('Load mint fee error:', error);
    }
  },

  requestMintSignature: async (scoreData) => {
    try {
      set({ isMinting: true, error: null });
      
      const response = await fetch('/api/nft/mint-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get mint signature');
      }

      const data = await response.json();
      return data.mintRequest;
    } catch (error) {
      console.error('Request mint signature error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to request signature' });
      return null;
    } finally {
      set({ isMinting: false });
    }
  },

  confirmMint: async (data) => {
    try {
      set({ isMinting: true, error: null });
      
      const response = await fetch('/api/nft/mint-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm mint');
      }

      const result = await response.json();
      
      // Add to minted NFTs list
      set((state) => ({
        mintedNfts: [result.nftMint, ...state.mintedNfts],
      }));
      
      // Refresh stats
      get().loadStats();
      
      return result.nftMint;
    } catch (error) {
      console.error('Confirm mint error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to confirm mint' });
      return null;
    } finally {
      set({ isMinting: false });
    }
  },

  getRarity: (score: number): string => {
    if (score >= RARITY_THRESHOLDS.legendary) return 'Legendary';
    if (score >= RARITY_THRESHOLDS.epic) return 'Epic';
    if (score >= RARITY_THRESHOLDS.rare) return 'Rare';
    if (score >= RARITY_THRESHOLDS.uncommon) return 'Uncommon';
    return 'Common';
  },

  reset: () => {
    set({
      error: null,
      isMinting: false,
    });
  },
}));

export const RARITY_COLORS: Record<string, string> = {
  Legendary: '#FFD700',
  Epic: '#A855F7',
  Rare: '#3B82F6',
  Uncommon: '#22C55E',
  Common: '#9CA3AF',
};

export const RARITY_GRADIENTS: Record<string, string> = {
  Legendary: 'from-yellow-400 via-amber-500 to-orange-500',
  Epic: 'from-purple-400 via-violet-500 to-purple-600',
  Rare: 'from-blue-400 via-sky-500 to-blue-600',
  Uncommon: 'from-green-400 via-emerald-500 to-green-600',
  Common: 'from-gray-400 via-slate-500 to-gray-600',
};
