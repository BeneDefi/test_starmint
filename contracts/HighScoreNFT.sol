// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title HighScoreNFT
 * @notice STARMINT High Score Achievement NFT on Base Mainnet
 * @dev ERC721 NFT with dynamic on-chain SVG, rich metadata, and rarity tiers
 * 
 * Features:
 * - $0.10 mint fee sent to treasury wallet
 * - Dynamic on-chain SVG generation based on score
 * - Rarity tiers (Common, Rare, Epic, Legendary, Mythic)
 * - Rich metadata including score, level, enemies defeated, date
 * - Screenshot hash for verification
 * - Anti-fraud: Backend signature verification required for minting
 */
contract HighScoreNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ========== CONSTANTS ==========
    
    uint256 public constant MINT_FEE_USD = 10e16; // $0.10 in 18 decimals
    uint256 public constant PRICE_FEED_STALENESS = 1 hours;
    
    // Chainlink ETH/USD Price Feed on Base Mainnet
    address public constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    
    // Rarity thresholds (score-based)
    // Updated to match frontend: Legendary 25k+, Epic 10k+, Rare 5k+, Uncommon 1k+
    uint256 public constant LEGENDARY_THRESHOLD = 25000;
    uint256 public constant EPIC_THRESHOLD = 10000;
    uint256 public constant RARE_THRESHOLD = 5000;
    uint256 public constant UNCOMMON_THRESHOLD = 1000;

    // ========== STATE VARIABLES ==========
    
    uint256 public tokenIdCounter;
    address public treasury;
    address public mintSigner; // Backend signer for score verification
    
    // Metadata storage
    struct ScoreMetadata {
        uint256 score;
        uint256 level;
        uint256 enemiesDefeated;
        uint256 gameTime; // in milliseconds
        uint256 mintedAt;
        address player;
        bytes32 screenshotHash;
        string externalUrl;
    }
    
    mapping(uint256 => ScoreMetadata) public scoreData;
    mapping(bytes32 => bool) public usedSignatures; // Prevent replay attacks
    mapping(address => uint256[]) public playerTokens; // Track player's NFTs
    
    // Stats
    uint256 public totalMintFeesCollected;
    uint256 public totalScoresMinted;

    // ========== EVENTS ==========
    
    event HighScoreMinted(
        uint256 indexed tokenId,
        address indexed player,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        string rarity,
        uint256 mintFee
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MintSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ========== ERRORS ==========
    
    error InsufficientMintFee(uint256 provided, uint256 required);
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error ZeroAddress();
    error StalePriceFeed();
    error TransferFailed();
    error InvalidScore();
    error TokenDoesNotExist();

    // ========== CONSTRUCTOR ==========
    
    constructor(
        address _treasury,
        address _mintSigner
    ) ERC721("STARMINT High Score", "STARSCORE") Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_mintSigner == address(0)) revert ZeroAddress();
        
        treasury = _treasury;
        mintSigner = _mintSigner;
    }

    // ========== EXTERNAL FUNCTIONS ==========

    /**
     * @notice Mint a high score NFT with backend verification
     * @param score Player's high score
     * @param level Level reached
     * @param enemiesDefeated Number of enemies destroyed
     * @param gameTime Game duration in milliseconds
     * @param screenshotHash IPFS hash of game screenshot for verification
     * @param externalUrl URL to view score details
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Backend signature verifying the score
     */
    function mintHighScore(
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        uint256 gameTime,
        bytes32 screenshotHash,
        string calldata externalUrl,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        // Validate score
        if (score == 0) revert InvalidScore();
        
        // Calculate and validate mint fee
        uint256 mintFeeInETH = getMintFeeInETH();
        if (msg.value < mintFeeInETH) {
            revert InsufficientMintFee(msg.value, mintFeeInETH);
        }
        
        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            score,
            level,
            enemiesDefeated,
            gameTime,
            screenshotHash,
            nonce,
            block.chainid
        ));
        bytes32 ethSignedHash = getEthSignedMessageHash(messageHash);
        
        if (usedSignatures[ethSignedHash]) revert SignatureAlreadyUsed();
        if (!verifySignature(ethSignedHash, signature)) revert InvalidSignature();
        
        usedSignatures[ethSignedHash] = true;
        
        // Mint NFT
        uint256 tokenId = tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        // Store metadata
        scoreData[tokenId] = ScoreMetadata({
            score: score,
            level: level,
            enemiesDefeated: enemiesDefeated,
            gameTime: gameTime,
            mintedAt: block.timestamp,
            player: msg.sender,
            screenshotHash: screenshotHash,
            externalUrl: externalUrl
        });
        
        playerTokens[msg.sender].push(tokenId);
        totalScoresMinted++;
        
        // Transfer fee to treasury
        uint256 actualFee = msg.value;
        totalMintFeesCollected += actualFee;
        
        (bool success,) = treasury.call{value: actualFee}("");
        if (!success) revert TransferFailed();
        
        // Emit event with rarity
        emit HighScoreMinted(
            tokenId,
            msg.sender,
            score,
            level,
            enemiesDefeated,
            getRarity(score),
            actualFee
        );
        
        return tokenId;
    }

    /**
     * @notice Owner can mint for free (for airdrops/rewards)
     */
    function ownerMint(
        address to,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        uint256 gameTime,
        bytes32 screenshotHash,
        string calldata externalUrl
    ) external onlyOwner returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (score == 0) revert InvalidScore();
        
        uint256 tokenId = tokenIdCounter++;
        _safeMint(to, tokenId);
        
        scoreData[tokenId] = ScoreMetadata({
            score: score,
            level: level,
            enemiesDefeated: enemiesDefeated,
            gameTime: gameTime,
            mintedAt: block.timestamp,
            player: to,
            screenshotHash: screenshotHash,
            externalUrl: externalUrl
        });
        
        playerTokens[to].push(tokenId);
        totalScoresMinted++;
        
        emit HighScoreMinted(tokenId, to, score, level, enemiesDefeated, getRarity(score), 0);
        
        return tokenId;
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get mint fee in ETH based on current ETH price
     * @return Mint fee in wei
     */
    function getMintFeeInETH() public view returns (uint256) {
        uint256 ethPrice = getETHPrice();
        return (MINT_FEE_USD * 1e18) / ethPrice;
    }

    /**
     * @notice Get ETH price from Chainlink
     * @return ETH price in USD with 18 decimals
     */
    function getETHPrice() public view returns (uint256) {
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,
        ) = AggregatorV3Interface(ETH_USD_FEED).latestRoundData();
        
        if (block.timestamp - updatedAt > PRICE_FEED_STALENESS) {
            revert StalePriceFeed();
        }
        
        // Chainlink returns price with 8 decimals, scale to 18
        return uint256(price) * 1e10;
    }

    /**
     * @notice Get rarity tier based on score
     */
    function getRarity(uint256 score) public pure returns (string memory) {
        if (score >= LEGENDARY_THRESHOLD) return "Legendary";
        if (score >= EPIC_THRESHOLD) return "Epic";
        if (score >= RARE_THRESHOLD) return "Rare";
        if (score >= UNCOMMON_THRESHOLD) return "Uncommon";
        return "Common";
    }

    /**
     * @notice Get rarity color for SVG
     */
    function getRarityColor(uint256 score) public pure returns (string memory) {
        if (score >= LEGENDARY_THRESHOLD) return "#FFD700"; // Gold
        if (score >= EPIC_THRESHOLD) return "#A855F7"; // Purple
        if (score >= RARE_THRESHOLD) return "#3B82F6"; // Blue
        if (score >= UNCOMMON_THRESHOLD) return "#22C55E"; // Green
        return "#9CA3AF"; // Gray
    }

    /**
     * @notice Get all tokens owned by a player
     */
    function getPlayerTokens(address player) external view returns (uint256[] memory) {
        return playerTokens[player];
    }

    /**
     * @notice Get score data for a token
     */
    function getScoreData(uint256 tokenId) external view returns (ScoreMetadata memory) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        return scoreData[tokenId];
    }

    /**
     * @notice Generate token URI with on-chain SVG and metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        
        ScoreMetadata memory data = scoreData[tokenId];
        string memory rarity = getRarity(data.score);
        string memory rarityColor = getRarityColor(data.score);
        
        // Generate SVG
        string memory svg = generateSVG(tokenId, data, rarity, rarityColor);
        
        // Build attributes array
        string memory attributes = string(abi.encodePacked(
            '[',
            '{"trait_type":"Score","value":', data.score.toString(), ',"display_type":"number"},',
            '{"trait_type":"Level Reached","value":', data.level.toString(), '},',
            '{"trait_type":"Enemies Defeated","value":', data.enemiesDefeated.toString(), ',"display_type":"number"},',
            '{"trait_type":"Game Time (seconds)","value":', (data.gameTime / 1000).toString(), ',"display_type":"number"},',
            '{"trait_type":"Rarity","value":"', rarity, '"},',
            '{"trait_type":"Date Achieved","value":', data.mintedAt.toString(), ',"display_type":"date"},',
            '{"trait_type":"Screenshot Hash","value":"', bytes32ToString(data.screenshotHash), '"}'
            ']'
        ));
        
        // Build metadata JSON
        string memory json = string(abi.encodePacked(
            '{"name":"STARMINT High Score #', tokenId.toString(),
            '","description":"Proof of your epic run in STARMINT Space Shooter. Score: ', data.score.toString(),
            ' points. Level ', data.level.toString(), ' reached. Part of the Base ecosystem.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"external_url":"', data.externalUrl, '",',
            '"background_color":"0a0a1a",',
            '"attributes":', attributes,
            '}'
        ));
        
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @notice Generate dynamic SVG based on score and rarity
     */
    function generateSVG(
        uint256 tokenId,
        ScoreMetadata memory data,
        string memory rarity,
        string memory rarityColor
    ) internal pure returns (string memory) {
        // Generate starfield background based on token ID for variety
        string memory stars = generateStars(tokenId);
        
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:#0a0a1a">',
            '<defs>',
            '<linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', rarityColor, ';stop-opacity:0.8"/>',
            '<stop offset="100%" style="stop-color:#0a0a1a;stop-opacity:0"/>',
            '</linearGradient>',
            '<filter id="blur"><feGaussianBlur stdDeviation="3"/></filter>',
            '</defs>',
            stars,
            '<circle cx="200" cy="150" r="100" fill="url(#glow)" filter="url(#blur)"/>',
            '<rect x="20" y="20" width="360" height="460" rx="20" fill="none" stroke="', rarityColor, '" stroke-width="2" opacity="0.5"/>',
            '<text x="200" y="60" font-family="monospace" font-size="24" fill="', rarityColor, '" text-anchor="middle" font-weight="bold">STARMINT</text>',
            '<text x="200" y="90" font-family="monospace" font-size="14" fill="#6366f1" text-anchor="middle">HIGH SCORE ACHIEVEMENT</text>',
            generateScoreDisplay(data.score, rarityColor),
            generateStatsDisplay(data, rarity, rarityColor),
            '<text x="200" y="470" font-family="monospace" font-size="10" fill="#4b5563" text-anchor="middle">#', tokenId.toString(), ' | Base Network</text>',
            '</svg>'
        ));
    }

    function generateStars(uint256 seed) internal pure returns (string memory) {
        string memory stars = "";
        for (uint256 i = 0; i < 30; i++) {
            uint256 x = (uint256(keccak256(abi.encodePacked(seed, i, "x"))) % 380) + 10;
            uint256 y = (uint256(keccak256(abi.encodePacked(seed, i, "y"))) % 480) + 10;
            uint256 size = (uint256(keccak256(abi.encodePacked(seed, i, "s"))) % 3) + 1;
            uint256 opacity = (uint256(keccak256(abi.encodePacked(seed, i, "o"))) % 60) + 40;
            
            stars = string(abi.encodePacked(
                stars,
                '<circle cx="', x.toString(), '" cy="', y.toString(), '" r="', size.toString(), '" fill="white" opacity="0.', opacity.toString(), '"/>'
            ));
        }
        return stars;
    }

    function generateScoreDisplay(uint256 score, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="50" y="130" width="300" height="80" rx="10" fill="#1a1a2e" stroke="', color, '" stroke-width="1"/>',
            '<text x="200" y="155" font-family="monospace" font-size="12" fill="#9ca3af" text-anchor="middle">SCORE</text>',
            '<text x="200" y="190" font-family="monospace" font-size="36" fill="', color, '" text-anchor="middle" font-weight="bold">', formatNumber(score), '</text>'
        ));
    }

    function generateStatsDisplay(ScoreMetadata memory data, string memory rarity, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="50" y="230" width="140" height="60" rx="8" fill="#1a1a2e"/>',
            '<text x="120" y="255" font-family="monospace" font-size="10" fill="#9ca3af" text-anchor="middle">LEVEL</text>',
            '<text x="120" y="280" font-family="monospace" font-size="20" fill="white" text-anchor="middle">', data.level.toString(), '</text>',
            '<rect x="210" y="230" width="140" height="60" rx="8" fill="#1a1a2e"/>',
            '<text x="280" y="255" font-family="monospace" font-size="10" fill="#9ca3af" text-anchor="middle">ENEMIES</text>',
            '<text x="280" y="280" font-family="monospace" font-size="20" fill="white" text-anchor="middle">', formatNumber(data.enemiesDefeated), '</text>',
            '<rect x="50" y="310" width="300" height="50" rx="8" fill="#1a1a2e" stroke="', color, '" stroke-width="1"/>',
            '<text x="200" y="335" font-family="monospace" font-size="10" fill="#9ca3af" text-anchor="middle">RARITY</text>',
            '<text x="200" y="352" font-family="monospace" font-size="16" fill="', color, '" text-anchor="middle" font-weight="bold">', rarity, '</text>',
            '<rect x="50" y="380" width="300" height="40" rx="8" fill="#1a1a2e"/>',
            '<text x="200" y="405" font-family="monospace" font-size="10" fill="#6b7280" text-anchor="middle">TIME: ', formatGameTime(data.gameTime), '</text>'
        ));
    }

    function formatNumber(uint256 num) internal pure returns (string memory) {
        if (num >= 1000000) {
            return string(abi.encodePacked((num / 1000000).toString(), ".", ((num % 1000000) / 100000).toString(), "M"));
        } else if (num >= 1000) {
            return string(abi.encodePacked((num / 1000).toString(), ".", ((num % 1000) / 100).toString(), "K"));
        }
        return num.toString();
    }

    function formatGameTime(uint256 ms) internal pure returns (string memory) {
        uint256 totalSeconds = ms / 1000;
        uint256 minutes = totalSeconds / 60;
        uint256 seconds = totalSeconds % 60;
        
        string memory minStr = minutes.toString();
        string memory secStr = seconds < 10 
            ? string(abi.encodePacked("0", seconds.toString()))
            : seconds.toString();
            
        return string(abi.encodePacked(minStr, ":", secStr));
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(64);
        bytes memory hexChars = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            bytesArray[i * 2] = hexChars[uint8(_bytes32[i] >> 4)];
            bytesArray[1 + i * 2] = hexChars[uint8(_bytes32[i] & 0x0f)];
        }
        return string(bytesArray);
    }

    // ========== SIGNATURE VERIFICATION ==========

    function getEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function verifySignature(bytes32 ethSignedHash, bytes calldata signature) internal view returns (bool) {
        if (signature.length != 65) return false;
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        
        address recovered = ecrecover(ethSignedHash, v, r, s);
        return recovered == mintSigner;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId < tokenIdCounter && _ownerOf(tokenId) != address(0);
    }

    // ========== ADMIN FUNCTIONS ==========

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setMintSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        emit MintSignerUpdated(mintSigner, _signer);
        mintSigner = _signer;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawStuckETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success,) = treasury.call{value: balance}("");
            if (!success) revert TransferFailed();
            emit FeesWithdrawn(treasury, balance);
        }
    }

    // ========== REQUIRED OVERRIDES ==========

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
