import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useState, useCallback } from 'react';
import { SCORE_NFT_CONTRACT_ADDRESS, SCORE_NFT_ABI } from '../lib/web3/wagmiConfig';
import { BaseError, ContractFunctionRevertedError, keccak256, toHex } from 'viem';
import { base } from 'wagmi/chains';

interface MintError {
  type: 'user_rejected' | 'insufficient_funds' | 'network_error' | 'contract_error' | 'wrong_network' | 'validation_error' | 'unknown';
  message: string;
  userMessage: string;
}

interface MintParams {
  score: number;
  level: number;
  enemiesDefeated: number;
  gameTime?: number;
  accuracy?: number;
}

export function useMintScore() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mintError, setMintError] = useState<MintError | null>(null);

  const { writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const parseError = useCallback((error: unknown): MintError => {
    let errorString = '';
    if (error instanceof BaseError) {
      errorString = (error.shortMessage || error.message || '').toLowerCase();
    } else if (error instanceof Error) {
      errorString = error.message.toLowerCase();
    } else {
      errorString = String(error).toLowerCase();
    }

    if (errorString.includes('chain mismatch') ||
        errorString.includes('wrong chain') ||
        errorString.includes('unsupported chain') ||
        errorString.includes('switch chain') ||
        errorString.includes('chain id')) {
      return {
        type: 'wrong_network',
        message: 'Wrong network selected',
        userMessage: 'Please switch your wallet to the Base network to mint your NFT.'
      };
    }

    if (errorString.includes('user rejected') ||
        errorString.includes('user denied') ||
        errorString.includes('user cancelled') ||
        errorString.includes('rejected by user') ||
        errorString.includes('user denied transaction')) {
      return {
        type: 'user_rejected',
        message: 'Transaction was cancelled by user',
        userMessage: 'You cancelled the transaction. Click "Mint" again if you want to try again.'
      };
    }

    if (errorString.includes('insufficient funds') ||
        errorString.includes('insufficient balance') ||
        errorString.includes('not enough balance') ||
        errorString.includes('exceeds balance')) {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient funds for gas',
        userMessage: "You don't have enough ETH to cover the gas fees (~$0.01-0.05). Please add more ETH to your wallet on Base network."
      };
    }

    if (errorString.includes('network') ||
        errorString.includes('timeout') ||
        errorString.includes('connection') ||
        errorString.includes('rpc')) {
      return {
        type: 'network_error',
        message: 'Network connection error',
        userMessage: 'Network connection issue. Please check your internet and try again.'
      };
    }

    if (error instanceof ContractFunctionRevertedError || errorString.includes('revert')) {
      if (errorString.includes('invalidscore')) {
        return {
          type: 'validation_error',
          message: 'Invalid score',
          userMessage: 'The score value is invalid. Please try again with a valid game session.'
        };
      }
      if (errorString.includes('invalidlevel')) {
        return {
          type: 'validation_error',
          message: 'Invalid level',
          userMessage: 'The level value is invalid. Please try again with a valid game session.'
        };
      }
      return {
        type: 'contract_error',
        message: 'Contract execution failed',
        userMessage: 'The contract rejected the transaction. This might be a temporary issue. Please try again.'
      };
    }

    if (errorString.includes('gas required exceeds') ||
        errorString.includes('out of gas') ||
        errorString.includes('gas estimation')) {
      return {
        type: 'insufficient_funds',
        message: 'Gas estimation failed',
        userMessage: 'Unable to estimate gas. You may need more ETH in your wallet to cover transaction fees.'
      };
    }

    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
    };
  }, []);

  const generateScreenshotHash = useCallback((params: MintParams): `0x${string}` => {
    const dataString = JSON.stringify({
      score: params.score,
      level: params.level,
      enemiesDefeated: params.enemiesDefeated,
      gameTime: params.gameTime || 0,
      accuracy: params.accuracy || 0,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    });
    return keccak256(toHex(dataString));
  }, []);

  const mintScore = useCallback(async (params: MintParams) => {
    setMintError(null);

    if (!address || !isConnected) {
      const error: MintError = {
        type: 'unknown',
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet first.'
      };
      setMintError(error);
      throw new Error(error.message);
    }

    if (chainId && chainId !== base.id) {
      const error: MintError = {
        type: 'wrong_network',
        message: 'Wrong network',
        userMessage: `Please switch your wallet to the Base network. Currently on chain ID: ${chainId}`
      };
      setMintError(error);
      throw new Error(error.message);
    }

    if (params.score <= 0) {
      const error: MintError = {
        type: 'validation_error',
        message: 'Invalid score',
        userMessage: 'Score must be greater than zero to mint an NFT.'
      };
      setMintError(error);
      throw new Error(error.message);
    }

    if (params.level <= 0) {
      const error: MintError = {
        type: 'validation_error',
        message: 'Invalid level',
        userMessage: 'Level must be greater than zero to mint an NFT.'
      };
      setMintError(error);
      throw new Error(error.message);
    }

    const screenshotHash = generateScreenshotHash(params);

    try {
      await writeContract({
        address: SCORE_NFT_CONTRACT_ADDRESS,
        abi: SCORE_NFT_ABI,
        functionName: 'mintScore',
        args: [
          address,
          BigInt(params.score),
          BigInt(params.level),
          BigInt(params.enemiesDefeated || 0),
          screenshotHash
        ],
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
          setMintError(null);
        },
        onError: (err) => {
          const parsedError = parseError(err);
          setMintError(parsedError);
          console.error('Mint error:', err);
        }
      });
    } catch (err) {
      const parsedError = parseError(err);
      setMintError(parsedError);
      console.error('Mint error:', err);
      throw err;
    }
  }, [address, isConnected, chainId, writeContract, parseError, generateScreenshotHash]);

  const getRarityFromScore = useCallback((score: number): { rarity: string; color: string } => {
    if (score >= 100000) return { rarity: 'LEGENDARY', color: '#ffd700' };
    if (score >= 50000) return { rarity: 'EPIC', color: '#a855f7' };
    if (score >= 20000) return { rarity: 'RARE', color: '#3b82f6' };
    if (score >= 5000) return { rarity: 'UNCOMMON', color: '#22c55e' };
    return { rarity: 'COMMON', color: '#9ca3af' };
  }, []);

  return {
    mintScore,
    isPending,
    isConfirming,
    isSuccess,
    txHash,
    error,
    mintError,
    isConnected,
    getRarityFromScore,
  };
}
