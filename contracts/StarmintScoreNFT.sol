// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract StarmintScoreNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 private _tokenIdCounter;
    string public externalBaseUrl;
    
    address public authorizedMinter;
    mapping(bytes32 => bool) public usedSignatures;

    struct ScoreData {
        uint256 score;
        uint256 level;
        uint256 enemiesDefeated;
        uint256 gameTime;
        uint256 accuracy;
        uint256 timestamp;
        address player;
        bytes32 sessionHash;
    }

    mapping(uint256 => ScoreData) public scores;
    mapping(address => uint256[]) private _playerTokens;

    event ScoreMinted(
        uint256 indexed tokenId,
        address indexed player,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        string rarity
    );
    event AuthorizedMinterUpdated(address indexed oldMinter, address indexed newMinter);

    error InvalidScore();
    error InvalidLevel();
    error ZeroAddress();
    error TokenDoesNotExist();
    error UnauthorizedMinter();
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error SignatureExpired();

    constructor(
        string memory _externalBaseUrl,
        address _authorizedMinter
    ) ERC721("STARMINT High Score", "STARMINT") Ownable(msg.sender) {
        externalBaseUrl = _externalBaseUrl;
        authorizedMinter = _authorizedMinter;
        emit AuthorizedMinterUpdated(address(0), _authorizedMinter);
    }

    modifier onlyAuthorizedMinter() {
        if (msg.sender != authorizedMinter && msg.sender != owner()) {
            revert UnauthorizedMinter();
        }
        _;
    }

    function mintScoreAuthorized(
        address to,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        uint256 gameTime,
        uint256 accuracy,
        bytes32 sessionHash
    ) public onlyAuthorizedMinter nonReentrant returns (uint256) {
        return _mintScore(to, score, level, enemiesDefeated, gameTime, accuracy, sessionHash);
    }

    function mintScoreWithSignature(
        address to,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        uint256 gameTime,
        uint256 accuracy,
        bytes32 sessionHash,
        uint256 deadline,
        bytes memory signature
    ) public nonReentrant returns (uint256) {
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 messageHash = keccak256(abi.encodePacked(
            to,
            score,
            level,
            enemiesDefeated,
            gameTime,
            accuracy,
            sessionHash,
            deadline,
            address(this),
            block.chainid
        ));

        if (usedSignatures[messageHash]) revert SignatureAlreadyUsed();

        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);

        if (signer != authorizedMinter && signer != owner()) {
            revert InvalidSignature();
        }

        usedSignatures[messageHash] = true;

        return _mintScore(to, score, level, enemiesDefeated, gameTime, accuracy, sessionHash);
    }

    function _mintScore(
        address to,
        uint256 score,
        uint256 level,
        uint256 enemiesDefeated,
        uint256 gameTime,
        uint256 accuracy,
        bytes32 sessionHash
    ) internal returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (score == 0) revert InvalidScore();
        if (level == 0) revert InvalidLevel();

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);

        scores[tokenId] = ScoreData({
            score: score,
            level: level,
            enemiesDefeated: enemiesDefeated,
            gameTime: gameTime,
            accuracy: accuracy,
            timestamp: block.timestamp,
            player: to,
            sessionHash: sessionHash
        });

        _playerTokens[to].push(tokenId);

        string memory rarity = _calculateRarity(score);
        emit ScoreMinted(tokenId, to, score, level, enemiesDefeated, rarity);

        return tokenId;
    }

    function getScoreData(uint256 tokenId) public view returns (ScoreData memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return scores[tokenId];
    }

    function getPlayerTokens(address player) public view returns (uint256[] memory) {
        return _playerTokens[player];
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function setExternalBaseUrl(string memory _url) external onlyOwner {
        externalBaseUrl = _url;
    }

    function setAuthorizedMinter(address _minter) external onlyOwner {
        address oldMinter = authorizedMinter;
        authorizedMinter = _minter;
        emit AuthorizedMinterUpdated(oldMinter, _minter);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        ScoreData memory data = scores[tokenId];
        string memory rarity = _calculateRarity(data.score);
        string memory rarityColor = _getRarityColor(data.score);
        string memory svg = _generateSVG(tokenId, data, rarityColor);
        string memory attributes = _generateAttributes(data, rarity);

        string memory json = string(
            abi.encodePacked(
                '{"name":"STARMINT High Score #',
                tokenId.toString(),
                '","description":"Proof of your epic run in the STARMINT Space Shooter mini app. Score: ',
                data.score.toString(),
                ' points. Achieved on ',
                _formatTimestamp(data.timestamp),
                '. Part of the Base ecosystem.","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '","attributes":',
                attributes,
                ',"external_url":"',
                externalBaseUrl,
                "/score/",
                tokenId.toString(),
                '","background_color":"000000"}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _generateSVG(
        uint256 tokenId,
        ScoreData memory data,
        string memory rarityColor
    ) internal pure returns (string memory) {
        string memory stars = _generateStarfield(tokenId);

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:#0a0a1a">',
                '<defs>',
                '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:#1a0a2e"/>',
                '<stop offset="50%" style="stop-color:#0a1628"/>',
                '<stop offset="100%" style="stop-color:#0a0a1a"/>',
                '</linearGradient>',
                '<linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:',
                rarityColor,
                ';stop-opacity:0.8"/>',
                '<stop offset="100%" style="stop-color:',
                rarityColor,
                ';stop-opacity:0.2"/>',
                '</linearGradient>',
                '<filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>',
                '</defs>',
                '<rect width="400" height="500" fill="url(#bg)"/>',
                stars,
                _generateSpaceship(),
                _generateScoreOverlay(data, rarityColor),
                '</svg>'
            )
        );
    }

    function _generateStarfield(uint256 seed) internal pure returns (string memory) {
        bytes memory stars = "";
        for (uint256 i = 0; i < 30; i++) {
            uint256 x = (uint256(keccak256(abi.encodePacked(seed, i, "x"))) % 400);
            uint256 y = (uint256(keccak256(abi.encodePacked(seed, i, "y"))) % 500);
            uint256 size = (uint256(keccak256(abi.encodePacked(seed, i, "s"))) % 3) + 1;
            uint256 opacity = (uint256(keccak256(abi.encodePacked(seed, i, "o"))) % 50) + 50;

            stars = abi.encodePacked(
                stars,
                '<circle cx="',
                x.toString(),
                '" cy="',
                y.toString(),
                '" r="',
                size.toString(),
                '" fill="white" opacity="0.',
                opacity.toString(),
                '"/>'
            );
        }
        return string(stars);
    }

    function _generateSpaceship() internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<g transform="translate(170, 280)">',
                '<polygon points="30,0 60,50 50,55 30,45 10,55 0,50" fill="#4fd1c5" stroke="#81e6d9" stroke-width="2"/>',
                '<polygon points="30,0 45,35 30,30 15,35" fill="#63b3ed"/>',
                '<ellipse cx="30" cy="20" rx="8" ry="5" fill="#f6e05e"/>',
                '<polygon points="0,50 -5,70 10,55" fill="#fc8181"/>',
                '<polygon points="60,50 65,70 50,55" fill="#fc8181"/>',
                '<polygon points="25,55 35,55 32,75 28,75" fill="#fc8181"/>',
                '</g>'
            )
        );
    }

    function _generateScoreOverlay(ScoreData memory data, string memory rarityColor) internal pure returns (string memory) {
        string memory rarity = _calculateRarity(data.score);

        return string(
            abi.encodePacked(
                '<rect x="20" y="20" width="360" height="80" rx="10" fill="rgba(0,0,0,0.7)" stroke="',
                rarityColor,
                '" stroke-width="2"/>',
                '<text x="200" y="50" text-anchor="middle" font-family="monospace" font-size="14" fill="#a0aec0">STARMINT HIGH SCORE</text>',
                '<text x="200" y="80" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="',
                rarityColor,
                '">',
                _formatNumber(data.score),
                '</text>',
                '<rect x="20" y="400" width="360" height="80" rx="10" fill="rgba(0,0,0,0.7)" stroke="#4a5568" stroke-width="1"/>',
                '<text x="40" y="430" font-family="monospace" font-size="12" fill="#a0aec0">LEVEL: <tspan fill="#63b3ed">',
                data.level.toString(),
                '</tspan></text>',
                '<text x="200" y="430" font-family="monospace" font-size="12" fill="#a0aec0">ENEMIES: <tspan fill="#fc8181">',
                data.enemiesDefeated.toString(),
                '</tspan></text>',
                '<text x="40" y="460" font-family="monospace" font-size="12" fill="#a0aec0">RARITY: <tspan fill="',
                rarityColor,
                '">',
                rarity,
                '</tspan></text>'
            )
        );
    }

    function _calculateRarity(uint256 score) internal pure returns (string memory) {
        if (score >= 100000) return "LEGENDARY";
        if (score >= 50000) return "EPIC";
        if (score >= 20000) return "RARE";
        if (score >= 5000) return "UNCOMMON";
        return "COMMON";
    }

    function _getRarityColor(uint256 score) internal pure returns (string memory) {
        if (score >= 100000) return "#ffd700";
        if (score >= 50000) return "#a855f7";
        if (score >= 20000) return "#3b82f6";
        if (score >= 5000) return "#22c55e";
        return "#9ca3af";
    }

    function _generateAttributes(ScoreData memory data, string memory rarity) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '[{"trait_type":"Score","value":',
                data.score.toString(),
                ',"display_type":"number"},',
                '{"trait_type":"Level Reached","value":',
                data.level.toString(),
                '},',
                '{"trait_type":"Enemies Defeated","value":',
                data.enemiesDefeated.toString(),
                '},',
                '{"trait_type":"Game Time (ms)","value":',
                data.gameTime.toString(),
                '},',
                '{"trait_type":"Accuracy","value":',
                data.accuracy.toString(),
                '},',
                '{"trait_type":"Date Achieved","value":"',
                _formatTimestamp(data.timestamp),
                '","display_type":"date"},',
                '{"trait_type":"Rarity","value":"',
                rarity,
                '"},',
                '{"trait_type":"Session Hash","value":"',
                _bytes32ToHexString(data.sessionHash),
                '"}]'
            )
        );
    }

    function _formatNumber(uint256 num) internal pure returns (string memory) {
        if (num >= 1000000) {
            return string(abi.encodePacked((num / 1000000).toString(), ",", _padThree((num % 1000000) / 1000), ",", _padThree(num % 1000)));
        } else if (num >= 1000) {
            return string(abi.encodePacked((num / 1000).toString(), ",", _padThree(num % 1000)));
        }
        return num.toString();
    }

    function _padThree(uint256 num) internal pure returns (string memory) {
        if (num < 10) return string(abi.encodePacked("00", num.toString()));
        if (num < 100) return string(abi.encodePacked("0", num.toString()));
        return num.toString();
    }

    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        uint256 year;
        uint256 month;
        uint256 day;
        (year, month, day) = _daysToDate(timestamp / 86400 + 719468);
        return string(
            abi.encodePacked(
                year.toString(),
                "-",
                _padZero(month),
                "-",
                _padZero(day)
            )
        );
    }

    function _daysToDate(uint256 _days) internal pure returns (uint256 year, uint256 month, uint256 day) {
        uint256 L = _days + 68569;
        uint256 N = 4 * L / 146097;
        L = L - (146097 * N + 3) / 4;
        uint256 _year = 4000 * (L + 1) / 1461001;
        L = L - 1461 * _year / 4 + 31;
        uint256 _month = 80 * L / 2447;
        uint256 _day = L - 2447 * _month / 80;
        L = _month / 11;
        _month = _month + 2 - 12 * L;
        _year = 100 * (N - 49) + _year + L;
        return (_year, _month, _day);
    }

    function _padZero(uint256 num) internal pure returns (string memory) {
        if (num < 10) {
            return string(abi.encodePacked("0", num.toString()));
        }
        return num.toString();
    }

    function _bytes32ToHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(66);
        result[0] = "0";
        result[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            result[2 + i * 2] = hexChars[uint8(data[i] >> 4)];
            result[3 + i * 2] = hexChars[uint8(data[i] & 0x0f)];
        }
        return string(result);
    }
}
