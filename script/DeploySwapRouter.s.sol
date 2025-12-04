// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/SwapRouterExtension.sol";

/**
 * @title DeploySwapRouter
 * @notice Deployment script for SwapRouterExtension on Base Mainnet
 * 
 * Prerequisites:
 * 1. Set PRIVATE_KEY in environment
 * 2. Set TREASURY_ADDRESS in environment (receives swap fees)
 * 3. Set BASESCAN_API_KEY for contract verification
 * 
 * Deployment command:
 * forge script script/DeploySwapRouter.s.sol:DeploySwapRouter \
 *   --rpc-url https://mainnet.base.org \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $BASESCAN_API_KEY
 */
contract DeploySwapRouter is Script {
    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        console.log("===========================================");
        console.log("STARMINT SwapRouterExtension Deployment");
        console.log("===========================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Treasury:", treasury);
        console.log("Chain ID: Base Mainnet (8453)");
        console.log("===========================================");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SwapRouterExtension
        SwapRouterExtension swapRouter = new SwapRouterExtension(treasury);
        
        console.log("");
        console.log("===========================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("===========================================");
        console.log("SwapRouterExtension:", address(swapRouter));
        console.log("");
        console.log("Contract Configuration:");
        console.log("- WETH:", swapRouter.WETH());
        console.log("- USDC:", swapRouter.USDC());
        console.log("- Uniswap Router:", swapRouter.UNISWAP_V3_ROUTER());
        console.log("- ETH/USD Feed:", swapRouter.ETH_USD_FEED());
        console.log("- Treasury:", swapRouter.treasury());
        console.log("- Pool Fee:", swapRouter.POOL_FEE());
        console.log("");
        console.log("Fee Structure:");
        console.log("- Minimum Swap: $0.10");
        console.log("- Flat Fee (< $500): $0.10");
        console.log("- Percentage Fee (>= $500): 0.1%");
        console.log("- Points: 1 point per $10 swapped");
        console.log("");
        console.log("===========================================");
        console.log("NEXT STEPS:");
        console.log("===========================================");
        console.log("1. Verify contract on BaseScan (if not auto-verified)");
        console.log("2. Update frontend with contract address");
        console.log("3. When STARMINT token launches, call:");
        console.log("   setStarmintToken(STARMINT_TOKEN_ADDRESS)");
        console.log("===========================================");
        
        vm.stopBroadcast();
    }
}

/**
 * @title SetStarmintToken
 * @notice Script to set STARMINT token address after token launch
 */
contract SetStarmintToken is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address swapRouterAddress = vm.envAddress("SWAP_ROUTER_ADDRESS");
        address starmintTokenAddress = vm.envAddress("STARMINT_TOKEN_ADDRESS");
        
        console.log("Setting STARMINT token address...");
        console.log("SwapRouter:", swapRouterAddress);
        console.log("STARMINT Token:", starmintTokenAddress);
        
        vm.startBroadcast(ownerPrivateKey);
        
        SwapRouterExtension swapRouter = SwapRouterExtension(payable(swapRouterAddress));
        swapRouter.setStarmintToken(starmintTokenAddress);
        
        console.log("STARMINT token address set successfully!");
        console.log("STARMINT swaps are now enabled.");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpdateTreasury
 * @notice Script to update treasury address
 */
contract UpdateTreasury is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address swapRouterAddress = vm.envAddress("SWAP_ROUTER_ADDRESS");
        address newTreasury = vm.envAddress("NEW_TREASURY_ADDRESS");
        
        console.log("Updating treasury address...");
        console.log("SwapRouter:", swapRouterAddress);
        console.log("New Treasury:", newTreasury);
        
        vm.startBroadcast(ownerPrivateKey);
        
        SwapRouterExtension swapRouter = SwapRouterExtension(payable(swapRouterAddress));
        swapRouter.setTreasury(newTreasury);
        
        console.log("Treasury address updated successfully!");
        
        vm.stopBroadcast();
    }
}
