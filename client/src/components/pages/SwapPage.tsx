import { useState } from 'react';
import { ArrowLeft, RefreshCw, ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import Toast from '../Toast';

interface SwapPageProps {
  onBack: () => void;
}

const currencies = [
  { symbol: "STARMINT", name: "Starmint Token", balance: 0, price: 1.00, change: 0 },
  { symbol: "GETH", name: "Game Ethereum", balance: 0, price: 2.50, change: 5.2 },
  { symbol: "SCOIN", name: "Space Coin", balance: 0, price: 0.75, change: -2.1 },
  { symbol: "NEON", name: "Neon Credits", balance: 0, price: 1.25, change: 8.7 },
];

export default function SwapPage({ onBack }: SwapPageProps) {
  const [showToast, setShowToast] = useState(false);
  
  const handleSwapAttempt = () => {
    setShowToast(true);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    setShowToast(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Space background elements */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute top-10 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/30 rounded-full blur-2xl" />
      
      {/* Stars */}
      {Array.from({ length: 50 }, (_, i) => (
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
        {/* Header */}
        <div className="flex items-center space-x-2 sm:space-x-4 mb-4 sm:mb-6">
          <button
            onClick={onBack}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="text-cyan-400 font-bold text-base sm:text-lg">GalaxigaSwap</span>
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">SWAP</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 md:space-y-6">
          {/* Swap Interface */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Quick Swap</h3>
            
            {/* From Currency */}
            <div className="bg-slate-700/50 rounded-xl p-3 sm:p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">From</span>
                <span className="text-gray-400 text-xs sm:text-sm">Balance: 0</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-cyan-400 rounded-full shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-bold text-white truncate">STARMINT</span>
                <input
                  type="number"
                  placeholder="0.00"
                  onFocus={handleInputFocus}
                  className="flex-1 bg-transparent text-right text-base sm:text-lg md:text-xl font-bold text-white outline-none min-h-[44px] px-2"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button 
                onClick={handleSwapAttempt}
                className="bg-slate-800 border border-cyan-500/50 rounded-full p-3 hover:border-cyan-400 transition-colors duration-200 min-h-[44px] min-w-[44px]"
              >
                <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              </button>
            </div>

            {/* To Currency */}
            <div className="bg-slate-700/50 rounded-xl p-3 sm:p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">To</span>
                <span className="text-gray-400 text-xs sm:text-sm">Balance: 0</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-400 rounded-full shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-bold text-white truncate">GETH</span>
                <input
                  type="number"
                  placeholder="0.00"
                  onFocus={handleInputFocus}
                  className="flex-1 bg-transparent text-right text-base sm:text-lg md:text-xl font-bold text-white outline-none min-h-[44px] px-2"
                  readOnly
                />
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-400">Exchange Rate</span>
                <span className="text-white">1 STARMINT = 2.50 GETH</span>
              </div>
            </div>

            {/* Swap Button */}
            <button 
              onClick={handleSwapAttempt}
              className="w-full mt-3 sm:mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-colors duration-200 min-h-[44px] text-sm sm:text-base"
            >
              Connect Wallet to Swap
            </button>
          </div>

          {/* Market Prices */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-cyan-500/30">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Market Prices</h3>
            
            <div className="space-y-2 sm:space-y-3">
              {currencies.map((currency) => (
                <div
                  key={currency.symbol}
                  className="flex items-center justify-between p-2 sm:p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full shrink-0 ${
                      currency.symbol === 'STARMINT' ? 'bg-cyan-400' :
                      currency.symbol === 'GETH' ? 'bg-green-400' :
                      currency.symbol === 'SCOIN' ? 'bg-yellow-400' : 'bg-purple-400'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-sm sm:text-base truncate">{currency.symbol}</div>
                      <div className="text-xs sm:text-sm text-gray-400 truncate">{currency.name}</div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-bold text-white text-sm sm:text-base">${currency.price.toFixed(2)}</div>
                    <div className={`text-xs sm:text-sm flex items-center justify-end space-x-1 ${
                      currency.change > 0 ? 'text-green-400' : currency.change < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {currency.change > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : currency.change < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      <span>{currency.change > 0 ? '+' : ''}{currency.change.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/30">
            <p className="text-yellow-400 text-xs sm:text-sm text-center">
              🚀 Stay engaged! Swap functionality will come with the next version!
            </p>
          </div>
        </div>
      </div>
      
      <Toast
        message="🚀 Stay engaged! Swap functionality will come with the next version!"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}