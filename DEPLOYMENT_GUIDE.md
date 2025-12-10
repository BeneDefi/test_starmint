# STARMINT NFT Deployment Guide - Base Mainnet

This guide provides step-by-step instructions for deploying the STARMINT High Score NFT smart contract to Base mainnet using Foundry.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Testing](#local-testing)
4. [Deploy to Base Sepolia (Testnet)](#deploy-to-base-sepolia-testnet)
5. [Deploy to Base Mainnet](#deploy-to-base-mainnet)
6. [Contract Verification](#contract-verification)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Install Foundry

Foundry is a blazing fast, portable, and modular toolkit for Ethereum development.

**macOS/Linux:**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**Windows (using WSL):**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:
```bash
forge --version
cast --version
anvil --version
```

### 2. Get Required API Keys

You'll need:
- **BaseScan API Key**: For contract verification
  - Go to [https://basescan.org/](https://basescan.org/)
  - Register/Login
  - Navigate to API Keys section
  - Create a new API key

### 3. Get ETH on Base

You need ETH on Base mainnet for gas fees:
- Bridge ETH from Ethereum mainnet using [Base Bridge](https://bridge.base.org/)
- Buy ETH directly on Base via [Coinbase](https://www.coinbase.com/)
- Typical deployment cost: ~$0.10-0.50 USD

---

## Environment Setup

### 1. Create Environment File

Create a `.env` file in your project root (this file should NEVER be committed to git):

```bash
# Deployer wallet private key (with 0x prefix)
# NEVER share this or commit to git!
DEPLOYER_PRIVATE_KEY=0x...your_private_key_here...

# BaseScan API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key_here

# Your app's public URL (for NFT external_url)
EXTERNAL_BASE_URL=https://your-app-url.com

# Authorized minter address (can be same as deployer, or a backend signing wallet)
# This address will be allowed to mint NFTs on behalf of players
AUTHORIZED_MINTER=0x...minter_address_here...

# Minter private key (for backend signature generation)
# Used to sign mint requests that players submit to the contract
MINTER_PRIVATE_KEY=0x...minter_private_key_here...

# RPC endpoints (optional - defaults provided)
BASE_MAINNET_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

### 2. Secure Your Private Key

**IMPORTANT SECURITY NOTES:**
- Never share your private key
- Never commit `.env` to version control
- Use a dedicated deployment wallet with only the required funds
- Consider using hardware wallets for production deployments

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 3. Install Dependencies

```bash
# Install OpenZeppelin contracts (if not already installed)
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Install forge-std for testing
forge install foundry-rs/forge-std --no-commit
```

---

## Local Testing

### 1. Compile Contracts

```bash
forge build
```

### 2. Run Tests (Optional)

Create a test file `test/StarmintScoreNFT.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/StarmintScoreNFT.sol";

contract StarmintScoreNFTTest is Test {
    StarmintScoreNFT public nft;
    address public owner = address(1);
    address public player = address(2);

    function setUp() public {
        vm.prank(owner);
        nft = new StarmintScoreNFT("https://starmint.app");
    }

    function testMintScore() public {
        vm.prank(owner);
        uint256 tokenId = nft.mintScore(player, 50000, 5, 100, bytes32(0));
        
        assertEq(nft.ownerOf(tokenId), player);
        
        StarmintScoreNFT.ScoreData memory data = nft.getScoreData(tokenId);
        assertEq(data.score, 50000);
        assertEq(data.level, 5);
        assertEq(data.enemiesDefeated, 100);
    }

    function testRarityCalculation() public {
        // Test LEGENDARY (>= 100000)
        vm.prank(owner);
        nft.mintScore(player, 100000, 10, 500, bytes32(0));
        
        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
    }

    function testRevertOnZeroScore() public {
        vm.prank(owner);
        vm.expectRevert(StarmintScoreNFT.InvalidScore.selector);
        nft.mintScore(player, 0, 1, 0, bytes32(0));
    }
}
```

Run tests:
```bash
forge test -vvv
```

### 3. Local Deployment Test

Start local node:
```bash
anvil
```

In another terminal, deploy locally:
```bash
forge script script/DeployStarmintNFT.s.sol --rpc-url http://localhost:8545 --broadcast
```

---

## Deploy to Base Sepolia (Testnet)

**Recommended: Test on Sepolia first before mainnet!**

### 1. Get Sepolia ETH

- Use [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- Or bridge from Sepolia using Base Bridge

### 2. Deploy to Sepolia

```bash
# Load environment variables
source .env

# Deploy to Base Sepolia
forge script script/DeployStarmintNFT.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### 3. Verify Deployment

After deployment, you'll see output like:
```
== Return ==
StarmintScoreNFT: 0x1234...abcd
```

Check on [Sepolia BaseScan](https://sepolia.basescan.org/) to verify the contract.

---

## Deploy to Base Mainnet

### 1. Pre-Deployment Checklist

- [ ] Contract tested thoroughly on testnet
- [ ] Sufficient ETH in deployer wallet (0.01+ ETH recommended)
- [ ] Private key secured and backed up
- [ ] EXTERNAL_BASE_URL set to production URL
- [ ] All environment variables configured

### 2. Estimate Gas Cost

```bash
forge script script/DeployStarmintNFT.s.sol \
  --rpc-url https://mainnet.base.org \
  --estimate
```

### 3. Deploy to Mainnet

```bash
# Load environment variables
source .env

# Deploy to Base Mainnet
forge script script/DeployStarmintNFT.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### 4. Save Deployment Information

After successful deployment, save these details:
- Contract Address
- Transaction Hash
- Deployer Address
- Block Number

Example output:
```
##### base-mainnet
✅  [Success]Hash: 0xabc123...
Contract Address: 0xdef456...
Block: 12345678
Paid: 0.00123456 ETH (123456 gas * 10 gwei)
```

---

## Contract Verification

### Automatic Verification

If you used `--verify` flag during deployment, verification should be automatic.

### Manual Verification

If automatic verification failed:

```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(string)" "https://your-app-url.com") \
  --etherscan-api-key $BASESCAN_API_KEY \
  0xYOUR_CONTRACT_ADDRESS \
  contracts/StarmintScoreNFT.sol:StarmintScoreNFT
```

---

## Post-Deployment Configuration

### 1. Update Frontend Configuration

After deployment, update your app's environment:

```bash
# In your .env file (for Replit secrets)
VITE_SCORE_NFT_CONTRACT_ADDRESS=0xYOUR_NEW_CONTRACT_ADDRESS
```

### 2. Update wagmiConfig.ts

If not using environment variables:

```typescript
export const SCORE_NFT_CONTRACT_ADDRESS = '0xYOUR_NEW_CONTRACT_ADDRESS' as const;
```

### 3. Test Minting

1. Open your app
2. Connect wallet on Base network
3. Play a game and get a score
4. Click "Mint NFT"
5. Confirm transaction in wallet
6. Check the NFT on:
   - [BaseScan](https://basescan.org/)
   - [OpenSea](https://opensea.io/)

---

## Contract Features

### Rarity Tiers

| Score Range | Rarity | Color |
|-------------|--------|-------|
| 100,000+ | LEGENDARY | Gold (#ffd700) |
| 50,000 - 99,999 | EPIC | Purple (#a855f7) |
| 20,000 - 49,999 | RARE | Blue (#3b82f6) |
| 5,000 - 19,999 | UNCOMMON | Green (#22c55e) |
| 0 - 4,999 | COMMON | Gray (#9ca3af) |

### On-Chain SVG

Each NFT generates a unique SVG image on-chain featuring:
- Dynamic starfield based on token ID
- Score overlay with rarity color
- Spaceship graphic
- Game statistics (level, enemies defeated)
- Rarity badge

### Metadata

Full ERC-721 metadata includes:
- `name`: "STARMINT High Score #[tokenId]"
- `description`: Score details with date
- `image`: Base64-encoded SVG
- `attributes`: Score, level, enemies, date, rarity, screenshot hash
- `external_url`: Link to view score in app
- `background_color`: "000000"

---

## Contract Functions

### `mintScore(address to, uint256 score, uint256 level, uint256 enemiesDefeated, bytes32 screenshotHash)`

Mints a new score NFT.

Parameters:
- `to`: Recipient address
- `score`: Player's score (must be > 0)
- `level`: Level reached (must be > 0)
- `enemiesDefeated`: Number of enemies destroyed
- `screenshotHash`: Verification hash (can be bytes32(0))

### `getScoreData(uint256 tokenId)`

Returns the score data for a token.

### `getPlayerTokens(address player)`

Returns all token IDs owned by a player.

### `tokenURI(uint256 tokenId)`

Returns the full on-chain metadata with SVG image.

### `setExternalBaseUrl(string _url)` (Owner only)

Updates the external URL base for NFT links.

---

## Troubleshooting

### "Insufficient funds" Error

- Check deployer wallet has ETH on Base
- Ensure you're using the correct network
- Try increasing gas limit

### Verification Failed

- Wait 1-2 minutes and retry
- Check BaseScan API key is valid
- Ensure constructor arguments match exactly

### Transaction Stuck

- Check current gas prices on Base
- Consider speeding up with higher gas price

### Contract Not Found on OpenSea

- It can take up to 24 hours for OpenSea to index new contracts
- Try manually refreshing metadata on OpenSea

---

## Security Considerations

1. **Private Key Security**: Never expose your private key
2. **Access Control**: Only owner can update external URL
3. **Reentrancy Protection**: Contract uses ReentrancyGuard
4. **Input Validation**: All inputs are validated
5. **No Withdrawal**: Contract holds no funds

---

## Support

For issues with:
- **Contract**: Check BaseScan for transaction status
- **Minting**: Ensure wallet is on Base network with sufficient ETH
- **Display**: Wait for indexers to update (OpenSea, etc.)

---

## License

MIT License - See contract source for details.
