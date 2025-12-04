# STARMINT High Score NFT Deployment Guide

This is a complete, beginner-friendly guide to deploying the HighScoreNFT smart contract on Base mainnet using Foundry.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Install Foundry](#install-foundry)
3. [Environment Setup](#environment-setup)
4. [Contract Overview](#contract-overview)
5. [Deployment Steps](#deployment-steps)
6. [Contract Verification](#contract-verification)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Testing the Deployment](#testing-the-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, you'll need:

1. **A computer with a terminal** (Mac/Linux/Windows with WSL)
2. **ETH on Base mainnet** - You'll need approximately 0.01 ETH for deployment gas fees
3. **A wallet private key** - The deployer wallet's private key
4. **Treasury wallet address** - Where the $0.10 mint fees will be sent
5. **Mint signer wallet** - A separate wallet that will sign mint requests (backend wallet)
6. **BaseScan API key** (optional but recommended) - For contract verification

---

## Install Foundry

Foundry is a fast, portable, and modular toolkit for Ethereum development.

### Step 1: Install Foundry

Open your terminal and run:

```bash
curl -L https://foundry.paradigm.xyz | bash
```

### Step 2: Run the Foundry installer

```bash
foundryup
```

### Step 3: Verify installation

```bash
forge --version
```

You should see something like: `forge 0.2.0 (xxxxx)`

---

## Environment Setup

### Step 1: Create a `.env` file

In your project root directory, create a file called `.env`:

```bash
touch .env
```

### Step 2: Add your environment variables

Open `.env` in a text editor and add:

```env
# Your deployer wallet private key (the wallet that will deploy the contract)
# NEVER share this! Remove the 0x prefix if present
PRIVATE_KEY=your_private_key_here_without_0x

# Treasury wallet address (receives $0.10 mint fees)
TREASURY_ADDRESS=0xYourTreasuryWalletAddress

# Mint signer address (backend wallet that signs mint requests)
MINT_SIGNER_ADDRESS=0xYourMintSignerWalletAddress

# BaseScan API key for contract verification (get from https://basescan.org/apis)
BASESCAN_API_KEY=your_basescan_api_key_here
```

### Step 3: Load environment variables

```bash
source .env
```

### Important Security Notes:
- **NEVER commit your `.env` file to git**
- **NEVER share your private key with anyone**
- Make sure `.env` is in your `.gitignore` file

---

## Contract Overview

### HighScoreNFT Features

- **ERC721 NFT** on Base mainnet
- **$0.10 USD mint fee** (paid in ETH, sent to treasury)
- **Dynamic on-chain SVG** - Unique visual for each score
- **Rich metadata** - Score, level, enemies defeated, game time, rarity
- **Rarity tiers** based on score:
  - Common: < 10,000 points
  - Uncommon: 10,000+ points
  - Rare: 25,000+ points
  - Epic: 50,000+ points
  - Legendary: 100,000+ points

### Fee Structure
- All mints cost $0.10 USD equivalent in ETH
- Fee is sent directly to the treasury wallet
- Uses Chainlink price feed for accurate ETH/USD conversion

---

## Deployment Steps

### Step 1: Install dependencies

First, install the required Solidity libraries:

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

### Step 2: Build the contracts

```bash
forge build
```

If successful, you'll see: `Compiler run successful!`

### Step 3: Run a dry-run (simulation)

Test the deployment without actually deploying:

```bash
forge script script/DeployHighScoreNFT.s.sol:DeployHighScoreNFT \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

This simulates the deployment and shows you what will happen.

### Step 4: Deploy to Base mainnet

When ready, deploy for real:

```bash
forge script script/DeployHighScoreNFT.s.sol:DeployHighScoreNFT \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Step 5: Save the contract address

After successful deployment, you'll see output like:

```
===========================================
DEPLOYMENT SUCCESSFUL!
===========================================
HighScoreNFT Contract: 0x1234567890abcdef...
```

**Save this address!** You'll need it for the frontend configuration.

---

## Contract Verification

If automatic verification didn't work, manually verify:

```bash
forge verify-contract \
  --chain-id 8453 \
  --compiler-version v0.8.20 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,address)" $TREASURY_ADDRESS $MINT_SIGNER_ADDRESS) \
  YOUR_CONTRACT_ADDRESS \
  contracts/HighScoreNFT.sol:HighScoreNFT \
  --etherscan-api-key $BASESCAN_API_KEY
```

Replace `YOUR_CONTRACT_ADDRESS` with the deployed contract address.

---

## Post-Deployment Configuration

### Step 1: Update your application environment

Add these environment variables to your application:

```env
# High Score NFT Contract Address
HIGH_SCORE_NFT_ADDRESS=0xYourDeployedContractAddress

# Mint signer private key (for backend signing)
NFT_MINT_SIGNER_KEY=your_mint_signer_private_key
```

### Step 2: Verify configuration

Check that everything is configured correctly:

```bash
# Check contract owner
cast call YOUR_CONTRACT_ADDRESS "owner()(address)" --rpc-url https://mainnet.base.org

# Check treasury address
cast call YOUR_CONTRACT_ADDRESS "treasury()(address)" --rpc-url https://mainnet.base.org

# Check mint signer
cast call YOUR_CONTRACT_ADDRESS "mintSigner()(address)" --rpc-url https://mainnet.base.org
```

---

## Testing the Deployment

### Check current mint fee

```bash
cast call YOUR_CONTRACT_ADDRESS "getMintFeeInETH()(uint256)" --rpc-url https://mainnet.base.org
```

### View contract on BaseScan

Go to: `https://basescan.org/address/YOUR_CONTRACT_ADDRESS`

### Test mint (from your frontend)

1. Connect your wallet on Base network
2. Navigate to the NFT minting page
3. Click "Mint High Score NFT"
4. Confirm the transaction ($0.10 + gas)
5. Wait for confirmation
6. View your NFT on OpenSea!

---

## Admin Commands

### Update Treasury Address

If you need to change where fees go:

```bash
export SWAP_ROUTER_ADDRESS=YOUR_CONTRACT_ADDRESS
export NEW_TREASURY_ADDRESS=0xNewTreasuryAddress

forge script script/DeployHighScoreNFT.s.sol:UpdateTreasuryNFT \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

### Update Mint Signer

If you need to change the backend signer:

```bash
export HIGH_SCORE_NFT_ADDRESS=YOUR_CONTRACT_ADDRESS
export NEW_MINT_SIGNER_ADDRESS=0xNewSignerAddress

forge script script/DeployHighScoreNFT.s.sol:UpdateMintSigner \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

### Pause/Unpause Minting

In case of emergency:

```bash
export HIGH_SCORE_NFT_ADDRESS=YOUR_CONTRACT_ADDRESS
export PAUSE=true  # or false to unpause

forge script script/DeployHighScoreNFT.s.sol:PauseNFT \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

### Owner Mint (Airdrops)

Mint NFTs for free (as contract owner):

```bash
export HIGH_SCORE_NFT_ADDRESS=YOUR_CONTRACT_ADDRESS
export RECIPIENT_ADDRESS=0xRecipientWallet
export SCORE=50000
export LEVEL=25
export ENEMIES_DEFEATED=1000
export GAME_TIME=3600000  # 1 hour in milliseconds

forge script script/DeployHighScoreNFT.s.sol:OwnerMintNFT \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

---

## Troubleshooting

### "Insufficient funds" error

- Make sure your deployer wallet has at least 0.01 ETH on Base
- Get Base ETH from [Bridge](https://bridge.base.org) or an exchange

### "Gas estimation failed" error

- The contract may have a bug - check the error message
- Try increasing gas limit: `--gas-limit 5000000`

### "Contract verification failed"

- Make sure your BASESCAN_API_KEY is correct
- Wait a few minutes and try again
- Use manual verification command above

### "Invalid signature" when minting

- Check that `NFT_MINT_SIGNER_KEY` matches `MINT_SIGNER_ADDRESS`
- Ensure the backend is signing correctly
- Verify chain ID is correct (8453 for Base)

### "Stale price feed" error

- The Chainlink oracle may be temporarily unavailable
- Wait a few minutes and try again

---

## Contract Addresses Reference

### Base Mainnet

| Contract | Address |
|----------|---------|
| HighScoreNFT | `YOUR_DEPLOYED_ADDRESS` |
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Chainlink ETH/USD | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |

### Base Sepolia (Testnet)

Use `https://sepolia.base.org` as RPC URL for testing.

---

## Security Best Practices

1. **Never share private keys** - Use hardware wallets for production
2. **Use a separate signer wallet** - Don't use the owner wallet for signing
3. **Test on testnet first** - Always deploy to Base Sepolia before mainnet
4. **Monitor treasury** - Set up alerts for incoming fees
5. **Keep backups** - Store deployment addresses and configuration securely
6. **Regular audits** - Have the contract audited before heavy usage

---

## Support

If you encounter issues:

1. Check [Base Documentation](https://docs.base.org)
2. Review [Foundry Book](https://book.getfoundry.sh)
3. Join [Base Discord](https://discord.gg/buildonbase)
4. Search [BaseScan](https://basescan.org) for transaction details

---

## Summary Checklist

- [ ] Installed Foundry
- [ ] Created `.env` file with all required variables
- [ ] Built contracts successfully (`forge build`)
- [ ] Ran dry-run simulation
- [ ] Deployed to Base mainnet
- [ ] Verified contract on BaseScan
- [ ] Updated application environment variables
- [ ] Tested minting from frontend
- [ ] Secured all private keys

Congratulations! Your HighScoreNFT contract is now live on Base! 🎉
