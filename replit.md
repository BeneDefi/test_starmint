# STARMINT - Farcaster Space Shooter Game

## Overview
STARMINT is a Web3 space shooter game built as a Farcaster MiniApp. It combines classic arcade gameplay with modern Web3 technology, offering players NFT achievements, social leaderboards, and crypto rewards on the Base network.

## Architecture

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.20
- **Styling**: Tailwind CSS 3.4.14
- **State Management**: Zustand 5.0.3
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion 11.18.2
- **3D Effects**: Three.js 0.170.0

### Backend
- **Server**: Express 4.21.2 with TypeScript
- **Database**: PostgreSQL via Neon serverless (Drizzle ORM 0.39.1)
- **Authentication**: JWT tokens
- **Security**: Helmet, express-rate-limit, bcrypt

### Web3 Integration
- **Farcaster SDK**: @farcaster/miniapp-sdk 0.1.10
- **Wallet**: wagmi 2.16.9, viem 2.38.3
- **NFT**: ERC-721 contract on Base network (StarmintScoreNFT)

## Project Structure
```
/
├── client/             # React frontend
│   ├── public/         # Static assets (sounds, textures, farcaster.json)
│   └── src/           
│       ├── components/ # React components
│       └── lib/        # Game engine, stores, utilities
├── server/             # Express backend
│   ├── api/            # API routes
│   ├── db.ts           # Database connection
│   ├── routes.ts       # Route definitions
│   └── index.ts        # Server entry point
├── shared/             # Shared types and schema
│   └── schema.ts       # Drizzle schema definitions
├── contracts/          # Solidity smart contracts
│   ├── StarmintScoreNFT.sol  # Enhanced NFT with on-chain SVG
│   └── ScoreNFT.sol          # Legacy contract
├── script/             # Foundry deployment scripts
├── test/               # Foundry tests
└── public/             # Public static files
```

## Development Commands
- `npm run dev` - Start development server (port 5000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema with Drizzle
- `npm run check` - TypeScript type checking

## Environment Variables
Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned by Replit)
- `JWT_SECRET` - Secret for JWT token signing
- `GAME_ENCRYPTION_KEY` - Key for game state encryption

Optional (NFT Deployment):
- `VITE_SCORE_NFT_CONTRACT_ADDRESS` - Deployed NFT contract address
- `DEPLOYER_PRIVATE_KEY` - Private key for contract deployment
- `BASESCAN_API_KEY` - For contract verification

## NFT Smart Contract

### StarmintScoreNFT Features
- **On-Chain SVG**: Dynamic artwork generated from score data
- **Rich Metadata**: Score, level, enemies defeated, rarity, date
- **Rarity Tiers**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- **Verification**: Screenshot hash for game session validation

### Rarity Tiers
| Score Range | Rarity | Color |
|-------------|--------|-------|
| 100,000+ | LEGENDARY | Gold |
| 50,000-99,999 | EPIC | Purple |
| 20,000-49,999 | RARE | Blue |
| 5,000-19,999 | UNCOMMON | Green |
| 0-4,999 | COMMON | Gray |

### Deployment
See `DEPLOYMENT_GUIDE.md` for complete instructions on deploying to Base mainnet using Foundry.

## Database Schema
Main tables (defined in shared/schema.ts):
- `users` - Player accounts with Farcaster integration
- `player_stats` - Cumulative player statistics
- `game_sessions` - Individual game session records
- `high_scores` - Leaderboard entries
- `user_achievements` - Achievement tracking
- `player_rankings` - Cached ranking data
- `daily_logins` - Streak tracking
- `purchase_history` - In-game purchases

## Port Configuration
- Port 5000: Main server (serves both frontend via Vite dev server and API)
- All hosts are allowed for Replit proxy compatibility

## Deployment
Configured for autoscale deployment:
- Build: `npm run build`
- Run: `npm run start`
