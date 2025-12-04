import React, { useState } from "react";
import { ArrowLeft, ShoppingCart, Zap, Shield, Rocket, Plus } from "lucide-react";
import Toast from '../Toast';
import { usePlayerStats } from '../../lib/stores/usePlayerStats';

interface ShopPageProps {
  onBack: () => void;
}

const shopItems = [
  {
    id: 1,
    name: "Plasma Cannon",
    description: "High-damage laser weapon",
    price: 150,
    category: "weapons",
    icon: Zap,
    rarity: "rare"
  },
  {
    id: 2,
    name: "Shield Generator",
    description: "Absorbs 3 hits before breaking",
    price: 200,
    category: "defense",
    icon: Shield,
    rarity: "epic"
  },
  {
    id: 3,
    name: "Speed Boost",
    description: "Increases movement speed by 50%",
    price: 100,
    category: "upgrades",
    icon: Rocket,
    rarity: "common"
  },
  {
    id: 4,
    name: "Rapid Fire",
    description: "Doubles your firing rate",
    price: 175,
    category: "upgrades",
    icon: Zap,
    rarity: "rare"
  },
];

export default function ShopPage({ onBack }: ShopPageProps) {
  // Pre-compute star positions to avoid React Hook violations in render
  const stars = React.useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3
    })), []);

  const { stats, addPurchase } = usePlayerStats();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Calculate STARMINT tokens from achievements (placeholder calculation)
  const availableTokens = Math.floor(stats.totalScore / 100) + (stats.enemiesDestroyed * 2);
  
  const handlePurchaseAttempt = (item: typeof shopItems[0]) => {
    // Prevent all purchases and show the specified message
    setToastMessage('Stay engaged! Shop functionality will come with the next version!');
    setShowToast(true);
  };
    
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Space background elements */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute top-10 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/30 rounded-full blur-2xl" />
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse pointer-events-none"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      <div className="relative z-10 p-3 sm:p-4 min-h-[100dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onBack}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-cyan-400" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">SHOP</h1>
            </div>
          </div>
          
          {/* Currency Display */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl px-2 py-1 sm:px-3 sm:py-2 md:px-4 md:py-2 border border-cyan-500/30">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-cyan-400 rounded-full" />
              <span className="text-cyan-400 font-bold text-sm sm:text-base md:text-lg">{availableTokens.toLocaleString()}</span>
              <span className="text-gray-300 text-xs sm:text-sm md:text-base truncate">STARMINT</span>
            </div>
          </div>
        </div>

        {/* Shop Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {shopItems.map((item) => (
              <div
                key={item.id}
                className={`bg-slate-800/60 backdrop-blur-sm rounded-xl p-2 sm:p-3 md:p-4 border transition-all duration-300 hover:border-cyan-400/60 ${
                  item.rarity === 'epic'
                    ? 'border-orange-500/50 bg-gradient-to-r from-orange-500/10 to-transparent'
                    : item.rarity === 'rare'
                    ? 'border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-transparent'
                    : 'border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.rarity === 'epic'
                          ? 'bg-orange-500/20 border border-orange-500/50'
                          : item.rarity === 'rare'
                          ? 'bg-purple-500/20 border border-purple-500/50'
                          : 'bg-cyan-500/20 border border-cyan-500/50'
                      }`}
                    >
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-white truncate">{item.name}</h3>
                      <p className="text-gray-300 text-xs sm:text-sm line-clamp-1">{item.description}</p>
                      <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            item.rarity === 'epic'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : item.rarity === 'rare'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {item.rarity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="flex items-center space-x-1 sm:space-x-2 mb-2 justify-end">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-cyan-400 rounded-full" />
                      <span className="text-lg sm:text-xl font-bold text-cyan-400">{item.price}</span>
                    </div>
                    <button 
                      onClick={() => handlePurchaseAttempt(item)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 sm:space-x-2 min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Buy</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="mt-3 sm:mt-4 bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-yellow-500/30">
          <p className="text-yellow-400 text-xs sm:text-sm text-center">
            🚀 Stay engaged! Store purchases will come with the next version!
          </p>
        </div>
      </div>
      
      <Toast
        message={toastMessage || "🚀 Stay engaged! Store purchases will come with the next version!"}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}