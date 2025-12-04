import { X, Share2, Coins, AlertTriangle, ExternalLink } from 'lucide-react';
import { useMiniKit } from '../lib/miniapp/minikit';
import { useMintScore } from '../hooks/useMintScore';
import { useAccount, useConnect } from 'wagmi';

interface ShareOrMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  level: number;
}

export function ShareOrMintModal({ isOpen, onClose, score, level }: ShareOrMintModalProps) {
  const { shareScore } = useMiniKit();
  const { mintScore, isPending, isConfirming, isSuccess, txHash, mintError } = useMintScore();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (!isOpen) return null;

  const handleShare = async () => {
    try {
      await shareScore(score);
      onClose();
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      // Try to connect wallet
      const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
      return;
    }

    try {
      await mintScore(score, level);
    } catch (error: any) {
      console.error('Mint failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-purple-900/90 to-cyan-900/90 rounded-2xl p-6 shadow-2xl border border-purple-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">🎉 Great Score!</h2>
          <p className="text-2xl font-bold text-cyan-400">{score.toLocaleString()} Points</p>
          <p className="text-lg text-purple-300">Level {level}</p>
        </div>

        {isSuccess ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
            <p className="text-green-300 text-center font-bold mb-2">✅ NFT Minted Successfully!</p>
            <p className="text-green-200/80 text-sm text-center mb-3">
              Your score has been immortalized on the Base blockchain!
            </p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                View on BaseScan <ExternalLink size={14} />
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <button
                onClick={handleShare}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <Share2 size={24} />
                Share on Farcaster
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-500/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-purple-900/90 text-purple-300">or</span>
                </div>
              </div>

              <button
                onClick={handleMint}
                disabled={isPending || isConfirming}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3"
              >
                <Coins size={24} />
                {!isConnected
                  ? 'Connect Wallet & Mint on Base'
                  : isPending
                  ? 'Confirm in Wallet...'
                  : isConfirming
                  ? 'Minting NFT...'
                  : 'Mint Score as NFT on Base'}
              </button>
            </div>

            {mintError && (
              <div className={`rounded-lg p-4 mb-4 border ${
                mintError.type === 'user_rejected'
                  ? 'bg-yellow-500/20 border-yellow-500/50'
                  : mintError.type === 'insufficient_funds' || mintError.type === 'wrong_network'
                  ? 'bg-orange-500/20 border-orange-500/50'
                  : 'bg-red-500/20 border-red-500/50'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle 
                    size={20} 
                    className={
                      mintError.type === 'user_rejected'
                        ? 'text-yellow-300 mt-0.5'
                        : mintError.type === 'insufficient_funds' || mintError.type === 'wrong_network'
                        ? 'text-orange-300 mt-0.5'
                        : 'text-red-300 mt-0.5'
                    } 
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${
                      mintError.type === 'user_rejected'
                        ? 'text-yellow-300'
                        : mintError.type === 'insufficient_funds' || mintError.type === 'wrong_network'
                        ? 'text-orange-300'
                        : 'text-red-300'
                    }`}>
                      {mintError.type === 'user_rejected' && 'Transaction Cancelled'}
                      {mintError.type === 'insufficient_funds' && 'Insufficient Funds'}
                      {mintError.type === 'wrong_network' && 'Wrong Network'}
                      {mintError.type === 'network_error' && 'Network Error'}
                      {mintError.type === 'contract_error' && 'Contract Error'}
                      {mintError.type === 'unknown' && 'Error'}
                    </p>
                    <p className={`text-xs ${
                      mintError.type === 'user_rejected'
                        ? 'text-yellow-200/80'
                        : mintError.type === 'insufficient_funds' || mintError.type === 'wrong_network'
                        ? 'text-orange-200/80'
                        : 'text-red-200/80'
                    }`}>
                      {mintError.userMessage}
                    </p>
                    
                    {mintError.type === 'insufficient_funds' && (
                      <a
                        href="https://www.coinbase.com/how-to-buy/ethereum"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-orange-300 hover:text-orange-200 underline mt-2"
                      >
                        Get ETH on Base <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-2">
              <p className="text-xs text-purple-200/80 text-center leading-relaxed">
                {isConnected ? (
                  <>
                    <span className="font-medium text-purple-300">Gas Fees:</span> Minting costs approximately $0.01-0.05 in ETH on Base network.
                    {address && (
                      <span className="block mt-1 text-purple-300/60">
                        Connected: {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                    )}
                  </>
                ) : (
                  <>Connect your wallet to mint your score as an NFT on Base mainnet. Your achievement will be permanently stored on the blockchain!</>
                )}
              </p>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-purple-300 hover:text-white transition-colors py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}
