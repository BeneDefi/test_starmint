import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';
import { HIGH_SCORE_NFT_ABI } from '../lib/web3/wagmiConfig';
import { useNftMinting, RARITY_COLORS } from '../lib/stores/useNftMinting';
import { BaseError, ContractFunctionRevertedError, parseEther } from 'viem';
import { base } from 'wagmi/chains';

export interface GameScoreData {
  score: number;
  level: number;
  enemiesDefeated: number;
  gameTime: number;
  gameSessionId?: number;
}

interface MintError {
  type: 'user_rejected' | 'insufficient_funds' | 'network_error' | 'contract_error' | 'wrong_network' | 'signature_failed' | 'not_configured' | 'unknown';
  message: string;
  userMessage: string;
}

interface MintSignatureData {
  nonce: number;
  signature: string;
  expiresAt: string;
  externalUrl: string;
  screenshotHash: string;
  rarity: string;
}

export function useHighScoreMint() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mintError, setMintError] = useState<MintError | null>(null);
  const [pendingMintData, setPendingMintData] = useState<MintSignatureData | null>(null);
  const [currentRarity, setCurrentRarity] = useState<string>('Common');
  
  const {
    config,
    mintFee,
    isLoading: isConfigLoading,
    isMinting: isRequestingSignature,
    error: storeError,
    loadConfig,
    loadMintFee,
    requestMintSignature,
    confirmMint,
    getRarity,
  } = useNftMinting();

  const { writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();
  
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    loadConfig();
    loadMintFee();
    
    const feeInterval = setInterval(() => {
      loadMintFee();
    }, 60000);
    
    return () => clearInterval(feeInterval);
  }, [loadConfig, loadMintFee]);

  useEffect(() => {
    if (isTxSuccess && txHash && pendingMintData && address) {
      confirmMint({
        txHash,
        tokenId: 0,
        nonce: pendingMintData.nonce.toString(),
        mintFeeEth: mintFee?.mintFeeEth || '0',
        walletAddress: address,
      }).then((result) => {
        if (result) {
          console.log('NFT mint confirmed:', result);
        }
        setPendingMintData(null);
        resetWriteContract();
      });
    }
  }, [isTxSuccess, txHash, pendingMintData, confirmMint, mintFee, address, resetWriteContract]);

  const parseError = useCallback((error: any): MintError => {
    let errorString = '';
    if (error instanceof BaseError) {
      errorString = (error.shortMessage || error.message || '').toLowerCase();
    } else {
      errorString = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
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
        message: 'Insufficient funds for gas and mint fee',
        userMessage: `You need approximately ${mintFee?.mintFeeEth || '0.00005'} ETH (plus gas) on Base network. Please add more ETH to your wallet.`
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
        userMessage: 'Unable to estimate gas. You may need more ETH in your wallet.'
      };
    }
    
    return {
      type: 'unknown',
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support.'
    };
  }, [mintFee]);

  const mintHighScore = async (scoreData: GameScoreData) => {
    setMintError(null);
    setPendingMintData(null);
    
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

    if (!config?.contractAddress) {
      const error: MintError = {
        type: 'not_configured',
        message: 'NFT contract not configured',
        userMessage: 'The NFT minting system is not yet available. Please check back later.'
      };
      setMintError(error);
      throw new Error(error.message);
    }

    if (!mintFee) {
      const error: MintError = {
        type: 'network_error',
        message: 'Mint fee not loaded',
        userMessage: 'Unable to load mint fee. Please refresh and try again.'
      };
      setMintError(error);
      throw new Error(error.message);
    }

    try {
      setCurrentRarity(getRarity(scoreData.score));
      
      const signatureData = await requestMintSignature({
        score: scoreData.score,
        level: scoreData.level,
        enemiesDefeated: scoreData.enemiesDefeated,
        gameTime: scoreData.gameTime,
        walletAddress: address,
        gameSessionId: scoreData.gameSessionId,
      });

      if (!signatureData) {
        const error: MintError = {
          type: 'signature_failed',
          message: 'Failed to get mint signature',
          userMessage: 'Unable to verify your score. Please try again.'
        };
        setMintError(error);
        throw new Error(error.message);
      }

      setPendingMintData(signatureData);
      setCurrentRarity(signatureData.rarity);

      const screenshotHashBytes = signatureData.screenshotHash.startsWith('0x') 
        ? signatureData.screenshotHash as `0x${string}`
        : `0x${signatureData.screenshotHash.padStart(64, '0')}` as `0x${string}`;

      await writeContract({
        address: config.contractAddress as `0x${string}`,
        abi: HIGH_SCORE_NFT_ABI,
        functionName: 'mintHighScore',
        args: [
          BigInt(scoreData.score),
          BigInt(scoreData.level),
          BigInt(scoreData.enemiesDefeated),
          BigInt(scoreData.gameTime),
          screenshotHashBytes,
          signatureData.externalUrl,
          BigInt(signatureData.nonce),
          signatureData.signature as `0x${string}`,
        ],
        value: parseEther(mintFee.mintFeeEth),
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
      if (!mintError) {
        const parsedError = parseError(err);
        setMintError(parsedError);
      }
      console.error('Mint error:', err);
      throw err;
    }
  };

  const isEnabled = !!config?.contractAddress && config.isEnabled;
  const isPending = isWritePending || isRequestingSignature;
  const isConfirming = isTxLoading;
  const isSuccess = isTxSuccess;

  return {
    mintHighScore,
    isPending,
    isConfirming,
    isSuccess,
    txHash,
    mintError,
    isConnected,
    isEnabled,
    isConfigLoading,
    config,
    mintFee,
    currentRarity,
    getRarity,
    RARITY_COLORS,
  };
}
