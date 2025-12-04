import { X, Share2, Coins, AlertTriangle, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { useMiniKit } from '../lib/miniapp/minikit';
import { useHighScoreMint } from '../hooks/useHighScoreMint';
import { useAccount, useConnect } from 'wagmi';
import { RARITY_GRADIENTS } from '../lib/stores/useNftMinting';

interface ShareOrMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  level: number;
  enemiesDefeated: number;
  gameTime: number;
  gameSessionId?: number;
}

export function ShareOrMintModal({ 
  isOpen, 
  onClose, 
  score, 
  level, 
  enemiesDefeated, 
  gameTime,
  gameSessionId 
}: ShareOrMintModalProps) {
  const { shareScore } = useMiniKit();
  const { 
    mintHighScore, 
    isPending, 
    isConfirming, 
    isSuccess, 
    txHash, 
    mintError,
    isEnabled,
    isConfigLoading,
    mintFee,
    currentRarity,
    getRarity,
    RARITY_COLORS
  } = useHighScoreMint();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (!isOpen) return null;

  const rarity = getRarity(score);
  const rarityColor = RARITY_COLORS[rarity] || '#9CA3AF';
  const rarityGradient = RARITY_GRADIENTS[rarity] || 'from-gray-400 to-gray-600';

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
      const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
      return;
    }

    try {
      await mintHighScore({
        score,
        level,
        enemiesDefeated,
        gameTime,
        gameSessionId,
      });
    } catch (error: any) {
      console.error('Mint failed:', error);
    }
  };

  const formatGameTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
          <h2 className="text-3xl font-bold text-white mb-2">Great Score!</h2>
          <p className="text-2xl font-bold text-cyan-400">{score.toLocaleString()} Points</p>
          <p className="text-lg text-purple-300">Level {level}</p>
          
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-gradient-to-r ${rarityGradient}`}>
            <Sparkles size={16} className="text-white" />
            <span className="text-white font-bold">{rarity} Rarity</span>
          </div>
          
          <div className="flex justify-center gap-4 mt-3 text-sm text-purple-200/80">
            <span>{enemiesDefeated} enemies</span>
            <span>|</span>
            <span>{formatGameTime(gameTime)} time</span>
          </div>
        </div>

        {isSuccess ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
            <p className="text-green-300 text-center font-bold mb-2">NFT Minted Successfully!</p>
            <p className="text-green-200/80 text-sm text-center mb-3">
              Your {currentRarity} score achievement has been immortalized on the Base blockchain!
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

              {isEnabled ? (
                <button
                  onClick={handleMint}
                  disabled={isPending || isConfirming || isConfigLoading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3"
                >
                  {isConfigLoading ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Loading...
                    </>
                  ) : !isConnected ? (
                    <>
                      <Coins size={24} />
                      Connect Wallet & Mint
                    </>
                  ) : isPending ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Confirm in Wallet...
                    </>
                  ) : isConfirming ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Minting NFT...
                    </>
                  ) : (
                    <>
                      <Coins size={24} />
                      Mint {rarity} NFT on Base
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full bg-gray-600/50 text-gray-300 font-medium py-4 px-6 rounded-xl text-center">
                  <p className="text-sm">NFT Minting Coming Soon</p>
                  <p className="text-xs text-gray-400 mt-1">Advanced NFT system is being deployed</p>
                </div>
              )}
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
                      {mintError.type === 'signature_failed' && 'Verification Failed'}
                      {mintError.type === 'not_configured' && 'Not Available'}
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

            {isEnabled && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-2">
                <p className="text-xs text-purple-200/80 text-center leading-relaxed">
                  {isConnected ? (
                    <>
                      <span className="font-medium text-purple-300">Mint Fee:</span>{' '}
                      {mintFee ? (
                        <>~${mintFee.mintFeeUsd.toFixed(2)} ({mintFee.mintFeeEth} ETH)</>
                      ) : (
                        <>Loading...</>
                      )}
                      {address && (
                        <span className="block mt-1 text-purple-300/60">
                          Connected: {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>Connect your wallet to mint your {rarity} score achievement as an NFT on Base mainnet with verified game data!</>
                  )}
                </p>
              </div>
            )}
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
