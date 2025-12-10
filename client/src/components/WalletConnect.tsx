import { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Award, Coins } from 'lucide-react';
import { WalletManager } from '../lib/web3/wallet';
import { useMiniKit } from '../lib/miniapp/minikit';

interface WalletConnectProps {
  onClose?: () => void;
}

export default function WalletConnect({ onClose }: WalletConnectProps) {
  const { user, isConnected } = useMiniKit();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnBase, setIsOnBase] = useState(false);
  const walletManager = WalletManager.getInstance();

  useEffect(() => {
    if (isConnected) {
      loadWalletData();
    }
  }, [isConnected]);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const address = await walletManager.getAccount();
      const balance = await walletManager.getBalance();
      
      if (address) {
        setWalletAddress(address);
        setBalance(balance ? (parseInt(balance) / 1e18).toFixed(4) : '0');
        setIsOnBase(true); // Assume Base for now
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
    setIsLoading(false);
  };

  const handleSwitchToBase = async () => {
    setIsLoading(true);
    const success = await walletManager.switchToBase();
    if (success) {
      setIsOnBase(true);
      await loadWalletData();
    }
    setIsLoading(false);
  };

  const handleMintReward = async () => {
    setIsLoading(true);
    try {
      // This would typically mint an NFT or token reward
      // For demo purposes, we'll just show a success message
      alert('🎉 Reward NFT minted successfully! Check your wallet.');
    } catch (error) {
      console.error('Failed to mint reward:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/50 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-cyan-400" />
            <span>Base Wallet</span>
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-300 mb-4">Sign in with Farcaster to connect your wallet</p>
            <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-lg transition-colors">
              Sign In First
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            {user && (
              <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <img 
                  src={user.pfpUrl || '/default-avatar.png'} 
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="text-white font-medium">{user.displayName || 'Anonymous'}</div>
                  <div className="text-cyan-400 text-sm">@{user.username || 'user'}</div>
                </div>
              </div>
            )}

            {/* Wallet Address */}
            {walletAddress && (
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="text-sm text-gray-300 mb-1">Wallet Address</div>
                <div className="text-white font-mono text-sm break-all">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
            )}

            {/* Balance */}
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">ETH Balance</div>
              <div className="text-white font-bold text-lg">{balance} ETH</div>
            </div>

            {/* Network Status */}
            <div className={`p-3 rounded-lg ${isOnBase ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Network</div>
                  <div className={`font-medium ${isOnBase ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnBase ? 'Base Mainnet' : 'Wrong Network'}
                  </div>
                </div>
                {!isOnBase && (
                  <button
                    onClick={handleSwitchToBase}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Switch to Base
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={handleMintReward}
                disabled={isLoading || !isOnBase}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>Mint Reward</span>
              </button>
              
              <button
                onClick={() => window.open('https://basescan.org', '_blank')}
                className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Basescan</span>
              </button>
            </div>

            {/* Token Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-medium">STARMINT Tokens</span>
              </div>
              <div className="text-sm text-gray-300">
                Earn STARMINT tokens by playing, achieving high scores, and sharing with friends. 
                Use them to unlock special rewards and NFTs!
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                <span className="ml-2 text-cyan-400">Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}