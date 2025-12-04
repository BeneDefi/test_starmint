import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Trophy, Target, Clock, Star, AlertCircle, CheckCircle2, Loader2, ExternalLink, Image as ImageIcon, Wallet } from "lucide-react";
import Toast from '../Toast';
import { useNftMinting, RARITY_COLORS, RARITY_GRADIENTS } from '../../lib/stores/useNftMinting';
import { usePlayerStats } from '../../lib/stores/usePlayerStats';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { base } from 'wagmi/chains';

interface MintNFTPageProps {
  onBack: () => void;
}

const HIGH_SCORE_NFT_ABI = [
  {
    name: 'mintHighScore',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
      { name: 'enemiesDefeated', type: 'uint256' },
      { name: 'gameTime', type: 'uint256' },
      { name: 'screenshotHash', type: 'bytes32' },
      { name: 'externalUrl', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getMintFeeInETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export default function MintNFTPage({ onBack }: MintNFTPageProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [pendingMintData, setPendingMintData] = useState<any>(null);
  const [showMintedNfts, setShowMintedNfts] = useState(false);
  
  const { stats, farcasterFid } = usePlayerStats();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  const {
    config,
    mintedNfts,
    mintFee,
    stats: nftStats,
    isLoading,
    isMinting,
    error,
    loadConfig,
    loadMintedNfts,
    loadStats,
    loadMintFee,
    requestMintSignature,
    confirmMint,
    getRarity,
    reset,
  } = useNftMinting();

  const { writeContract, data: txHash, isPending: isWritePending, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    loadConfig();
    loadStats();
    loadMintFee();
    
    const feeInterval = setInterval(() => {
      loadMintFee();
    }, 60000);
    
    return () => clearInterval(feeInterval);
  }, [loadConfig, loadStats, loadMintFee]);

  useEffect(() => {
    if (address) {
      loadMintedNfts(address);
    }
  }, [address, loadMintedNfts]);

  useEffect(() => {
    if (isTxSuccess && txHash && pendingMintData) {
      confirmMint({
        txHash,
        tokenId: 0, // Will be updated by event parsing in production
        nonce: pendingMintData.nonce.toString(),
        mintFeeEth: mintFee?.mintFeeEth || '0',
        walletAddress: address!,
      }).then((result) => {
        if (result) {
          showNotification('NFT minted successfully! Check your collection.', 'success');
        }
        setPendingMintData(null);
        resetWriteContract();
      });
    }
  }, [isTxSuccess, txHash, pendingMintData, confirmMint, mintFee, address, resetWriteContract]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleConnectWallet = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handleMintHighScore = async () => {
    if (!isConnected || !address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!config?.isEnabled || !config?.contractAddress) {
      showNotification('NFT minting is not available yet', 'info');
      return;
    }

    if (stats.highScore === 0) {
      showNotification('Play the game first to get a high score!', 'info');
      return;
    }

    try {
      const mintData = await requestMintSignature({
        score: stats.highScore,
        level: Math.ceil(stats.highScore / 1000), // Estimate level from score
        enemiesDefeated: stats.enemiesDestroyed,
        gameTime: stats.timePlayedMinutes * 60 * 1000,
        walletAddress: address,
      });

      if (!mintData) {
        showNotification('Failed to get mint signature', 'error');
        return;
      }

      setPendingMintData(mintData);

      const mintFeeWei = BigInt(mintFee?.mintFeeWei || '0');

      writeContract({
        address: config.contractAddress as `0x${string}`,
        abi: HIGH_SCORE_NFT_ABI,
        functionName: 'mintHighScore',
        args: [
          BigInt(stats.highScore),
          BigInt(Math.ceil(stats.highScore / 1000)),
          BigInt(stats.enemiesDestroyed),
          BigInt(stats.timePlayedMinutes * 60 * 1000),
          mintData.screenshotHash as `0x${string}`,
          mintData.externalUrl,
          BigInt(mintData.nonce),
          mintData.signature as `0x${string}`,
        ],
        value: mintFeeWei,
      });

      showNotification('Transaction submitted. Please confirm in your wallet.', 'info');
    } catch (err: any) {
      console.error('Mint error:', err);
      showNotification(err.message || 'Minting failed', 'error');
      setPendingMintData(null);
    }
  };

  const rarity = getRarity(stats.highScore);
  const rarityColor = RARITY_COLORS[rarity];
  const rarityGradient = RARITY_GRADIENTS[rarity];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute top-10 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/30 rounded-full blur-2xl" />
      
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      <div className="relative z-10 p-3 sm:p-4 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onBack}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:space-x-3">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-bold text-base sm:text-lg">STARMINT</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">MINT NFT</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {nftStats && nftStats.totalMinted > 0 && (
              <div className="hidden sm:flex bg-slate-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-purple-500/30 items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-bold">{nftStats.totalMinted}</span>
                <span className="text-xs text-gray-400">minted</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!isConnected && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-400 text-sm">Connect your wallet to mint NFTs</p>
                </div>
                <button
                  onClick={handleConnectWallet}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect</span>
                </button>
              </div>
            </div>
          )}

          <div className={`bg-gradient-to-r ${rarityGradient} p-[2px] rounded-2xl`}>
            <div className="bg-slate-900/95 rounded-2xl p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-3" 
                  style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}>
                  {rarity} Rarity
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your High Score</h2>
                <div className="text-4xl sm:text-5xl font-black" style={{ color: rarityColor }}>
                  {formatNumber(stats.highScore)}
                </div>
                <p className="text-gray-400 mt-2">Points</p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-white font-bold">{Math.ceil(stats.highScore / 1000)}</div>
                  <div className="text-xs text-gray-400">Level</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <div className="text-white font-bold">{formatNumber(stats.enemiesDestroyed)}</div>
                  <div className="text-xs text-gray-400">Enemies</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-white font-bold">{formatTime(stats.timePlayedMinutes)}</div>
                  <div className="text-xs text-gray-400">Played</div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Mint Fee</span>
                  <div className="text-right">
                    <div className="text-white font-bold">$0.10 USD</div>
                    <div className="text-xs text-gray-400">
                      {mintFee ? `~${parseFloat(mintFee.mintFeeEth).toFixed(6)} ETH` : 'Loading...'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Fee goes to treasury</span>
                  <span>Base Network</span>
                </div>
              </div>

              <button
                onClick={handleMintHighScore}
                disabled={!isConnected || isMinting || isWritePending || isTxLoading || !config?.isEnabled || stats.highScore === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2
                  ${isConnected && config?.isEnabled && stats.highScore > 0
                    ? `bg-gradient-to-r ${rarityGradient} hover:opacity-90 text-white shadow-lg`
                    : 'bg-slate-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {(isMinting || isWritePending || isTxLoading) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isTxLoading ? 'Confirming...' : 'Minting...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {!config?.isEnabled 
                        ? 'Coming Soon' 
                        : stats.highScore === 0 
                          ? 'Play to Get Score' 
                          : 'Mint High Score NFT'
                      }
                    </span>
                  </>
                )}
              </button>

              {!config?.isEnabled && (
                <p className="text-center text-gray-500 text-sm mt-3">
                  NFT minting will be available after contract deployment
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Star className="w-5 h-5 text-yellow-400 mr-2" />
              Rarity Tiers
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Legendary', threshold: '100,000+', color: RARITY_COLORS.Legendary },
                { name: 'Epic', threshold: '50,000+', color: RARITY_COLORS.Epic },
                { name: 'Rare', threshold: '25,000+', color: RARITY_COLORS.Rare },
                { name: 'Uncommon', threshold: '10,000+', color: RARITY_COLORS.Uncommon },
                { name: 'Common', threshold: '< 10,000', color: RARITY_COLORS.Common },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    rarity === tier.name ? 'bg-slate-700/50 ring-1' : ''
                  }`}
                  style={{ 
                    borderColor: rarity === tier.name ? tier.color : 'transparent',
                    boxShadow: rarity === tier.name ? `0 0 10px ${tier.color}40` : 'none'
                  }}
                >
                  <span className="font-medium" style={{ color: tier.color }}>{tier.name}</span>
                  <span className="text-gray-400 text-sm">{tier.threshold} pts</span>
                </div>
              ))}
            </div>
          </div>

          {mintedNfts.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <ImageIcon className="w-5 h-5 text-purple-400 mr-2" />
                  Your NFTs ({mintedNfts.length})
                </h3>
                <button
                  onClick={() => setShowMintedNfts(!showMintedNfts)}
                  className="text-purple-400 text-sm hover:text-purple-300"
                >
                  {showMintedNfts ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showMintedNfts && (
                <div className="space-y-3">
                  {mintedNfts.map((nft: any, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">#{nft.tokenId}</span>
                          <span 
                            className="text-sm px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${RARITY_COLORS[nft.rarity]}20`, 
                              color: RARITY_COLORS[nft.rarity] 
                            }}
                          >
                            {nft.rarity}
                          </span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          Score: {formatNumber(nft.score)}
                        </div>
                      </div>
                      <a
                        href={nft.openseaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {nftStats && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-4">Collection Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{nftStats.totalMinted}</div>
                  <div className="text-xs text-gray-400">Total Minted</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-400">{formatNumber(nftStats.highestScoreMinted)}</div>
                  <div className="text-xs text-gray-400">Highest Score</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-400">{nftStats.legendaryMinted}</div>
                  <div className="text-xs text-gray-400">Legendary</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-400">{nftStats.epicMinted + nftStats.rareMinted}</div>
                  <div className="text-xs text-gray-400">Epic + Rare</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
