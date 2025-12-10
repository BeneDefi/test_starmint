// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/StarmintScoreNFT.sol";

contract StarmintScoreNFTTest is Test {
    StarmintScoreNFT public nft;
    address public owner = address(1);
    address public minter = address(2);
    address public player = address(3);
    address public player2 = address(4);
    address public unauthorized = address(5);

    uint256 minterPrivateKey = 0xA11CE;
    address minterFromKey;

    function setUp() public {
        minterFromKey = vm.addr(minterPrivateKey);
        
        vm.prank(owner);
        nft = new StarmintScoreNFT("https://starmint.app", minter);
    }

    function testMintScoreAuthorized() public {
        vm.prank(minter);
        uint256 tokenId = nft.mintScoreAuthorized(player, 50000, 5, 100, 120000, 75, bytes32(0));

        assertEq(nft.ownerOf(tokenId), player);
        assertEq(tokenId, 0);

        StarmintScoreNFT.ScoreData memory data = nft.getScoreData(tokenId);
        assertEq(data.score, 50000);
        assertEq(data.level, 5);
        assertEq(data.enemiesDefeated, 100);
        assertEq(data.gameTime, 120000);
        assertEq(data.accuracy, 75);
        assertEq(data.player, player);
    }

    function testOwnerCanMint() public {
        vm.prank(owner);
        uint256 tokenId = nft.mintScoreAuthorized(player, 25000, 3, 50, 60000, 80, bytes32(0));
        assertEq(nft.ownerOf(tokenId), player);
    }

    function testUnauthorizedCannotMint() public {
        vm.prank(unauthorized);
        vm.expectRevert(StarmintScoreNFT.UnauthorizedMinter.selector);
        nft.mintScoreAuthorized(player, 10000, 2, 30, 30000, 60, bytes32(0));
    }

    function testMintWithSignature() public {
        vm.prank(owner);
        nft.setAuthorizedMinter(minterFromKey);

        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            uint256(50000),
            uint256(5),
            uint256(100),
            uint256(120000),
            uint256(75),
            bytes32(0),
            deadline,
            address(nft),
            block.chainid
        ));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(minterPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player);
        uint256 tokenId = nft.mintScoreWithSignature(
            player,
            50000,
            5,
            100,
            120000,
            75,
            bytes32(0),
            deadline,
            signature
        );

        assertEq(nft.ownerOf(tokenId), player);
    }

    function testSignatureCannotBeReused() public {
        vm.prank(owner);
        nft.setAuthorizedMinter(minterFromKey);

        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            uint256(50000),
            uint256(5),
            uint256(100),
            uint256(120000),
            uint256(75),
            bytes32(0),
            deadline,
            address(nft),
            block.chainid
        ));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(minterPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player);
        nft.mintScoreWithSignature(player, 50000, 5, 100, 120000, 75, bytes32(0), deadline, signature);

        vm.prank(player);
        vm.expectRevert(StarmintScoreNFT.SignatureAlreadyUsed.selector);
        nft.mintScoreWithSignature(player, 50000, 5, 100, 120000, 75, bytes32(0), deadline, signature);
    }

    function testExpiredSignature() public {
        vm.prank(owner);
        nft.setAuthorizedMinter(minterFromKey);

        uint256 deadline = block.timestamp - 1;
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            uint256(50000),
            uint256(5),
            uint256(100),
            uint256(120000),
            uint256(75),
            bytes32(0),
            deadline,
            address(nft),
            block.chainid
        ));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(minterPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player);
        vm.expectRevert(StarmintScoreNFT.SignatureExpired.selector);
        nft.mintScoreWithSignature(player, 50000, 5, 100, 120000, 75, bytes32(0), deadline, signature);
    }

    function testMultipleMints() public {
        vm.startPrank(minter);
        
        uint256 tokenId1 = nft.mintScoreAuthorized(player, 10000, 3, 50, 30000, 60, bytes32(0));
        uint256 tokenId2 = nft.mintScoreAuthorized(player, 25000, 5, 100, 60000, 70, bytes32(0));
        uint256 tokenId3 = nft.mintScoreAuthorized(player2, 50000, 7, 150, 90000, 80, bytes32(0));
        
        vm.stopPrank();

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);
        
        assertEq(nft.totalSupply(), 3);

        uint256[] memory player1Tokens = nft.getPlayerTokens(player);
        assertEq(player1Tokens.length, 2);
        assertEq(player1Tokens[0], 0);
        assertEq(player1Tokens[1], 1);

        uint256[] memory player2Tokens = nft.getPlayerTokens(player2);
        assertEq(player2Tokens.length, 1);
        assertEq(player2Tokens[0], 2);
    }

    function testTokenURIContainsMetadata() public {
        vm.prank(minter);
        nft.mintScoreAuthorized(player, 75000, 8, 200, 180000, 85, bytes32(0));

        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
        assertTrue(_contains(uri, "data:application/json;base64,"));
    }

    function testRarityTiers() public {
        vm.startPrank(minter);
        
        nft.mintScoreAuthorized(player, 1000, 1, 10, 10000, 50, bytes32(0));
        nft.mintScoreAuthorized(player, 5000, 2, 30, 20000, 55, bytes32(0));
        nft.mintScoreAuthorized(player, 20000, 4, 80, 40000, 60, bytes32(0));
        nft.mintScoreAuthorized(player, 50000, 6, 150, 80000, 70, bytes32(0));
        nft.mintScoreAuthorized(player, 100000, 10, 300, 150000, 80, bytes32(0));
        
        vm.stopPrank();
        
        assertEq(nft.totalSupply(), 5);
    }

    function testRevertOnZeroScore() public {
        vm.prank(minter);
        vm.expectRevert(StarmintScoreNFT.InvalidScore.selector);
        nft.mintScoreAuthorized(player, 0, 1, 0, 0, 0, bytes32(0));
    }

    function testRevertOnZeroLevel() public {
        vm.prank(minter);
        vm.expectRevert(StarmintScoreNFT.InvalidLevel.selector);
        nft.mintScoreAuthorized(player, 1000, 0, 10, 10000, 50, bytes32(0));
    }

    function testRevertOnZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert(StarmintScoreNFT.ZeroAddress.selector);
        nft.mintScoreAuthorized(address(0), 1000, 1, 10, 10000, 50, bytes32(0));
    }

    function testRevertOnNonexistentToken() public {
        vm.expectRevert(StarmintScoreNFT.TokenDoesNotExist.selector);
        nft.getScoreData(999);
    }

    function testSetExternalBaseUrl() public {
        vm.prank(owner);
        nft.setExternalBaseUrl("https://new-url.com");
        assertEq(nft.externalBaseUrl(), "https://new-url.com");
    }

    function testOnlyOwnerCanSetUrl() public {
        vm.prank(player);
        vm.expectRevert();
        nft.setExternalBaseUrl("https://hacker.com");
    }

    function testSetAuthorizedMinter() public {
        address newMinter = address(100);
        vm.prank(owner);
        nft.setAuthorizedMinter(newMinter);
        assertEq(nft.authorizedMinter(), newMinter);
    }

    function testOnlyOwnerCanSetMinter() public {
        vm.prank(minter);
        vm.expectRevert();
        nft.setAuthorizedMinter(address(100));
    }

    function testSessionHash() public {
        bytes32 hash = keccak256(abi.encodePacked("game_session_123"));
        
        vm.prank(minter);
        nft.mintScoreAuthorized(player, 50000, 5, 100, 120000, 75, hash);

        StarmintScoreNFT.ScoreData memory data = nft.getScoreData(0);
        assertEq(data.sessionHash, hash);
    }

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        
        if (n.length > h.length) return false;
        
        for (uint i = 0; i <= h.length - n.length; i++) {
            bool found = true;
            for (uint j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
}
