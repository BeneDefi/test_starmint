import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, ArrowUpDown, TrendingUp, TrendingDown, Wallet, Loader2, ChevronDown, Star, AlertCircle, CheckCircle2, History } from "lucide-react";
import Toast from '../Toast';
import { useSwap, type Token } from '../../lib/stores/useSwap';
import { usePlayerStats } from '../../lib/stores/usePlayerStats';
import { useAccount, useBalance, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import { base } from 'wagmi/chains';

interface SwapPageProps {
  onBack: () => void;
}

const SWAP_ROUTER_ABI = [
  {
    name: 'swapETHForUSDC',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapUSDCForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'quoteETHToUSDC',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'amountIn', type: 'uint256' }],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'fee', type: 'uint256' },
      { name: 'points', type: 'uint256' },
    ],
  },
  {
    name: 'quoteUSDCToETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'amountIn', type: 'uint256' }],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'fee', type: 'uint256' },
      { name: 'points', type: 'uint256' },
    ],
  },
] as const;

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export default function SwapPage({ onBack }: SwapPageProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showTokenSelect, setShowTokenSelect] = useState<'from' | 'to' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSwappingTx, setIsSwappingTx] = useState(false);
  const [lastTxType, setLastTxType] = useState<'approve' | 'swap' | null>(null);
  
  const { farcasterFid } = usePlayerStats();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  const { data: ethBalance } = useBalance({
    address,
    chainId: base.id,
  });
  
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: base.id,
  });

  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    slippage,
    isLoading,
    isSwapping,
    config,
    points,
    swapHistory,
    ethPrice,
    setFromToken,
    setToToken,
    setFromAmount,
    swapTokens,
    loadConfig,
    loadPoints,
    loadSwapHistory,
    loadEthPrice,
    calculateQuote,
    recordSwap,
    reset,
  } = useSwap();

  const { writeContract, data: txHash, isPending: isWritePending, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  const [onChainQuote, setOnChainQuote] = useState<{ amountOut: string; fee: string; points: number } | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  useEffect(() => {
    loadConfig();
    loadEthPrice();
    
    const priceInterval = setInterval(() => {
      loadEthPrice();
    }, 30000);
    
    return () => clearInterval(priceInterval);
  }, [loadConfig, loadEthPrice]);

  useEffect(() => {
    if (farcasterFid) {
      loadPoints(farcasterFid);
      loadSwapHistory(farcasterFid);
    }
  }, [farcasterFid, loadPoints, loadSwapHistory]);

  const fetchOnChainQuote = useCallback(async () => {
    if (!config?.swapRouterAddress || !fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      setOnChainQuote(null);
      return;
    }

    setIsQuoting(true);
    try {
      let functionSelector: string;
      let encodedAmount: string;
      
      if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
        functionSelector = '0x1a686502';
        const amountWei = parseEther(fromAmount);
        encodedAmount = amountWei.toString(16).padStart(64, '0');
      } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
        functionSelector = '0x9d0a4e8d';
        const amountUsdc = parseUnits(fromAmount, 6);
        encodedAmount = amountUsdc.toString(16).padStart(64, '0');
      } else {
        setOnChainQuote(null);
        setIsQuoting(false);
        return;
      }

      const response = await fetch('https://mainnet.base.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: config.swapRouterAddress,
            data: functionSelector + encodedAmount,
          }, 'latest'],
        }),
      });

      const data = await response.json();
      
      if (data.result && data.result !== '0x') {
        const resultHex = data.result.slice(2);
        const amountOutHex = resultHex.slice(0, 64);
        const feeHex = resultHex.slice(64, 128);
        const pointsHex = resultHex.slice(128, 192);
        
        const amountOutWei = BigInt('0x' + amountOutHex);
        const feeWei = BigInt('0x' + feeHex);
        const pointsRaw = BigInt('0x' + pointsHex);
        
        let amountOutFormatted: string;
        let feeFormatted: string;
        
        if (fromToken.symbol === 'ETH') {
          amountOutFormatted = formatUnits(amountOutWei, 6);
          feeFormatted = formatEther(feeWei);
        } else {
          amountOutFormatted = formatEther(amountOutWei);
          feeFormatted = formatUnits(feeWei, 6);
        }
        
        setOnChainQuote({
          amountOut: amountOutFormatted,
          fee: feeFormatted,
          points: Number(pointsRaw),
        });
      } else {
        console.warn('On-chain quote returned empty result');
        setOnChainQuote(null);
      }
    } catch (error) {
      console.error('Error fetching on-chain quote:', error);
      setOnChainQuote(null);
    } finally {
      setIsQuoting(false);
    }
  }, [config?.swapRouterAddress, fromToken, toToken, fromAmount]);

  useEffect(() => {
    if (config?.swapRouterAddress && fromAmount && parseFloat(fromAmount) > 0) {
      const debounceTimer = setTimeout(() => {
        fetchOnChainQuote();
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      setOnChainQuote(null);
    }
  }, [config?.swapRouterAddress, fromAmount, fetchOnChainQuote]);

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

  const checkAllowance = useCallback(async () => {
    if (!address || !config?.swapRouterAddress || fromToken?.symbol !== 'USDC' || !fromAmount) {
      setNeedsApproval(false);
      return;
    }

    try {
      const response = await fetch(`https://mainnet.base.org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: USDC_ADDRESS,
            data: `0xdd62ed3e000000000000000000000000${address.slice(2)}000000000000000000000000${config.swapRouterAddress.slice(2)}`,
          }, 'latest'],
        }),
      });
      const data = await response.json();
      const allowance = BigInt(data.result || '0');
      const amountNeeded = parseUnits(fromAmount, 6);
      setNeedsApproval(allowance < amountNeeded);
    } catch (error) {
      console.error('Error checking allowance:', error);
      setNeedsApproval(true);
    }
  }, [address, config?.swapRouterAddress, fromToken?.symbol, fromAmount]);

  useEffect(() => {
    if (fromToken?.symbol === 'USDC' && fromAmount && config?.swapRouterAddress) {
      checkAllowance();
    } else {
      setNeedsApproval(false);
    }
  }, [fromToken?.symbol, fromAmount, config?.swapRouterAddress, checkAllowance]);

  useEffect(() => {
    if (isTxSuccess && txHash && farcasterFid && lastTxType === 'swap' && isSwappingTx && onChainQuote) {
      recordSwap(farcasterFid, txHash, fromAmount, onChainQuote.amountOut, onChainQuote.fee, onChainQuote.points);
      showNotification(`Swap successful! Earned ${onChainQuote.points} points`, 'success');
      reset();
      resetWriteContract();
      setOnChainQuote(null);
      setIsSwappingTx(false);
      setLastTxType(null);
    } else if (isTxSuccess && txHash && lastTxType === 'approve' && isApproving) {
      checkAllowance();
      setIsApproving(false);
      showNotification('USDC approved! You can now swap.', 'success');
      resetWriteContract();
      setLastTxType(null);
    }
  }, [isTxSuccess, txHash, farcasterFid, fromAmount, onChainQuote, recordSwap, reset, resetWriteContract, lastTxType, isSwappingTx, isApproving, checkAllowance]);

  const handleApprove = async () => {
    if (!config?.swapRouterAddress || !fromAmount) {
      showNotification('Invalid configuration', 'error');
      return;
    }

    setIsApproving(true);
    setLastTxType('approve');
    try {
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [config.swapRouterAddress as `0x${string}`, maxApproval],
      });
      showNotification('Approval submitted. Please confirm in your wallet.', 'info');
    } catch (error: any) {
      console.error('Approval error:', error);
      showNotification(error.message || 'Approval failed', 'error');
      setIsApproving(false);
      setLastTxType(null);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !fromToken || !toToken || !fromAmount) {
      showNotification('Please connect wallet and enter amount', 'error');
      return;
    }

    if (!address) {
      showNotification('Wallet not connected', 'error');
      return;
    }

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    const usdValue = fromToken.symbol === 'ETH' ? amount * ethPrice : amount;
    
    if (usdValue < 0.10) {
      showNotification('Minimum swap amount is $0.10', 'error');
      return;
    }

    if (!config?.swapRouterAddress) {
      showNotification('Swap router not deployed yet. Coming soon!', 'info');
      return;
    }

    if (fromToken.symbol === 'USDC' && needsApproval) {
      showNotification('Please approve USDC first', 'info');
      return;
    }

    if (!onChainQuote) {
      showNotification('Waiting for on-chain quote. Please wait...', 'info');
      fetchOnChainQuote();
      return;
    }

    if (parseFloat(onChainQuote.amountOut) <= 0) {
      showNotification('Unable to get valid quote. Please try again.', 'error');
      return;
    }

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      const slippageMultiplier = (100 - slippage) / 100;
      const minAmountOut = parseFloat(onChainQuote.amountOut) * slippageMultiplier;
      
      if (minAmountOut <= 0) {
        showNotification('Output amount too low with current slippage', 'error');
        return;
      }
      
      setIsSwappingTx(true);
      setLastTxType('swap');
      
      if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
        writeContract({
          address: config.swapRouterAddress as `0x${string}`,
          abi: SWAP_ROUTER_ABI,
          functionName: 'swapETHForUSDC',
          args: [parseUnits(minAmountOut.toFixed(6), 6), deadline],
          value: parseEther(fromAmount),
        });
      } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
        writeContract({
          address: config.swapRouterAddress as `0x${string}`,
          abi: SWAP_ROUTER_ABI,
          functionName: 'swapUSDCForETH',
          args: [
            parseUnits(fromAmount, 6),
            parseEther(minAmountOut.toFixed(18)),
            deadline,
          ],
        });
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      showNotification(error.message || 'Swap failed', 'error');
      setIsSwappingTx(false);
      setLastTxType(null);
    }
  };

  const clientQuote = calculateQuote();
  const activeQuote = onChainQuote || clientQuote;
  const getBalance = (token: Token | null) => {
    if (!token) return '0';
    if (token.symbol === 'ETH') {
      return ethBalance ? formatEther(ethBalance.value) : '0';
    }
    if (token.symbol === 'USDC') {
      return usdcBalance ? formatUnits(usdcBalance.value, 6) : '0';
    }
    return '0';
  };

  const handleMaxClick = () => {
    if (fromToken?.symbol === 'ETH' && ethBalance) {
      const maxEth = parseFloat(formatEther(ethBalance.value)) - 0.001;
      setFromAmount(Math.max(0, maxEth).toFixed(6));
    } else if (fromToken?.symbol === 'USDC' && usdcBalance) {
      setFromAmount(formatUnits(usdcBalance.value, 6));
    }
  };

  const tokenIcons: Record<string, string> = {
    ETH: '⟠',
    USDC: '💵',
    STARMINT: '⭐',
  };

  const tokenColors: Record<string, string> = {
    ETH: 'bg-blue-500',
    USDC: 'bg-green-500',
    STARMINT: 'bg-cyan-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute top-10 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/30 rounded-full blur-2xl" />
      
      {Array.from({ length: 30 }, (_, i) => (
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

      <div className="relative z-10 p-3 sm:p-4 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onBack}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:space-x-3">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-cyan-400 font-bold text-base sm:text-lg">StarMintSwap</span>
                <RefreshCw 
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 cursor-pointer hover:text-cyan-300 ${isLoading ? 'animate-spin' : ''}`}
                  onClick={() => loadEthPrice()}
                />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">SWAP</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {points && points.totalPoints > 0 && (
              <div className="hidden sm:flex bg-slate-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-yellow-500/30 items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">{points.availablePoints}</span>
                <span className="text-xs text-gray-400">pts</span>
              </div>
            )}
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
            >
              <History className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4">
          {!isConnected && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <p className="text-yellow-400 text-sm">Connect your wallet to start swapping</p>
              </div>
            </div>
          )}

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">Swap Tokens</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>ETH: ${ethPrice.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-slate-700/50 rounded-xl p-3 sm:p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">From</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-xs sm:text-sm">
                    Balance: {parseFloat(getBalance(fromToken)).toFixed(4)}
                  </span>
                  {isConnected && (
                    <button 
                      onClick={handleMaxClick}
                      className="text-cyan-400 text-xs font-bold hover:text-cyan-300"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowTokenSelect('from')}
                  className="flex items-center space-x-2 bg-slate-600/50 rounded-lg px-3 py-2 hover:bg-slate-600/70 transition-colors"
                >
                  <span className={`w-6 h-6 sm:w-8 sm:h-8 ${tokenColors[fromToken?.symbol || 'ETH']} rounded-full flex items-center justify-center text-sm`}>
                    {tokenIcons[fromToken?.symbol || 'ETH']}
                  </span>
                  <span className="text-white font-bold text-sm sm:text-base">{fromToken?.symbol || 'ETH'}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                <input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 bg-transparent text-right text-base sm:text-lg md:text-xl font-bold text-white outline-none min-h-[44px] px-2"
                />
              </div>
            </div>

            <div className="flex justify-center -my-1 relative z-10">
              <button 
                onClick={swapTokens}
                className="bg-slate-800 border border-cyan-500/50 rounded-full p-3 hover:border-cyan-400 hover:bg-slate-700 transition-all duration-200 min-h-[44px] min-w-[44px]"
              >
                <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              </button>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-3 sm:p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">To</span>
                <span className="text-gray-400 text-xs sm:text-sm">
                  Balance: {parseFloat(getBalance(toToken)).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowTokenSelect('to')}
                  className="flex items-center space-x-2 bg-slate-600/50 rounded-lg px-3 py-2 hover:bg-slate-600/70 transition-colors"
                >
                  <span className={`w-6 h-6 sm:w-8 sm:h-8 ${tokenColors[toToken?.symbol || 'USDC']} rounded-full flex items-center justify-center text-sm`}>
                    {tokenIcons[toToken?.symbol || 'USDC']}
                  </span>
                  <span className="text-white font-bold text-sm sm:text-base">{toToken?.symbol || 'USDC'}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                <input
                  type="number"
                  placeholder="0.00"
                  value={toAmount || activeQuote.amountOut}
                  readOnly
                  className="flex-1 bg-transparent text-right text-base sm:text-lg md:text-xl font-bold text-white outline-none min-h-[44px] px-2"
                />
                {isQuoting && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {fromAmount && parseFloat(fromAmount) > 0 && (
              <div className="mt-4 space-y-2 p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Rate</span>
                  <span className="text-white">
                    1 {fromToken?.symbol} = {fromToken?.symbol === 'ETH' ? ethPrice.toFixed(2) : (1 / ethPrice).toFixed(8)} {toToken?.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Fee</span>
                  <span className="text-white">${activeQuote.fee}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Slippage</span>
                  <span className="text-white">{slippage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Min. Received</span>
                  <span className="text-white">
                    {(parseFloat(activeQuote.amountOut) * ((100 - slippage) / 100)).toFixed(toToken?.symbol === 'ETH' ? 8 : 2)} {toToken?.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-slate-600/50 pt-2 mt-2">
                  <span className="text-yellow-400 flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Points to Earn</span>
                  </span>
                  <span className="text-yellow-400 font-bold">+{activeQuote.points}</span>
                </div>
                {onChainQuote && (
                  <div className="flex items-center justify-center text-xs text-green-400 mt-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    <span>Using on-chain quote</span>
                  </div>
                )}
              </div>
            )}

            {!isConnected ? (
              <button 
                onClick={handleConnectWallet}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 rounded-xl transition-all duration-200 min-h-[44px] text-sm sm:text-base flex items-center justify-center space-x-2"
              >
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </button>
            ) : needsApproval && fromToken?.symbol === 'USDC' ? (
              <button 
                onClick={handleApprove}
                disabled={isApproving || isWritePending}
                className={`w-full mt-4 font-bold py-3 rounded-xl transition-all duration-200 min-h-[44px] text-sm sm:text-base flex items-center justify-center space-x-2 ${
                  isApproving || isWritePending
                    ? 'bg-slate-600 text-gray-300 cursor-wait'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
                }`}
              >
                {isApproving || isWritePending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <span>Approve USDC</span>
                )}
              </button>
            ) : (
              <button 
                onClick={handleSwap}
                disabled={isWritePending || isTxLoading || !fromAmount || parseFloat(fromAmount) <= 0}
                className={`w-full mt-4 font-bold py-3 rounded-xl transition-all duration-200 min-h-[44px] text-sm sm:text-base flex items-center justify-center space-x-2 ${
                  isWritePending || isTxLoading
                    ? 'bg-slate-600 text-gray-300 cursor-wait'
                    : !fromAmount || parseFloat(fromAmount) <= 0
                    ? 'bg-slate-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                }`}
              >
                {isWritePending || isTxLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isWritePending ? 'Confirm in Wallet' : 'Processing...'}</span>
                  </>
                ) : (
                  <span>Swap</span>
                )}
              </button>
            )}
          </div>

          {points && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>Swap Points</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-400">{points.availablePoints}</div>
                  <div className="text-xs text-gray-400">Available Points</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-cyan-400">{points.swapCount}</div>
                  <div className="text-xs text-gray-400">Total Swaps</div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Total Volume</span>
                  <span className="text-white">${parseFloat(points.totalSwapVolumeUsd).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Earn 1 point for every $10 swapped. Points can be redeemed for STARMINT tokens!
              </p>
            </div>
          )}

          {showHistory && swapHistory.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <History className="w-5 h-5 text-cyan-400" />
                <span>Recent Swaps</span>
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {swapHistory.slice(0, 5).map((swap) => (
                  <div key={swap.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-white">{swap.fromToken} → {swap.toToken}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">${parseFloat(swap.usdNotional).toFixed(2)}</div>
                      <div className="text-xs text-yellow-400">+{swap.pointsEarned} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Supported Tokens</h3>
            
            <div className="space-y-2 sm:space-y-3">
              {config?.supportedTokens?.map((token) => (
                <div
                  key={token.symbol}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors duration-200 ${
                    token.enabled 
                      ? 'bg-slate-700/50 hover:bg-slate-700/70' 
                      : 'bg-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${tokenColors[token.symbol]} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-sm">{tokenIcons[token.symbol]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-sm sm:text-base truncate">{token.symbol}</div>
                      <div className="text-xs sm:text-sm text-gray-400 truncate">{token.name}</div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-2">
                    {token.enabled ? (
                      <>
                        <div className="font-bold text-white text-sm sm:text-base">
                          {token.symbol === 'ETH' ? `$${ethPrice.toFixed(2)}` : '$1.00'}
                        </div>
                        <div className="text-xs sm:text-sm text-green-400 flex items-center justify-end space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs sm:text-sm text-yellow-400">Coming Soon</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30">
            <h4 className="text-sm font-bold text-white mb-2">Fee Structure</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Minimum Swap</span>
                <span className="text-white">$0.10</span>
              </div>
              <div className="flex justify-between">
                <span>Swaps $0.10 - $499.99</span>
                <span className="text-white">$0.10 flat fee</span>
              </div>
              <div className="flex justify-between">
                <span>Swaps $500+</span>
                <span className="text-white">0.1% fee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTokenSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-sm border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Select Token</h3>
              <button onClick={() => setShowTokenSelect(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {config?.supportedTokens?.filter(t => t.enabled).map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    if (showTokenSelect === 'from') {
                      setFromToken(token);
                    } else {
                      setToToken(token);
                    }
                    setShowTokenSelect(null);
                  }}
                  className="w-full flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <span className={`w-8 h-8 ${tokenColors[token.symbol]} rounded-full flex items-center justify-center`}>
                    {tokenIcons[token.symbol]}
                  </span>
                  <div className="text-left">
                    <div className="font-bold text-white">{token.symbol}</div>
                    <div className="text-xs text-gray-400">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
