import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Token {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  isNative: boolean;
  enabled: boolean;
  balance?: string;
  price?: number;
}

export interface SwapHistory {
  id: number;
  txHash: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  usdNotional: string;
  feePaid: string;
  pointsEarned: number;
  createdAt: string;
}

export interface SwapPoints {
  totalPoints: number;
  availablePoints: number;
  pointsRedeemed: number;
  totalSwapVolumeUsd: string;
  swapCount: number;
  lastSwapAt?: string;
}

export interface SwapConfig {
  supportedTokens: Token[];
  chainId: number;
  chainName: string;
  swapRouterAddress: string | null;
  feeStructure: {
    minimumSwapUsd: number;
    flatFeeUsd: number;
    percentageFeeThresholdUsd: number;
    percentageFeeBps: number;
  };
  pointsSystem: {
    pointsPerTenDollars: number;
    starmintRedemptionEnabled: boolean;
    gameCreditsRedemptionEnabled: boolean;
  };
}

interface SwapState {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  slippage: number;
  isLoading: boolean;
  isSwapping: boolean;
  error: string | null;
  
  config: SwapConfig | null;
  points: SwapPoints | null;
  swapHistory: SwapHistory[];
  ethPrice: number;
  
  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;
  setSlippage: (slippage: number) => void;
  swapTokens: () => void;
  
  loadConfig: () => Promise<void>;
  loadPoints: (farcasterFid: number) => Promise<void>;
  loadSwapHistory: (farcasterFid: number) => Promise<void>;
  loadEthPrice: () => Promise<void>;
  
  calculateQuote: () => { amountOut: string; fee: string; points: number };
  recordSwap: (farcasterFid: number, txHash: string, amountIn: string, amountOut: string, feePaid: string, pointsEarned: number) => Promise<void>;
  
  reset: () => void;
}

const INITIAL_STATE = {
  fromToken: null,
  toToken: null,
  fromAmount: "",
  toAmount: "",
  slippage: 0.5,
  isLoading: false,
  isSwapping: false,
  error: null,
  config: null,
  points: null,
  swapHistory: [],
  ethPrice: 0,
};

export const useSwap = create<SwapState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setFromToken: (token: Token) => {
        set({ fromToken: token });
        const state = get();
        if (state.fromAmount) {
          const quote = state.calculateQuote();
          set({ toAmount: quote.amountOut });
        }
      },

      setToToken: (token: Token) => {
        set({ toToken: token });
        const state = get();
        if (state.fromAmount) {
          const quote = state.calculateQuote();
          set({ toAmount: quote.amountOut });
        }
      },

      setFromAmount: (amount: string) => {
        set({ fromAmount: amount });
        if (amount) {
          const quote = get().calculateQuote();
          set({ toAmount: quote.amountOut });
        } else {
          set({ toAmount: "" });
        }
      },

      setToAmount: (amount: string) => {
        set({ toAmount: amount });
      },

      setSlippage: (slippage: number) => {
        set({ slippage });
      },

      swapTokens: () => {
        const { fromToken, toToken, fromAmount, toAmount } = get();
        set({
          fromToken: toToken,
          toToken: fromToken,
          fromAmount: toAmount,
          toAmount: fromAmount,
        });
      },

      loadConfig: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch('/api/swap/config');
          if (response.ok) {
            const config = await response.json();
            set({ config });
            
            const enabledTokens = config.supportedTokens.filter((t: Token) => t.enabled);
            if (enabledTokens.length >= 2) {
              set({
                fromToken: enabledTokens.find((t: Token) => t.symbol === 'ETH') || enabledTokens[0],
                toToken: enabledTokens.find((t: Token) => t.symbol === 'USDC') || enabledTokens[1],
              });
            }
          }
        } catch (error) {
          console.error('Failed to load swap config:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadPoints: async (farcasterFid: number) => {
        try {
          const response = await fetch(`/api/swap/points/${farcasterFid}`);
          if (response.ok) {
            const points = await response.json();
            set({ points });
          }
        } catch (error) {
          console.error('Failed to load swap points:', error);
        }
      },

      loadSwapHistory: async (farcasterFid: number) => {
        try {
          const response = await fetch(`/api/swap/history/${farcasterFid}?limit=20`);
          if (response.ok) {
            const data = await response.json();
            set({ swapHistory: data.swaps || [] });
          }
        } catch (error) {
          console.error('Failed to load swap history:', error);
        }
      },

      loadEthPrice: async () => {
        try {
          const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
          if (response.ok) {
            const data = await response.json();
            set({ ethPrice: data.ethereum?.usd || 3000 });
          }
        } catch (error) {
          console.error('Failed to load ETH price, using fallback:', error);
          set({ ethPrice: 3000 });
        }
      },

      calculateQuote: () => {
        const { fromToken, toToken, fromAmount, ethPrice, config } = get();
        
        if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) === 0) {
          return { amountOut: "0", fee: "0", points: 0 };
        }

        const amount = parseFloat(fromAmount);
        let usdValue = 0;
        let amountOut = 0;

        if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
          usdValue = amount * ethPrice;
          amountOut = usdValue;
        } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
          usdValue = amount;
          amountOut = amount / ethPrice;
        } else if (fromToken.symbol === 'ETH') {
          usdValue = amount * ethPrice;
          amountOut = usdValue;
        } else if (fromToken.symbol === 'USDC') {
          usdValue = amount;
          amountOut = amount;
        }

        let fee = 0;
        if (config) {
          const { minimumSwapUsd, flatFeeUsd, percentageFeeThresholdUsd, percentageFeeBps } = config.feeStructure;
          
          if (usdValue < minimumSwapUsd) {
            return { amountOut: "0", fee: "0", points: 0 };
          }
          
          if (usdValue >= percentageFeeThresholdUsd) {
            fee = (usdValue * percentageFeeBps) / 10000;
          } else {
            fee = flatFeeUsd;
          }
        }

        const points = Math.floor(usdValue / 10);

        const feeInOutput = toToken.symbol === 'ETH' ? fee / ethPrice : fee;
        const finalAmountOut = Math.max(0, amountOut - feeInOutput);

        return {
          amountOut: finalAmountOut.toFixed(toToken.symbol === 'ETH' ? 8 : 2),
          fee: fee.toFixed(4),
          points,
        };
      },

      recordSwap: async (farcasterFid: number, txHash: string, amountIn: string, amountOut: string, feePaid: string, pointsEarned: number) => {
        const { fromToken, toToken, ethPrice } = get();
        
        if (!fromToken || !toToken) return;

        const amount = parseFloat(amountIn);
        let usdNotional = 0;
        
        if (fromToken.symbol === 'ETH') {
          usdNotional = amount * ethPrice;
        } else if (fromToken.symbol === 'USDC') {
          usdNotional = amount;
        }

        try {
          const response = await fetch('/api/swap/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              farcasterFid,
              txHash,
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              amountIn,
              amountOut,
              usdNotional: usdNotional.toString(),
              feePaid,
              pointsEarned,
            }),
          });

          if (response.ok) {
            await get().loadPoints(farcasterFid);
            await get().loadSwapHistory(farcasterFid);
          }
        } catch (error) {
          console.error('Failed to record swap:', error);
        }
      },

      reset: () => {
        set({
          fromAmount: "",
          toAmount: "",
          error: null,
          isSwapping: false,
        });
      },
    }),
    {
      name: 'swap-storage',
      partialize: (state) => ({
        slippage: state.slippage,
      }),
    }
  )
);
