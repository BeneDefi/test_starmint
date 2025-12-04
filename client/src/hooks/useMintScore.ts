import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useState } from 'react';
import { SCORE_NFT_CONTRACT_ADDRESS, SCORE_NFT_ABI } from '../lib/web3/wagmiConfig';
import { BaseError, ContractFunctionRevertedError } from 'viem';
import { base } from 'wagmi/chains';

interface MintError {
  type: 'user_rejected' | 'insufficient_funds' | 'network_error' | 'contract_error' | 'wrong_network' | 'unknown';
  message: string;
  userMessage: string;
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

  const parseError = (error: any): MintError => {
    // Extract message from BaseError if available
    let errorString = '';
    if (error instanceof BaseError) {
      errorString = (error.shortMessage || error.message || '').toLowerCase();
    } else {
      errorString = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
    }
    
    // Check for wrong network / chain mismatch
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
    
    // User rejected the transaction
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
    
    // Insufficient funds for gas
    if (errorString.includes('insufficient funds') || 
        errorString.includes('insufficient balance') ||
        errorString.includes('not enough balance') ||
        errorString.includes('exceeds balance')) {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient funds for gas',
        userMessage: 'You don\'t have enough ETH to cover the gas fees (~$0.01-0.05). Please add more ETH to your wallet on Base network.'
      };
    }
    
    // Network/RPC errors
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
    
    // Contract-specific errors
    if (error instanceof ContractFunctionRevertedError || errorString.includes('revert')) {
      return {
        type: 'contract_error',
        message: 'Contract execution failed',
        userMessage: 'The contract rejected the transaction. This might be a temporary issue. Please try again.'
      };
    }
    
    // Gas estimation failed
    if (errorString.includes('gas required exceeds') || 
        errorString.includes('out of gas') ||
        errorString.includes('gas estimation')) {
      return {
        type: 'insufficient_funds',
        message: 'Gas estimation failed',
        userMessage: 'Unable to estimate gas. You may need more ETH in your wallet to cover transaction fees.'
      };
    }
    
    // Unknown error
    return {
      type: 'unknown',
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
    };
  };

  const mintScore = async (score: number, level: number) => {
    // Reset error state
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
    
    // Check if user is on the correct network
    if (chainId && chainId !== base.id) {
      const error: MintError = {
        type: 'wrong_network',
        message: 'Wrong network',
        userMessage: `Please switch your wallet to the Base network. Currently on chain ID: ${chainId}`
      };
      setMintError(error);
      throw new Error(error.message);
    }

    try {
      await writeContract({
        address: SCORE_NFT_CONTRACT_ADDRESS,
        abi: SCORE_NFT_ABI,
        functionName: 'mintScore',
        args: [address, BigInt(score), BigInt(level)],
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
  };

  return {
    mintScore,
    isPending,
    isConfirming,
    isSuccess,
    txHash,
    error,
    mintError,
    isConnected,
  };
}
