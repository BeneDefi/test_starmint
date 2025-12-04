// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ScoreNFT.sol";

contract DeployScoreNFT is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the ScoreNFT contract
        ScoreNFT scoreNFT = new ScoreNFT();
        
        console.log("ScoreNFT deployed to:", address(scoreNFT));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        vm.stopBroadcast();
    }
}
