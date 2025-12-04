# STARMINT Swap System Deployment Guide

This guide covers deploying the SwapRouterExtension smart contract and integrating it with the STARMINT game.

## Overview

The swap system enables:
- **ETH ↔ USDC swaps** on Base mainnet using Uniswap V3
- **Points system**: Earn 1 point per $10 swapped
- **Fee structure**: $0.10 flat fee for swaps <$500, 0.1% for swaps ≥$500
- **Future STARMINT token swaps** (address settable by owner)

## Prerequisites

1. **Foundry installed** - https://getfoundry.sh
2. **Base mainnet RPC** - Get from Alchemy, Infura, or similar
3. **Deployer wallet** with Base ETH for gas
4. **Basescan API key** for contract verification

## Smart Contract Architecture

### Key Contracts
- `SwapRouterExtension.sol` - Main swap router with fee logic and points
- Uses Uniswap V3 SwapRouter: `0x2626664c2603336E57B271c5C0b26F421741e481`
- Chainlink ETH/USD Price Feed: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

### Fee Logic
```solidity
if (usdNotional >= 500e18) {
    fee = (usdNotional * 10) / 10000; // 0.1%
} else {
    fee = 0.1e18; // $0.10 flat
}
```

## Deployment Steps

### 1. Set Environment Variables

Create `.env` in project root:
```bash
# RPC endpoint
BASE_RPC_URL=https://mainnet.base.org

# Deployer private key (NEVER commit this!)
DEPLOYER_PRIVATE_KEY=0x...

# Basescan API key for verification
BASESCAN_API_KEY=...
```

### 2. Deploy Contract

```bash
# Build contracts
forge build

# Deploy to Base mainnet
forge script script/DeploySwapRouter.s.sol:DeploySwapRouter \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 3. Verify Contract (if not auto-verified)

```bash
forge verify-contract \
  --chain-id 8453 \
  --constructor-args $(cast abi-encode "constructor()") \
  <DEPLOYED_ADDRESS> \
  src/SwapRouterExtension.sol:SwapRouterExtension \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 4. Update Application Configuration

After deployment, update the swap router address in:

1. **Backend API** (`server/routes.ts`):
```typescript
// Update swapRouterAddress in /api/swap/config endpoint
swapRouterAddress: "0x...", // Your deployed address
```

2. **Frontend Config** (`client/src/lib/web3/config.ts`):
```typescript
export const SWAP_ROUTER_ADDRESS = "0x..." as const;
```

## Post-Deployment Configuration

### Set STARMINT Token Address (After Token Launch)

```bash
cast send <SWAP_ROUTER_ADDRESS> \
  "setStarmintToken(address)" \
  <STARMINT_TOKEN_ADDRESS> \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Update Fee Parameters (If Needed)

```bash
# Update flat fee
cast send <SWAP_ROUTER_ADDRESS> \
  "setFlatFeeUsd(uint256)" \
  <FEE_IN_WEI> \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Withdraw Collected Fees

```bash
cast send <SWAP_ROUTER_ADDRESS> \
  "withdrawFees(address)" \
  <RECIPIENT_ADDRESS> \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## API Endpoints

### Record Swap
```http
POST /api/swap/record
Content-Type: application/json

{
  "farcasterFid": 123456,
  "txHash": "0x...",
  "fromToken": "ETH",
  "toToken": "USDC",
  "amountIn": "1.0",
  "amountOut": "3500.00",
  "usdNotional": "3500.00",
  "feePaid": "3.50",
  "pointsEarned": 350
}
```

### Get Points Balance
```http
GET /api/swap/points/:farcasterFid
```

### Get Swap History
```http
GET /api/swap/history/:farcasterFid?limit=50
```

### Redeem Points
```http
POST /api/swap/points/redeem
Content-Type: application/json

{
  "farcasterFid": 123456,
  "pointsToRedeem": 100,
  "redemptionType": "game_credits"  // or "starmint_token"
}
```

### Get Swap Config
```http
GET /api/swap/config
```

## Database Schema

### swap_history
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | FK to users |
| txHash | varchar | Transaction hash |
| fromToken | varchar | Source token symbol |
| toToken | varchar | Destination token symbol |
| amountIn | varchar | Input amount |
| amountOut | varchar | Output amount |
| usdNotional | varchar | USD value of swap |
| feePaid | varchar | Fee in USD |
| pointsEarned | integer | Points earned |
| status | varchar | pending/completed/failed |
| createdAt | timestamp | Creation time |

### swap_points
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | FK to users |
| totalPoints | integer | Lifetime points earned |
| pointsRedeemed | integer | Points used |
| availablePoints | integer | Current balance |
| totalSwapVolumeUsd | varchar | Total swap volume |
| swapCount | integer | Number of swaps |
| lastSwapAt | timestamp | Last swap time |
| updatedAt | timestamp | Last update |

### points_redemptions
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | FK to users |
| pointsRedeemed | integer | Points spent |
| starmintReceived | varchar | STARMINT tokens received |
| redemptionType | varchar | starmint_token/game_credits |
| txHash | varchar | Redemption tx hash |
| status | varchar | pending/completed/failed |
| createdAt | timestamp | Creation time |

## Security Considerations

1. **Private Key Security**: Never commit deployer private keys
2. **Rate Limiting**: API endpoints are rate-limited
3. **Slippage Protection**: 30-minute deadline on all swaps
4. **ReentrancyGuard**: Prevents reentrancy attacks
5. **Owner Functions**: Admin functions restricted to contract owner

## Gas Estimates

| Function | Estimated Gas |
|----------|---------------|
| swapETHForUSDC | ~180,000 |
| swapUSDCForETH | ~200,000 |
| setStarmintToken | ~45,000 |
| withdrawFees | ~50,000 |

## Monitoring

### Events to Monitor
- `SwapCompleted(user, fromToken, toToken, amountIn, amountOut, usdNotional, fee, points)`
- `FeeCollected(token, amount)`

### Key Metrics
- Daily swap volume
- Points earned per user
- Fee revenue
- Gas costs

## Troubleshooting

### Common Issues

1. **Transaction Reverts**
   - Check slippage settings
   - Verify sufficient token approval (USDC)
   - Ensure adequate ETH for gas

2. **Price Feed Issues**
   - Chainlink oracle may have stale data
   - Check heartbeat interval

3. **Points Not Recording**
   - Verify Farcaster FID is correct
   - Check API endpoint connectivity

## Support

For issues or questions:
- Check Basescan for transaction details
- Review contract events for debugging
- Ensure proper gas limits
