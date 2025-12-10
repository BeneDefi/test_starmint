import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GameController,
  Trophy,
  User,
  ShoppingBag,
  ArrowsClockwise,
  Package,
  TrendUp,
  Sparkle,
  Rocket
} from "@phosphor-icons/react";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import ShopPage from "./pages/ShopPage";
import SwapPage from "./pages/SwapPage";

type Page = "menu" | "play" | "leaderboard" | "profile" | "shop" | "swap";

interface MainMenuProps {
  onStartGame: () => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [currentPage, setCurrentPage] = useState<Page>("menu");

  const handlePlayClick = () => {
    setCurrentPage("play");
    onStartGame();
  };

  const navigateToPage = (page: Page) => {
    setCurrentPage(page);
  };

  const navigateBack = () => {
    setCurrentPage("menu");
  };

  if (currentPage === "leaderboard") {
    return <LeaderboardPage onBack={navigateBack} />;
  }

  if (currentPage === "profile") {
    return <ProfilePage onBack={navigateBack} />;
  }

  if (currentPage === "shop") {
    return <ShopPage onBack={navigateBack} />;
  }

  if (currentPage === "swap") {
    return <SwapPage onBack={navigateBack} />;
  }

  return (
    <div className="min-h-[100dvh] relative overflow-y-auto" style={{
      backgroundImage: 'url(/home.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 p-3 sm:p-4 min-h-[100dvh] flex flex-col">
        {/* Top Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0"
        >
          {/* Looting Progress */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 sm:space-x-3 bg-black/40 backdrop-blur-sm rounded-2xl px-3 sm:px-5 py-2 sm:py-3 border border-cyan-400/40 shadow-lg shadow-cyan-500/10"
          >
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
              <Package weight="duotone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold text-xs sm:text-sm">Looting</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-12 sm:w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="w-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"></div>
                </div>
                <span className="text-gray-300 text-xs font-medium hidden sm:inline">0/15</span>
              </div>
            </div>
          </motion.div>

          {/* Currency Display */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 sm:space-x-3 bg-black/40 backdrop-blur-sm rounded-2xl px-3 sm:px-5 py-2 sm:py-3 border border-cyan-400/40 shadow-lg shadow-cyan-500/10"
          >
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full">
              <Sparkle weight="duotone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="text-center">
              <span className="text-cyan-400 font-bold text-sm sm:text-lg">0</span>
              <p className="text-gray-400 text-xs">Credits</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Starmint Balance Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-r from-black/50 to-slate-900/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 border border-cyan-400/30 shadow-xl shadow-cyan-500/5 relative overflow-hidden"
        >
          {/* Animated background glow */}
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between relative gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl">
                <Rocket weight="duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl sm:text-2xl font-bold tracking-wide">STARMINT</h1>
                <p className="text-gray-400 text-xs sm:text-sm">Classic Space Shooter</p>
              </div>
            </div>
            <div className="flex space-x-4 sm:space-x-8 justify-center sm:justify-end">
              <div className="text-center">
                <div className="text-gray-300 font-medium text-xs sm:text-sm mb-1">Balance</div>
                <div className="text-lg sm:text-2xl font-bold text-white font-mono">0<span className="text-cyan-400">.</span>00</div>
              </div>
              <div className="w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
              <div className="text-center">
                <div className="text-gray-300 font-medium text-xs sm:text-sm mb-1">Deposited</div>
                <div className="text-lg sm:text-2xl font-bold text-white font-mono">0<span className="text-cyan-400">.</span>00</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Menu Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex-1 grid grid-cols-2 gap-4 sm:gap-6"
        >
          {/* Play Card */}
          <motion.button
            onClick={handlePlayClick}
            whileHover={{ 
              scale: 1.05, 
              rotateY: 5,
              boxShadow: "0 25px 50px -12px rgba(6, 182, 212, 0.25)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="relative overflow-hidden min-h-[180px] sm:min-h-[200px] md:min-h-[220px] rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-black/60 to-slate-900/60 group focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            style={{
              backgroundImage: 'url(/play.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="button"
            aria-label="Start playing Starmint Classic Space Shooter"
            tabIndex={0}
          >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            {/* Animated border glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 rounded-3xl opacity-0 group-hover:opacity-30 blur transition-all duration-500 -z-10" />
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-white/10">
                <GameController weight="duotone" className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="text-center">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 mb-2 leading-tight">PLAY</h2>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 text-xs sm:text-sm font-medium">Start your galactic adventure</p>
              </div>
            </div>
          </motion.button>

          {/* Leaderboard Card */}
          <motion.button
            onClick={() => navigateToPage("leaderboard")}
            whileHover={{ 
              scale: 1.05, 
              rotateY: -5,
              boxShadow: "0 25px 50px -12px rgba(34, 197, 94, 0.25)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="relative overflow-hidden min-h-[180px] sm:min-h-[200px] md:min-h-[220px] rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-black/60 to-slate-900/60 group focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            style={{
              backgroundImage: 'url(/leaderboard.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="button"
            aria-label="View leaderboard and rankings"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 rounded-3xl opacity-0 group-hover:opacity-30 blur transition-all duration-500 -z-10" />
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl backdrop-blur-sm border border-white/10">
                <Trophy weight="duotone" className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="text-center">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 mb-2 leading-tight">LEADERBOARD</h2>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 text-xs sm:text-sm font-medium">Compete with space pilots</p>
              </div>
            </div>
          </motion.button>

          {/* Profile Card */}
          <motion.button
            onClick={() => navigateToPage("profile")}
            whileHover={{ 
              scale: 1.05, 
              rotateY: 5,
              boxShadow: "0 25px 50px -12px rgba(147, 51, 234, 0.25)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="relative overflow-hidden min-h-[180px] sm:min-h-[200px] md:min-h-[220px] rounded-3xl border border-purple-400/40 bg-gradient-to-br from-black/60 to-slate-900/60 group focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            style={{
              backgroundImage: 'url(/profile.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="button"
            aria-label="View profile, inventory and achievements"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 rounded-3xl opacity-0 group-hover:opacity-30 blur transition-all duration-500 -z-10" />
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-sm border border-white/10">
                <User weight="duotone" className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="text-center">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-2 leading-tight">PROFILE</h2>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 text-xs sm:text-sm font-medium">Inventory & Achievements</p>
              </div>
            </div>
          </motion.button>

          {/* Shop Card */}
          <motion.button
            onClick={() => navigateToPage("shop")}
            whileHover={{ 
              scale: 1.05, 
              rotateY: -5,
              boxShadow: "0 25px 50px -12px rgba(249, 115, 22, 0.25)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="relative overflow-hidden min-h-[180px] sm:min-h-[200px] md:min-h-[220px] rounded-3xl border border-orange-400/40 bg-gradient-to-br from-black/60 to-slate-900/60 group focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            style={{
              backgroundImage: 'url(/store.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="button"
            aria-label="Visit the shop to purchase items and upgrades"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 rounded-3xl opacity-0 group-hover:opacity-30 blur transition-all duration-500 -z-10" />
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl backdrop-blur-sm border border-white/10">
                <ShoppingBag weight="duotone" className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="text-center">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-200 mb-2 leading-tight">SHOP</h2>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 text-xs sm:text-sm font-medium">Purchase upgrades & items</p>
              </div>
            </div>
          </motion.button>

          {/* Swap Card - spans full width */}
          <motion.button
            onClick={() => navigateToPage("swap")}
            whileHover={{ 
              scale: 1.03, 
              rotateX: 2,
              boxShadow: "0 25px 50px -12px rgba(6, 182, 212, 0.25)"
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="col-span-2 relative overflow-hidden min-h-[140px] sm:min-h-[150px] md:min-h-[160px] rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-black/60 to-slate-900/60 group focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            style={{
              backgroundImage: 'url(/swap.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            role="button"
            aria-label="Access StarmintSwap to trade game currencies"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 rounded-3xl opacity-0 group-hover:opacity-30 blur transition-all duration-500 -z-10" />
            
            <div className="relative z-10 flex flex-col items-center justify-center space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-white/10">
                  <ArrowsClockwise weight="duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 group-hover:text-white group-hover:animate-spin transition-all duration-300" />
                </div>
                <div className="text-left">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold text-sm sm:text-lg tracking-wide">StarmintSwap</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-100 transition-colors duration-300">SWAP</h2>
                </div>
              </div>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 text-xs sm:text-sm font-medium text-center">Trade currencies & tokens in the galactic marketplace</p>
            </div>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}