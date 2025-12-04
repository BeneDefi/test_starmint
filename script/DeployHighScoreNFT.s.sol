// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/HighScoreNFT.sol";

/**
 * @title DeployHighScoreNFT
 * @notice Deployment script for HighScoreNFT on Base Mainnet
 * 
 * Prerequisites:
 * 1. Set PRIVATE_KEY in environment (deployer wallet with ETH for gas)
 * 2. Set TREASURY_ADDRESS in environment (receives $0.10 mint fees)
 * 3. Set MINT_SIGNER_ADDRESS in environment (backend wallet that signs mint requests)
 * 4. Set BASESCAN_API_KEY for contract verification
 * 
 * Deployment command for Base Mainnet:
 * forge script script/DeployHighScoreNFT.s.sol:DeployHighScoreNFT \
 *   --rpc-url https://mainnet.base.org \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $BASESCAN_API_KEY
 * 
 * Deployment command for Base Sepolia (testnet):
 * forge script script/DeployHighScoreNFT.s.sol:DeployHighScoreNFT \
 *   --rpc-url https://sepolia.base.org \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $BASESCAN_API_KEY
 */
contract DeployHighScoreNFT is Script {
    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address mintSigner = vm.envAddress("MINT_SIGNER_ADDRESS");
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("STARMINT HighScoreNFT Deployment");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Mint Signer:", mintSigner);
        console.log("Chain ID:", block.chainid);
        console.log("===========================================");
        
        // Validate addresses
        require(treasury != address(0), "Treasury address is zero");
        require(mintSigner != address(0), "Mint signer address is zero");
        require(deployer != address(0), "Deployer address is zero");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy HighScoreNFT
        HighScoreNFT highScoreNFT = new HighScoreNFT(treasury, mintSigner);
        
        console.log("");
        console.log("===========================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("===========================================");
        console.log("HighScoreNFT Contract:", address(highScoreNFT));
        console.log("");
        console.log("Contract Configuration:");
        console.log("- Name:", highScoreNFT.name());
        console.log("- Symbol:", highScoreNFT.symbol());
        console.log("- Treasury:", highScoreNFT.treasury());
        console.log("- Mint Signer:", highScoreNFT.mintSigner());
        console.log("- ETH/USD Price Feed:", highScoreNFT.ETH_USD_FEED());
        console.log("");
        console.log("Mint Fee: $0.10 USD (paid in ETH)");
        console.log("");
        console.log("Rarity Thresholds:");
        console.log("- Common: < 10,000 points");
        console.log("- Uncommon: >= 10,000 points");
        console.log("- Rare: >= 25,000 points");
        console.log("- Epic: >= 50,000 points");
        console.log("- Legendary: >= 100,000 points");
        console.log("");
        console.log("===========================================");
        console.log("NEXT STEPS:");
        console.log("===========================================");
        console.log("1. Verify contract on BaseScan (if not auto-verified)");
        console.log("2. Update frontend with contract address");
        console.log("3. Configure backend mint signer private key");
        console.log("4. Test minting on testnet before mainnet");
        console.log("===========================================");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpdateTreasuryNFT
 * @notice Script to update treasury address for HighScoreNFT
 */
contract UpdateTreasuryNFT is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address highScoreNFTAddress = vm.envAddress("HIGH_SCORE_NFT_ADDRESS");
        address newTreasury = vm.envAddress("NEW_TREASURY_ADDRESS");
        
        console.log("Updating treasury address...");
        console.log("HighScoreNFT:", highScoreNFTAddress);
        console.log("New Treasury:", newTreasury);
        
        vm.startBroadcast(ownerPrivateKey);
        
        HighScoreNFT highScoreNFT = HighScoreNFT(payable(highScoreNFTAddress));
        highScoreNFT.setTreasury(newTreasury);
        
        console.log("Treasury address updated successfully!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpdateMintSigner
 * @notice Script to update mint signer address for HighScoreNFT
 */
contract UpdateMintSigner is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address highScoreNFTAddress = vm.envAddress("HIGH_SCORE_NFT_ADDRESS");
        address newMintSigner = vm.envAddress("NEW_MINT_SIGNER_ADDRESS");
        
        console.log("Updating mint signer address...");
        console.log("HighScoreNFT:", highScoreNFTAddress);
        console.log("New Mint Signer:", newMintSigner);
        
        vm.startBroadcast(ownerPrivateKey);
        
        HighScoreNFT highScoreNFT = HighScoreNFT(payable(highScoreNFTAddress));
        highScoreNFT.setMintSigner(newMintSigner);
        
        console.log("Mint signer address updated successfully!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title OwnerMintNFT
 * @notice Script for owner to mint NFTs for airdrops/rewards
 */
contract OwnerMintNFT is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address highScoreNFTAddress = vm.envAddress("HIGH_SCORE_NFT_ADDRESS");
        address recipient = vm.envAddress("RECIPIENT_ADDRESS");
        uint256 score = vm.envUint("SCORE");
        uint256 level = vm.envUint("LEVEL");
        uint256 enemiesDefeated = vm.envUint("ENEMIES_DEFEATED");
        uint256 gameTime = vm.envUint("GAME_TIME");
        
        console.log("Owner minting NFT...");
        console.log("HighScoreNFT:", highScoreNFTAddress);
        console.log("Recipient:", recipient);
        console.log("Score:", score);
        console.log("Level:", level);
        
        vm.startBroadcast(ownerPrivateKey);
        
        HighScoreNFT highScoreNFT = HighScoreNFT(payable(highScoreNFTAddress));
        uint256 tokenId = highScoreNFT.ownerMint(
            recipient,
            score,
            level,
            enemiesDefeated,
            gameTime,
            bytes32(0), // No screenshot hash for owner mint
            "https://starmint.game" // Default external URL
        );
        
        console.log("NFT minted successfully!");
        console.log("Token ID:", tokenId);
        
        vm.stopBroadcast();
    }
}

/**
 * @title PauseNFT
 * @notice Script to pause/unpause minting
 */
contract PauseNFT is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address highScoreNFTAddress = vm.envAddress("HIGH_SCORE_NFT_ADDRESS");
        bool shouldPause = vm.envBool("PAUSE");
        
        console.log(shouldPause ? "Pausing NFT minting..." : "Unpausing NFT minting...");
        console.log("HighScoreNFT:", highScoreNFTAddress);
        
        vm.startBroadcast(ownerPrivateKey);
        
        HighScoreNFT highScoreNFT = HighScoreNFT(payable(highScoreNFTAddress));
        
        if (shouldPause) {
            highScoreNFT.pause();
            console.log("Minting paused!");
        } else {
            highScoreNFT.unpause();
            console.log("Minting unpaused!");
        }
        
        vm.stopBroadcast();
    }
}

/**
 * @title WithdrawStuckETH
 * @notice Script to withdraw any stuck ETH from contract
 */
contract WithdrawStuckETH is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address highScoreNFTAddress = vm.envAddress("HIGH_SCORE_NFT_ADDRESS");
        
        console.log("Withdrawing stuck ETH...");
        console.log("HighScoreNFT:", highScoreNFTAddress);
        
        vm.startBroadcast(ownerPrivateKey);
        
        HighScoreNFT highScoreNFT = HighScoreNFT(payable(highScoreNFTAddress));
        highScoreNFT.withdrawStuckETH();
        
        console.log("Stuck ETH withdrawn to treasury!");
        
        vm.stopBroadcast();
    }
}
