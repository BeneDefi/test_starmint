# 🚀 STARMINT - Farcaster Space Shooter Game

<div align="center">

![STARMINT Banner](https://i.imgur.com/g0efTKV.jpeg)

**A next-generation Web3 space shooter game with Farcaster integration, NFT rewards, and social leaderboards**

[![Built with React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![Powered by Farcaster](https://img.shields.io/badge/Farcaster-MiniApp-8A63D2?logo=farcaster)](https://www.farcaster.xyz/)
[![Web3 Ready](https://img.shields.io/badge/Web3-Base%20Network-0052FF?logo=coinbase)](https://base.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)

[Play Now](https://starmint.onrender.com/) • [Farcaster Frame](https://warpcast.com/) • [Documentation](#documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Game Features](#-game-features)
- [Web3 Integration](#-web3-integration)
- [Security Features](#-security-features)
- [Performance & Accessibility](#-performance--accessibility)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**STARMINT** is a cutting-edge space shooter game that seamlessly blends classic arcade gameplay with modern Web3 technology. Built as a Farcaster MiniApp, it offers players an immersive gaming experience with social features, NFT achievements, and crypto rewards on the Base network.

### What Makes STARMINT Unique?

- 🎮 **Classic Arcade Gameplay** - Nostalgic space shooter mechanics with modern enhancements
- 🔗 **Farcaster Integration** - Native social features, authentication, and Frame compatibility
- 🏆 **NFT Achievement System** - Mint score achievements as NFTs on Base network
- 📊 **Social Leaderboards** - Compete with friends and global players
- 🎯 **Progressive Difficulty** - 5 difficulty levels with adaptive enemy AI
- 💎 **Multiple Weapon Systems** - Plasma, homing, splitting, and bouncing bullets
- 🔐 **Anti-Cheat Protection** - Server-side validation and game state encryption
- ♿ **Accessibility First** - Full keyboard navigation, screen reader support, reduced motion

---

## ✨ Key Features

### 🎯 Game Mechanics

- **5 Difficulty Levels**: Easy, Normal, Hard, Expert, Nightmare
- **Advanced Enemy AI**: 6+ enemy types with unique behaviors (Kamikaze, Tank, Sniper, Boss)
- **Power-Up System**: Shield, rapid fire, multi-shot, and health restoration
- **Special Weapons**:
  - Plasma Bullets (area damage)
  - Homing Missiles (target tracking)
  - Splitting Bullets (multi-target)
  - Bouncing Bullets (wall reflection)
- **Dynamic Difficulty Scaling**: Real-time adjustment based on player performance
- **Particle Effects**: Advanced visual effects with performance optimization

### 🌐 Social & Web3 Features

- **Farcaster Authentication**: Seamless login via Farcaster wallet
- **Social Leaderboards**: Global and friends ranking systems
- **NFT Minting**: Score achievements minted as ERC-721 tokens on Base
- **Share System**: Multi-platform sharing (Farcaster, X/Twitter, Telegram, WhatsApp)
- **Daily Streaks**: Login rewards and streak tracking
- **Achievement System**: 15+ achievements with on-chain verification

### 🛡️ Security & Performance

- **Anti-Cheat System**:
  - Server-side score validation
  - Game state encryption (AES)
  - Integrity checks (HMAC-SHA256)
  - Timing validation
  - Action frequency monitoring
- **Performance Optimization**:
  - Object pooling for bullets/particles/enemies
  - Adaptive quality settings based on device
  - Frame-rate monitoring and auto-adjustment
  - Batch rendering for particles
  - Memory management and garbage collection
- **Accessibility**:
  - Keyboard-only navigation
  - Screen reader support with ARIA live regions
  - Reduced motion mode
  - High contrast mode
  - Colorblind filters (Protanopia, Deuteranopia, Tritanopia)
  - Adjustable font sizes
  - Haptic feedback with intensity control

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **Vite** | 5.4.20 | Build tool & dev server |
| **TypeScript** | 5.6.3 | Type safety |
| **Tailwind CSS** | 3.4.14 | Styling |
| **Three.js** | 0.170.0 | 3D graphics (effects) |
| **Framer Motion** | 11.18.2 | Animations |
| **Zustand** | 5.0.3 | State management |

### Farcaster & Web3

| Technology | Version | Purpose |
|------------|---------|---------|
| **@farcaster/miniapp-sdk** | 0.1.10 | Farcaster MiniApp integration |
| **@neynar/nodejs-sdk** | 3.34.0 | Neynar API for Farcaster data |
| **wagmi** | 2.16.9 | Web3 wallet connection |
| **viem** | 2.38.3 | Web3 utilities |
| **Base Network** | - | Layer 2 for NFT minting |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Express** | 4.21.2 | Web server |
| **PostgreSQL** | (Neon) | Database |
| **Drizzle ORM** | 0.39.1 | Database ORM |
| **JWT** | 9.0.2 | Authentication |
| **WebSocket (ws)** | 8.18.0 | Real-time features |

### Security & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **Helmet** | 8.1.0 | HTTP security headers |
| **express-rate-limit** | 8.1.0 | Rate limiting |
| **crypto-js** | 4.2.0 | Encryption |
| **express-validator** | 7.2.1 | Input validation |
| **bcrypt** | 6.0.0 | Password hashing |

### UI Components

- **Radix UI**: Accessible component primitives (Dialog, Popover, Tooltip, etc.)
- **Lucide React**: Icon library
- **Recharts**: Charts and analytics
- **Sonner**: Toast notifications

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         STARMINT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Farcaster     │
│    MiniApp      │◄────────────────────────┐
│    Context      │                         │
└────────┬────────┘                         │
         │                                  │
         │ Auth & User Data                 │
         ▼                                  │
┌─────────────────────────────────────────┐│
│         CLIENT (React + Vite)            ││
├──────────────────────────────────────────┤│
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   Game Engine (Canvas-based)       │ ││
│  │   - Player, Enemies, Bullets       │ ││
│  │   - Collision Detection            │ ││
│  │   - Particle Systems               │ ││
│  │   - Performance Optimizer          │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   State Management (Zustand)       │ ││
│  │   - Game State                     │ ││
│  │   - Player Stats                   │ ││
│  │   - Audio/Vibration                │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   Security Layer                   │ ││
│  │   - Game State Encryption          │ ││
│  │   - Anti-Cheat Validation          │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
└────────────────┬─────────────────────────┘│
                 │                          │
                 │ HTTPS/WSS                │
                 ▼                          │
┌─────────────────────────────────────────┐│
│         SERVER (Express + TS)            ││
├──────────────────────────────────────────┤│
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   Authentication (JWT)             │ ││
│  │   - Farcaster FID verification     │ ││
│  │   - Token generation               │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   Game Validation API              │ ││
│  │   - Score verification             │ ││
│  │   - State decryption               │ ││
│  │   - Cheat detection                │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
│  ┌────────────────────────────────────┐ ││
│  │   Social Features API              │ ││
│  │   - Leaderboards                   │ ││
│  │   - Friends ranking                │ ││
│  │   - Activity tracking              │ ││
│  └────────────────────────────────────┘ ││
│                                          ││
└────────────────┬─────────────────────────┘│
                 │                          │
                 ▼                          │
┌─────────────────────────────────────────┐│
│      DATABASE (PostgreSQL/Neon)          ││
├──────────────────────────────────────────┤│
│  - users                                 ││
│  - game_sessions                         ││
│  - player_stats                          ││
│  - achievements                          ││
│  - leaderboard_entries                   ││
│  - nft_mints                             ││
└──────────────────────────────────────────┘│
                                            │
         ┌──────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       BLOCKCHAIN (Base Network)          │
├──────────────────────────────────────────┤
│  ScoreNFT Contract (ERC-721)             │
│  - Score achievements as NFTs            │
│  - On-chain metadata                     │
└──────────────────────────────────────────┘
```

### Key Architectural Patterns

1. **Client-Side Game Engine**: Canvas-based 2D engine with object pooling
2. **Server-Side Validation**: All scores and achievements verified server-side
3. **Encrypted Communication**: AES encryption for game state
4. **Optimistic UI**: Instant feedback with server confirmation
5. **Progressive Enhancement**: Works without Web3, enhanced with wallet

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (or Neon account)
- Farcaster account (for testing)
- Base network wallet (optional, for NFT features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/starmint.git
   cd starmint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5000
   ```

### Replit Deployment

This project is optimized for Replit deployment:

1. Import the repository to Replit
2. Set environment variables in Secrets
3. Click "Run" - the server starts automatically on port 5000
4. Access via the Replit webview

---

## 🔐 Environment Variables

### Required Variables

```bash
# JWT Authentication
JWT_SECRET=your-secure-jwt-secret-key

# Game Encryption
GAME_ENCRYPTION_KEY=your-game-encryption-key

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Farcaster/Neynar
NEYNAR_API_KEY=your-neynar-api-key

# Web3 (Optional)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-id
```

### Optional Variables

```bash
# Environment
NODE_ENV=development

# Server
PORT=5000

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=900000
```

---

## 🎮 Game Features

### Enemy Types

| Enemy | Health | Speed | Score | Special Ability |
|-------|--------|-------|-------|-----------------|
| **Basic** | 1 | Medium | 100 | Standard movement |
| **Fast** | 1 | Fast | 150 | Rapid zig-zag pattern |
| **Tank** | 3 | Slow | 300 | High durability |
| **Kamikaze** | 1 | Very Fast | 200 | Charges at player |
| **Sniper** | 2 | Slow | 250 | Long-range attacks |
| **Boss** | 50 | Medium | 5000 | Multi-phase attacks |

### Power-Ups

- **Shield** (🛡️): 5 seconds of invincibility
- **Rapid Fire** (⚡): 10 seconds of increased fire rate
- **Multi-Shot** (🎯): Spread shot for 10 seconds
- **Health** (❤️): Restore 1 life

### Weapons

- **Standard Bullet**: Basic projectile
- **Plasma Bullet**: Area-of-effect damage
- **Homing Missile**: Tracks nearest enemy
- **Splitting Bullet**: Divides on impact
- **Bouncing Bullet**: Ricochets off walls

### Difficulty Progression

| Level | Difficulty | Enemy Spawn Rate | Boss Health |
|-------|-----------|------------------|-------------|
| 1 | Easy | Low | 30 |
| 2 | Normal | Medium | 40 |
| 3 | Hard | High | 50 |
| 4 | Expert | Very High | 60 |
| 5+ | Nightmare | Extreme | 50 + (level * 10) |

---

## 🌐 Web3 Integration

### Farcaster MiniApp

STARMINT is a fully-functional Farcaster MiniApp that:

- **Authenticates** via Farcaster wallet
- **Displays** in Farcaster clients (Warpcast)
- **Shares** achievements via casts
- **Integrates** with Farcaster social graph

### Farcaster Manifest

Location: `client/public/.well-known/farcaster.json`

```json
{
  "accountAssociation": {...},
  "frame": {
    "version": "1",
    "name": "STARMINT Space Shooter",
    "iconUrl": "https://i.imgur.com/7ioOqIO.jpeg",
    "homeUrl": "https://starmint.onrender.com/",
    "buttonTitle": "Play Game",
    "splashImageUrl": "https://i.imgur.com/7ioOqIO.jpeg"
  }
}
```

### NFT Contract (Base Network)

**Contract**: `contracts/ScoreNFT.sol`

- **Standard**: ERC-721
- **Network**: Base Mainnet
- **Features**:
  - Score as on-chain metadata
  - Achievement verification
  - Transferable ownership

**Mint Function**:
```solidity
function mintScore(address to, uint256 score, uint256 level) 
    public returns (uint256)
```

---

## 🔒 Security Features

### Game State Protection

1. **Encryption**: AES encryption of all game state
2. **Integrity Checks**: HMAC-SHA256 validation
3. **Timing Validation**: Prevent frame-perfect cheats
4. **Action Frequency**: Bot detection via action rate monitoring

### Anti-Cheat Validation

```typescript
// Client-side: GameSecurity.ts
- validateAction(): Check action timing
- validateGameState(): Verify score/level progression
- detectAnomalies(): Identify suspicious patterns

// Server-side: routes.ts
- decryptGameState(): Decrypt and validate
- validateScore(): Server-side score verification
- checkProgression(): Ensure logical progression
```

### Server Security

- **Helmet.js**: Security headers (CSP, XSS protection)
- **Rate Limiting**: 1000 req/15min (general), 100 req/15min (API)
- **CORS**: Configured for Frame embedding
- **JWT**: Secure token-based authentication
- **Input Validation**: express-validator middleware

---

## ⚡ Performance & Accessibility

### Performance Optimizations

#### Object Pooling
```typescript
// GameOptimizer.ts
- bulletPool: Reusable bullet objects
- particlePool: Reusable particle objects
- enemyPool: Reusable enemy objects
```

#### Device Detection
```typescript
// Automatic quality adjustment
- Mobile: Medium quality (30-60 particles)
- Desktop: High quality (100 particles)
- Low-end: Reduced effects, simple rendering
```

#### Adaptive Quality
- FPS monitoring with auto-adjustment
- Frame skipping below 20 FPS
- Batch rendering for particles
- Level-of-detail (LOD) system

### Accessibility Features

#### Visual
- High contrast mode
- Colorblind filters (3 types)
- Adjustable font sizes
- Reduced motion support

#### Input
- Full keyboard navigation
- Touch controls for mobile
- Gamepad support (planned)

#### Audio
- Screen reader integration
- Audio descriptions
- Haptic feedback alternatives

#### Implementation
```typescript
// GameAccessibility.ts
- detectUserPreferences(): System settings
- setupScreenReader(): ARIA live regions
- setupKeyboardNavigation(): Focus management
- applyColorBlindFilter(): SVG filters
```

---

## 📡 API Documentation

### Authentication

#### POST `/api/auth/farcaster`
Authenticate with Farcaster FID

**Request**:
```json
{
  "fid": 54321,
  "username": "player",
  "displayName": "Player Name",
  "pfpUrl": "https://..."
}
```

**Response**:
```json
{
  "token": "jwt-token",
  "user": {...}
}
```

### Game Sessions

#### POST `/api/game-session`
Submit game session (requires auth)

**Request**:
```json
{
  "encryptedGameState": "...",
  "score": 5000,
  "level": 3,
  "gameTime": 120000,
  "enemiesDestroyed": 50,
  "accuracy": 0.75
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "validated": true
}
```

### Leaderboards

#### GET `/api/leaderboard/:type`
Get leaderboard (global, friends, or weekly)

**Response**:
```json
{
  "entries": [
    {
      "rank": 1,
      "fid": 54321,
      "displayName": "Player",
      "score": 10000,
      "pfpUrl": "..."
    }
  ]
}
```

### Player Stats

#### GET `/api/player-stats/:fid`
Get player statistics

**Response**:
```json
{
  "highScore": 10000,
  "totalScore": 50000,
  "gamesPlayed": 25,
  "enemiesDestroyed": 500,
  "accuracy": 75,
  "achievements": [...]
}
```

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set environment variables** in your hosting platform

3. **Start the server**:
   ```bash
   npm start
   ```

### Deployment Platforms

#### Replit (Recommended)
- Auto-deployment from repository
- Built-in PostgreSQL (Neon)
- Automatic HTTPS
- Environment secrets management

#### Render/Railway
```bash
# Build command
npm run build

# Start command
npm start
```

#### Vercel/Netlify
Use as API backend with separate frontend deployment

---

## 💻 Development

### Project Structure

```
starmint/
├── client/                 # Frontend React app
│   ├── public/            # Static assets
│   │   ├── .well-known/   # Farcaster manifest
│   │   ├── sounds/        # Game audio
│   │   └── textures/      # Game graphics
│   └── src/
│       ├── components/    # React components
│       │   ├── pages/     # Page components
│       │   └── ui/        # UI components (Radix)
│       ├── lib/
│       │   ├── gameEngine/      # Game logic
│       │   ├── accessibility/   # A11y features
│       │   ├── performance/     # Optimizations
│       │   ├── security/        # Anti-cheat
│       │   ├── social/          # Leaderboards
│       │   ├── web3/            # Blockchain
│       │   └── stores/          # State (Zustand)
│       └── styles/        # CSS files
├── server/                # Backend Express app
│   ├── api/              # API routes
│   ├── db.ts             # Database connection
│   ├── routes.ts         # Route handlers
│   └── index.ts          # Server entry
├── shared/               # Shared TypeScript types
│   └── schema.ts         # Database schema (Drizzle)
├── contracts/            # Solidity contracts
│   └── ScoreNFT.sol     # NFT contract
└── public/              # Static files served

```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push database schema |

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes** and test locally

3. **Run type checking**:
   ```bash
   npm run check
   ```

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

5. **Push and create PR**

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Reporting Issues

- Use the GitHub issue tracker
- Provide detailed reproduction steps
- Include browser/device information
- Attach screenshots if relevant

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Technologies & Libraries

- **React Team** - UI framework
- **Farcaster** - Social protocol
- **Neynar** - Farcaster API
- **Base** - L2 blockchain
- **Radix UI** - Accessible components
- **Neon** - Serverless Postgres

### Assets & Resources

- Sound effects: Arcade game sound packs
- Graphics: Custom pixel art
- Icons: Lucide React

---

## 📞 Support

- **Documentation**: [View Docs](#documentation)
- **Issues**: [GitHub Issues](https://github.com/yourusername/starmint/issues)
- **Farcaster**: [@starmint](https://warpcast.com/starmint)
- **Email**: support@starmint.com

---

<div align="center">

**Built with ❤️ by the STARMINT Team**

[Website](https://starmint.onrender.com) • [Twitter](https://twitter.com/starmint) • [Farcaster](https://warpcast.com/starmint) • [Discord](https://discord.gg/starmint)

</div>
