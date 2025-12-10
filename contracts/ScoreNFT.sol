// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ScoreNFT is ERC721, Ownable {
    using Strings for uint256;
    
    uint256 public tokenIdCounter;
    
    struct ScoreData {
        uint256 score;
        uint256 level;
        uint256 timestamp;
        address player;
    }
    
    mapping(uint256 => ScoreData) public scores;
    
    event ScoreMinted(uint256 indexed tokenId, address indexed player, uint256 score, uint256 level);
    
    constructor() ERC721("STARMINT Score", "SCORE") Ownable(msg.sender) {}
    
    function mintScore(address to, uint256 score, uint256 level) public returns (uint256) {
        uint256 tokenId = tokenIdCounter++;
        _safeMint(to, tokenId);
        
        scores[tokenId] = ScoreData({
            score: score,
            level: level,
            timestamp: block.timestamp,
            player: to
        });
        
        emit ScoreMinted(tokenId, to, score, level);
        return tokenId;
    }
    
    function getScoreData(uint256 tokenId) public view returns (ScoreData memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return scores[tokenId];
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        ScoreData memory data = scores[tokenId];
        
        // Simple JSON metadata
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"STARMINT Score #',
            tokenId.toString(),
            '","description":"Score Achievement: ',
            data.score.toString(),
            ' points at Level ',
            data.level.toString(),
            '","attributes":[{"trait_type":"Score","value":',
            data.score.toString(),
            '},{"trait_type":"Level","value":',
            data.level.toString(),
            '}]}'
        ));
    }
}
