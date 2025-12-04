# STARMINT - Farcaster Space Shooter Game

## Project Overview

STARMINT is a cutting-edge space shooter game that blends classic arcade gameplay with modern Web3 technology. Built as a Farcaster MiniApp, it offers an immersive gaming experience with social features, NFT achievements, crypto rewards on the Base network, and an integrated token swap system.

## Recent Changes (December 4, 2024)

### HighScoreNFT System Migration
- ✅ Migrated from simple ScoreNFT to advanced HighScoreNFT with backend verification
- ✅ Added HighScoreNFT ABI and constants to wagmiConfig.ts (legacy ScoreNFT preserved)
- ✅ Created useHighScoreMint hook integrating useNftMinting store with wagmi contract calls
- ✅ Updated ShareOrMintModal with rarity display, mint fees, and full game data
- ✅ Implemented rarity tiers: Common, Uncommon, Rare, Epic, Legendary based on score
- ✅ Added mint fee display (~$0.10 in ETH) with real-time USD conversion
- ✅ Added fallback "Coming Soon" UI when HighScoreNFT contract not yet deployed
- ✅ Full game data passed to modal: score, level, enemies defeated, game time

### Swap System Implementation
- ✅ Created SwapRouterExtension smart contract with Uniswap V3 integration
- ✅ Implemented fee logic: $0.10 flat for swaps <$500, 0.1% for swaps ≥$500
- ✅ Added points system: 1 point per $10 swapped
- ✅ Created Foundry deployment script for Base mainnet
- ✅ Added database tables: swap_history, swap_points, points_redemptions
- ✅ Implemented backend API endpoints for swap recording and points
- ✅ Built SwapPage with real Web3 integration via wagmi/viem
- ✅ Created useSwap store for state management
- ✅ Added comprehensive deployment documentation

### Initial Setup
- ✅ Imported GitHub repository to Replit
- ✅ PostgreSQL database provisioned and schema pushed
- ✅ Environment variables configured (JWT_SECRET, GAME_ENCRYPTION_KEY, NEYNAR_API_KEY)
- ✅ Development server running on port 5000
- ✅ Deployment configuration set up for autoscale
- ✅ All dependencies installed successfully

## Tech Stack

### Frontend
- **React** 18.3.1 - UI framework
- **Vite** 5.4.20 - Build tool & dev server
- **TypeScript** 5.6.3 - Type safety
- **Tailwind CSS** 3.4.14 - Styling
- **Three.js** - 3D graphics and effects
- **Zustand** - State management

### Backend
- **Express** 4.21.2 - Web server
- **PostgreSQL** (Neon) - Database
- **Drizzle ORM** 0.39.1 - Database ORM
- **JWT** - Authentication
- **WebSocket** - Real-time features

### Farcaster & Web3
- **@farcaster/miniapp-sdk** - Farcaster MiniApp integration
- **@neynar/nodejs-sdk** - Neynar API for Farcaster data
- **wagmi** & **viem** - Web3 wallet connection
- **Base Network** - Layer 2 for NFT minting

## Project Architecture

```
starmint/
├── client/                 # Frontend React app
│   ├── public/            # Static assets & Farcaster manifest
│   └── src/
│       ├── components/    # React components
│       │   └── pages/    # Page components (SwapPage, etc.)
│       ├── lib/          # Game engine, accessibility, security
│       │   ├── stores/   # Zustand stores (useSwap, usePlayerStats)
│       │   └── web3/     # Web3 configuration (wagmi, viem)
│       └── styles/       # CSS files
├── server/                # Backend Express app
│   ├── api/              # API routes
│   ├── db.ts            # Database configuration
│   ├── routes.ts        # Main routes (includes swap endpoints)
│   ├── storage.ts       # Database storage layer
│   └── index.ts         # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema (includes swap tables)
├── contracts/            # Solidity smart contracts
│   └── SwapRouterExtension.sol  # Uniswap V3 swap router with fees
├── script/               # Foundry deployment scripts
│   └── DeploySwapRouter.s.sol
└── foundry.toml          # Foundry configuration
```

## Environment Variables

### Configured
- `DATABASE_URL` - PostgreSQL connection (Replit managed)
- `JWT_SECRET` - JWT token signing key
- `GAME_ENCRYPTION_KEY` - Game state encryption key
- `NEYNAR_API_KEY` - Farcaster API key (secret)
- `NODE_ENV` - Development/production mode
- `PORT` - Server port (5000)

## Key Features

### Game Mechanics
- 5 difficulty levels (Easy to Nightmare)
- 6+ enemy types with unique AI behaviors
- Power-up system (Shield, Rapid Fire, Multi-Shot, Health)
- Special weapons (Plasma, Homing, Splitting, Bouncing)
- Dynamic difficulty scaling
- Advanced particle effects

### Security
- Server-side score validation
- AES game state encryption
- HMAC-SHA256 integrity checks
- Anti-cheat detection
- Rate limiting

### Social & Web3
- Farcaster authentication
- Social leaderboards (global & friends)
- NFT achievement minting on Base
- Multi-platform sharing
- Daily streaks and rewards

## Database Schema

### Core Tables
- `users` - User accounts with Farcaster integration
- `player_stats` - Player statistics and progression
- `game_sessions` - Detailed game session tracking
- `high_scores` - Leaderboard entries
- `user_achievements` - Achievement tracking
- `player_rankings` - Cached rankings for performance
- `daily_logins` - Login streak tracking
- `purchase_history` - In-game purchase tracking

### Swap System Tables
- `swap_history` - Records of all swap transactions
- `swap_points` - User points balance and swap statistics
- `points_redemptions` - History of points redemptions

## Development

### Running Locally
```bash
npm install           # Install dependencies
npm run db:push      # Push database schema
npm run dev          # Start development server (port 5000)
```

### Production Build
```bash
npm run build        # Build frontend and backend
npm start           # Start production server
```

## Deployment

The project is configured for Replit autoscale deployment:
- **Build command**: `npm run build`
- **Run command**: `npm start`
- **Port**: 5000 (frontend server)

## Farcaster Integration

The app includes a Farcaster manifest at `client/public/.well-known/farcaster.json` for MiniApp compatibility. It can be embedded in Warpcast and other Farcaster clients.

## User Preferences

- The project uses the existing codebase structure and conventions
- Vite is already configured for Replit with `allowedHosts: true`
- Server binding is set to `0.0.0.0:5000` for proper proxy access
- Cache control headers should be maintained for iframe rendering

## Notes

- The game works with a demo Neynar API key for testing
- Full Farcaster features require a valid NEYNAR_API_KEY
- NFT minting features require Web3 wallet connection
- The app is optimized for both mobile and desktop gameplay
- Accessibility features include keyboard navigation, screen reader support, and colorblind modes
