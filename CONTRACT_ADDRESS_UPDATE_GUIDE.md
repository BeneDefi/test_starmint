# Contract Address Update Guide

After deploying your smart contracts to Base mainnet, you'll need to update several locations in the codebase with the deployed contract addresses.

---

## 1. HighScoreNFT Contract Address

### Where to Update

After deploying the HighScoreNFT contract, you need to set the `HIGH_SCORE_NFT_ADDRESS` environment variable.

#### Option A: Replit Secrets Panel (Recommended)
1. Go to the **Secrets** tab in your Replit project
2. Add a new secret:
   - **Key:** `HIGH_SCORE_NFT_ADDRESS`
   - **Value:** `0xYourDeployedContractAddress`

#### Option B: Environment Variables
If running locally, add to your `.env` file:
```env
HIGH_SCORE_NFT_ADDRESS=0xYourDeployedContractAddress
```

### Code Files That Use This Address

| File | Line | Purpose |
|------|------|---------|
| `server/routes.ts` | ~1022 | Returns contract address to frontend via `/api/nft/config` |
| `server/routes.ts` | ~1033 | Enables/disables NFT minting feature |
| `server/routes.ts` | ~1060 | Validates before processing mint requests |
| `server/routes.ts` | ~1209-1210 | Generates BaseScan/OpenSea view URLs |

### How It Works

The backend (`server/routes.ts`) reads `process.env.HIGH_SCORE_NFT_ADDRESS` and:
- Returns it to the frontend via the `/api/nft/config` endpoint
- Enables the NFT minting feature when the address is set
- The frontend hook (`useHighScoreMint.ts`) fetches this config and uses the address for contract calls

**You don't need to change any code** - just set the environment variable!

---

## 2. Treasury/Fee Recipient Addresses

### NFT Mint Fees ($0.10 per mint)

The treasury address is set during contract deployment and receives all NFT mint fees.

#### Set During Deployment

In your `.env` file before deployment:
```env
TREASURY_ADDRESS=0xYourTreasuryWalletAddress
```

This is used by:
- `script/DeployHighScoreNFT.s.sol` - Passes to contract constructor
- `contracts/HighScoreNFT.sol` - Stores in `treasury` state variable

#### Changing Treasury After Deployment

If you need to change where fees go after deployment:

```bash
# Set the new treasury address
export HIGH_SCORE_NFT_ADDRESS=0xYourNFTContractAddress
export NEW_TREASURY_ADDRESS=0xNewTreasuryAddress

# Run the update script
forge script script/DeployHighScoreNFT.s.sol:UpdateTreasuryNFT \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

Or call the contract directly:
```bash
cast send $HIGH_SCORE_NFT_ADDRESS \
  "setTreasury(address)" $NEW_TREASURY_ADDRESS \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

---

### Swap Fees (SwapRouterExtension)

The SwapRouterExtension contract also uses a treasury address for swap fees.

#### Set During Deployment

In your `.env` file before deployment:
```env
TREASURY_ADDRESS=0xYourTreasuryWalletAddress
```

This is used by:
- `script/DeploySwapRouter.s.sol` - Passes to contract constructor
- `contracts/SwapRouterExtension.sol` - Stores in `treasury` state variable

#### Changing Treasury After Deployment

```bash
# Set the new treasury address
export SWAP_ROUTER_ADDRESS=0xYourSwapRouterAddress
export NEW_TREASURY_ADDRESS=0xNewTreasuryAddress

# Run the update script
forge script script/DeploySwapRouter.s.sol:UpdateTreasury \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

---

## 3. Contract Code Locations (For Reference)

### HighScoreNFT Treasury

| File | Location | Description |
|------|----------|-------------|
| `contracts/HighScoreNFT.sol` | Line 46 | `address public treasury;` state variable |
| `contracts/HighScoreNFT.sol` | Line 99-105 | Constructor sets treasury |
| `contracts/HighScoreNFT.sol` | Line 178-182 | Sends mint fee to treasury |
| `contracts/HighScoreNFT.sol` | Line 481-484 | `setTreasury()` owner function |
| `contracts/HighScoreNFT.sol` | Line 504-506 | `withdrawStuckETH()` sends to treasury |

### SwapRouterExtension Treasury

| File | Location | Description |
|------|----------|-------------|
| `contracts/SwapRouterExtension.sol` | Line 57 | `address public treasury;` state variable |
| `contracts/SwapRouterExtension.sol` | Line 102-104 | Constructor sets treasury |
| `contracts/SwapRouterExtension.sol` | Line 160-163 | Sends ETH swap fee to treasury |
| `contracts/SwapRouterExtension.sol` | Line 230-233 | Sends USDC swap fee to treasury |
| `contracts/SwapRouterExtension.sol` | Line 656-659 | `setTreasury()` owner function |

---

## 4. Legacy ScoreNFT (Not Used)

The old simple ScoreNFT contract address is hardcoded but **not actively used**:

| File | Line | Address |
|------|------|---------|
| `client/src/lib/web3/wagmiConfig.ts` | 15 | `0xE6729F7BCefc2d45da01C0b9FB10Ac2f644FBF1e` |
| `client/src/lib/rewards/nftMinting.ts` | 32 | Placeholder address |

These are legacy and can be ignored - the new HighScoreNFT system uses the environment variable approach.

---

## 5. Mint Signer Address

The backend needs a private key to sign mint requests for anti-cheat verification.

### Set in Replit Secrets

| Secret Key | Value | Purpose |
|------------|-------|---------|
| `NFT_MINT_SIGNER_KEY` | Private key (no 0x) | Signs mint requests |

**Important:** The public address derived from this key must match the `MINT_SIGNER_ADDRESS` you used during deployment!

---

## Quick Setup Checklist

After deploying both contracts, set these in your Replit Secrets:

```
HIGH_SCORE_NFT_ADDRESS=0x...  (your deployed NFT contract)
NFT_MINT_SIGNER_KEY=...       (private key matching MINT_SIGNER_ADDRESS)
SWAP_ROUTER_ADDRESS=0x...     (your deployed swap router, if using)
```

The treasury address is baked into the contracts during deployment - no need to set it separately in the app.

---

## Verification Commands

After setting everything up, verify your configuration:

```bash
# Check NFT contract treasury
cast call $HIGH_SCORE_NFT_ADDRESS "treasury()(address)" --rpc-url https://mainnet.base.org

# Check NFT contract mint signer
cast call $HIGH_SCORE_NFT_ADDRESS "mintSigner()(address)" --rpc-url https://mainnet.base.org

# Check swap router treasury
cast call $SWAP_ROUTER_ADDRESS "treasury()(address)" --rpc-url https://mainnet.base.org

# Check current mint fee (in wei)
cast call $HIGH_SCORE_NFT_ADDRESS "getMintFeeInETH()(uint256)" --rpc-url https://mainnet.base.org
```
