// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/StarmintScoreNFT.sol";

contract DeployStarmintNFT is Script {
    function run() external returns (StarmintScoreNFT) {
        string memory externalBaseUrl = vm.envOr("EXTERNAL_BASE_URL", string("https://starmint.replit.app"));
        address authorizedMinter = vm.envOr("AUTHORIZED_MINTER", msg.sender);

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        StarmintScoreNFT nft = new StarmintScoreNFT(externalBaseUrl, authorizedMinter);

        vm.stopBroadcast();

        console.log("StarmintScoreNFT deployed to:", address(nft));
        console.log("External URL:", externalBaseUrl);
        console.log("Owner:", nft.owner());
        console.log("Authorized Minter:", nft.authorizedMinter());

        return nft;
    }
}
