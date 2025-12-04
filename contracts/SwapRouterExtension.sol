// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IQuoterV2.sol";
import "./interfaces/AggregatorV3Interface.sol";
import "./interfaces/IWETH.sol";

/**
 * @title SwapRouterExtension
 * @notice A swap router extension for STARMINT game that wraps Uniswap V3 on Base
 * @dev Supports ETH<>USDC swaps with provisions for future STARMINT token
 * 
 * Fee Structure:
 * - Swaps >= $0.10 and < $500: Flat $0.10 fee
 * - Swaps >= $500: 0.1% fee
 * - Swaps < $0.10: Rejected
 * 
 * Points System:
 * - Every $10 swapped = 1 point
 * - Points tracked via events for backend indexing
 */
contract SwapRouterExtension is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ========== CONSTANTS ==========
    
    uint256 public constant POINTS_PER_TEN_DOLLARS = 1;
    uint256 public constant MINIMUM_SWAP_USD = 10e16; // $0.10 in 18 decimals
    uint256 public constant FLAT_FEE_USD = 10e16; // $0.10 in 18 decimals
    uint256 public constant PERCENTAGE_FEE_THRESHOLD_USD = 500e18; // $500 in 18 decimals
    uint256 public constant PERCENTAGE_FEE_BPS = 10; // 0.1% = 10 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant PRICE_FEED_STALENESS = 1 hours;

    // ========== BASE MAINNET ADDRESSES ==========
    
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address public constant UNISWAP_V3_QUOTER = 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a;
    
    // Chainlink Price Feeds on Base
    address public constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    
    // Pool fee tier for USDC/WETH on Base (0.05%)
    uint24 public constant POOL_FEE = 500;

    // ========== STATE VARIABLES ==========
    
    address public starmintToken; // Set when STARMINT token launches
    address public treasury;
    
    // User points (for on-chain tracking, also emitted for off-chain indexing)
    mapping(address => uint256) public userPoints;
    
    // Total fees collected
    uint256 public totalFeesCollectedETH;
    uint256 public totalFeesCollectedUSDC;
    uint256 public totalFeesCollectedSTARMINT;
    
    // Total points issued
    uint256 public totalPointsIssued;

    // ========== EVENTS ==========
    
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 usdNotional,
        uint256 feeCharged,
        uint256 pointsEarned,
        bytes32 txId
    );
    
    event StarmintTokenSet(address indexed newToken);
    event TreasuryUpdated(address indexed newTreasury);
    event FeesWithdrawn(address indexed token, uint256 amount);
    event PointsRedeemed(address indexed user, uint256 points, uint256 starmintAmount);

    // ========== ERRORS ==========
    
    error SwapAmountTooLow(uint256 usdValue, uint256 minimum);
    error StarmintNotLaunched();
    error InvalidTokenPair();
    error SlippageExceeded(uint256 expected, uint256 actual);
    error StalePriceFeed();
    error ZeroAddress();
    error InsufficientBalance();
    error TransferFailed();

    // ========== CONSTRUCTOR ==========
    
    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    // ========== EXTERNAL FUNCTIONS ==========

    /**
     * @notice Swap ETH for USDC
     * @param amountOutMin Minimum amount of USDC to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of USDC received
     */
    function swapETHForUSDC(
        uint256 amountOutMin,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (msg.value == 0) revert InsufficientBalance();
        
        // Get USD value of ETH being swapped
        uint256 usdNotional = getETHValueInUSD(msg.value);
        
        // Validate minimum swap amount
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        // Calculate fee in ETH
        uint256 feeInETH = calculateFeeInToken(usdNotional, msg.value, true);
        uint256 swapAmount = msg.value - feeInETH;
        
        // Calculate points earned
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        // Wrap ETH to WETH for the swap amount
        IWETH(WETH).deposit{value: swapAmount}();
        IERC20(WETH).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        // Execute swap via Uniswap V3
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: USDC,
            fee: POOL_FEE,
            recipient: msg.sender,
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInputSingle(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        // Update state
        _recordSwap(msg.sender, WETH, USDC, msg.value, amountOut, usdNotional, feeInETH, pointsEarned);
        
        // Transfer fee to treasury
        if (feeInETH > 0) {
            totalFeesCollectedETH += feeInETH;
            (bool success,) = treasury.call{value: feeInETH}("");
            if (!success) revert TransferFailed();
        }
        
        return amountOut;
    }

    /**
     * @notice Swap USDC for ETH
     * @param amountIn Amount of USDC to swap
     * @param amountOutMin Minimum amount of ETH to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of ETH received
     */
    function swapUSDCForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (amountIn == 0) revert InsufficientBalance();
        
        // USDC has 6 decimals, convert to 18 for USD calculation
        uint256 usdNotional = amountIn * 1e12; // Scale to 18 decimals
        
        // Validate minimum swap amount
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        // Calculate fee in USDC
        uint256 feeInUSDC = calculateFeeInToken(usdNotional, amountIn, false);
        uint256 swapAmount = amountIn - feeInUSDC;
        
        // Calculate points earned
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        // Transfer USDC from user
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(USDC).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        // Execute swap via Uniswap V3
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDC,
            tokenOut: WETH,
            fee: POOL_FEE,
            recipient: address(this),
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInputSingle(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        // Unwrap WETH to ETH and send to user
        IWETH(WETH).withdraw(amountOut);
        (bool success,) = msg.sender.call{value: amountOut}("");
        if (!success) revert TransferFailed();
        
        // Update state
        _recordSwap(msg.sender, USDC, WETH, amountIn, amountOut, usdNotional, feeInUSDC, pointsEarned);
        
        // Transfer fee to treasury
        if (feeInUSDC > 0) {
            totalFeesCollectedUSDC += feeInUSDC;
            IERC20(USDC).safeTransfer(treasury, feeInUSDC);
        }
        
        return amountOut;
    }

    /**
     * @notice Swap ETH for STARMINT token (available after token launch)
     * @param amountOutMin Minimum amount of STARMINT to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of STARMINT received
     */
    function swapETHForSTARMINT(
        uint256 amountOutMin,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (starmintToken == address(0)) revert StarmintNotLaunched();
        if (msg.value == 0) revert InsufficientBalance();
        
        uint256 usdNotional = getETHValueInUSD(msg.value);
        
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        uint256 feeInETH = calculateFeeInToken(usdNotional, msg.value, true);
        uint256 swapAmount = msg.value - feeInETH;
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        IWETH(WETH).deposit{value: swapAmount}();
        IERC20(WETH).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: starmintToken,
            fee: POOL_FEE,
            recipient: msg.sender,
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInputSingle(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        _recordSwap(msg.sender, WETH, starmintToken, msg.value, amountOut, usdNotional, feeInETH, pointsEarned);
        
        if (feeInETH > 0) {
            totalFeesCollectedETH += feeInETH;
            (bool success,) = treasury.call{value: feeInETH}("");
            if (!success) revert TransferFailed();
        }
        
        return amountOut;
    }

    /**
     * @notice Swap STARMINT token for ETH (available after token launch)
     * @param amountIn Amount of STARMINT to swap
     * @param amountOutMin Minimum amount of ETH to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of ETH received
     */
    function swapSTARMINTForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (starmintToken == address(0)) revert StarmintNotLaunched();
        if (amountIn == 0) revert InsufficientBalance();
        
        // Get STARMINT value - for now, use a placeholder price until integrated with oracle
        // In production, integrate Chainlink or use TWAP from pool
        uint256 usdNotional = getStarmintValueInUSD(amountIn);
        
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        uint256 feeInStarmint = calculateFeeInToken(usdNotional, amountIn, false);
        uint256 swapAmount = amountIn - feeInStarmint;
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        IERC20(starmintToken).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(starmintToken).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: starmintToken,
            tokenOut: WETH,
            fee: POOL_FEE,
            recipient: address(this),
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInputSingle(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        IWETH(WETH).withdraw(amountOut);
        (bool success,) = msg.sender.call{value: amountOut}("");
        if (!success) revert TransferFailed();
        
        _recordSwap(msg.sender, starmintToken, WETH, amountIn, amountOut, usdNotional, feeInStarmint, pointsEarned);
        
        if (feeInStarmint > 0) {
            totalFeesCollectedSTARMINT += feeInStarmint;
            IERC20(starmintToken).safeTransfer(treasury, feeInStarmint);
        }
        
        return amountOut;
    }

    /**
     * @notice Swap USDC for STARMINT token (available after token launch)
     * @param amountIn Amount of USDC to swap
     * @param amountOutMin Minimum amount of STARMINT to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of STARMINT received
     */
    function swapUSDCForSTARMINT(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (starmintToken == address(0)) revert StarmintNotLaunched();
        if (amountIn == 0) revert InsufficientBalance();
        
        uint256 usdNotional = amountIn * 1e12;
        
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        uint256 feeInUSDC = calculateFeeInToken(usdNotional, amountIn, false);
        uint256 swapAmount = amountIn - feeInUSDC;
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(USDC).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        // Multi-hop swap: USDC -> WETH -> STARMINT
        bytes memory path = abi.encodePacked(USDC, POOL_FEE, WETH, POOL_FEE, starmintToken);
        
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        _recordSwap(msg.sender, USDC, starmintToken, amountIn, amountOut, usdNotional, feeInUSDC, pointsEarned);
        
        if (feeInUSDC > 0) {
            totalFeesCollectedUSDC += feeInUSDC;
            IERC20(USDC).safeTransfer(treasury, feeInUSDC);
        }
        
        return amountOut;
    }

    /**
     * @notice Swap STARMINT token for USDC (available after token launch)
     * @param amountIn Amount of STARMINT to swap
     * @param amountOutMin Minimum amount of USDC to receive
     * @param deadline Transaction deadline timestamp
     * @return amountOut Amount of USDC received
     */
    function swapSTARMINTForUSDC(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (starmintToken == address(0)) revert StarmintNotLaunched();
        if (amountIn == 0) revert InsufficientBalance();
        
        uint256 usdNotional = getStarmintValueInUSD(amountIn);
        
        if (usdNotional < MINIMUM_SWAP_USD) {
            revert SwapAmountTooLow(usdNotional, MINIMUM_SWAP_USD);
        }
        
        uint256 feeInStarmint = calculateFeeInToken(usdNotional, amountIn, false);
        uint256 swapAmount = amountIn - feeInStarmint;
        uint256 pointsEarned = calculatePoints(usdNotional);
        
        IERC20(starmintToken).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(starmintToken).approve(UNISWAP_V3_ROUTER, swapAmount);
        
        // Multi-hop swap: STARMINT -> WETH -> USDC
        bytes memory path = abi.encodePacked(starmintToken, POOL_FEE, WETH, POOL_FEE, USDC);
        
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            amountIn: swapAmount,
            amountOutMinimum: amountOutMin
        });
        
        amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
        
        if (amountOut < amountOutMin) {
            revert SlippageExceeded(amountOutMin, amountOut);
        }
        
        _recordSwap(msg.sender, starmintToken, USDC, amountIn, amountOut, usdNotional, feeInStarmint, pointsEarned);
        
        if (feeInStarmint > 0) {
            totalFeesCollectedSTARMINT += feeInStarmint;
            IERC20(starmintToken).safeTransfer(treasury, feeInStarmint);
        }
        
        return amountOut;
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get a quote for ETH to USDC swap
     * @param amountIn Amount of ETH to swap
     * @return amountOut Estimated USDC output
     * @return fee Fee amount in ETH
     * @return points Points to be earned
     */
    function quoteETHToUSDC(uint256 amountIn) external view returns (
        uint256 amountOut,
        uint256 fee,
        uint256 points
    ) {
        uint256 usdNotional = getETHValueInUSD(amountIn);
        fee = calculateFeeInToken(usdNotional, amountIn, true);
        uint256 swapAmount = amountIn - fee;
        points = calculatePoints(usdNotional);
        
        // Note: In production, use quoter for accurate quote
        // This is a simplified estimate based on price feed
        uint256 ethPrice = getETHPrice();
        amountOut = (swapAmount * ethPrice) / 1e18 / 1e12; // Convert to USDC decimals
    }

    /**
     * @notice Get a quote for USDC to ETH swap
     * @param amountIn Amount of USDC to swap
     * @return amountOut Estimated ETH output
     * @return fee Fee amount in USDC
     * @return points Points to be earned
     */
    function quoteUSDCToETH(uint256 amountIn) external view returns (
        uint256 amountOut,
        uint256 fee,
        uint256 points
    ) {
        uint256 usdNotional = amountIn * 1e12;
        fee = calculateFeeInToken(usdNotional, amountIn, false);
        uint256 swapAmount = amountIn - fee;
        points = calculatePoints(usdNotional);
        
        uint256 ethPrice = getETHPrice();
        amountOut = (swapAmount * 1e12 * 1e18) / ethPrice;
    }

    /**
     * @notice Check if STARMINT token is available for swapping
     * @return True if STARMINT token address is set
     */
    function isStarmintAvailable() external view returns (bool) {
        return starmintToken != address(0);
    }

    /**
     * @notice Get user's total points balance
     * @param user User address
     * @return User's points balance
     */
    function getPoints(address user) external view returns (uint256) {
        return userPoints[user];
    }

    // ========== INTERNAL FUNCTIONS ==========

    /**
     * @notice Calculate fee based on USD notional value
     * @dev Fee structure: >= $500: 0.1%, >= $0.10: flat $0.10
     * @param usdNotional USD value of swap in 18 decimals
     * @param tokenAmount Amount in token units
     * @param isETH Whether the fee is in ETH or USDC
     * @return Fee amount in token units
     */
    function calculateFeeInToken(
        uint256 usdNotional,
        uint256 tokenAmount,
        bool isETH
    ) public view returns (uint256) {
        uint256 feeUSD;
        
        if (usdNotional >= PERCENTAGE_FEE_THRESHOLD_USD) {
            // 0.1% fee for swaps >= $500
            feeUSD = (usdNotional * PERCENTAGE_FEE_BPS) / BPS_DENOMINATOR;
        } else {
            // Flat $0.10 fee for swaps >= $0.10
            feeUSD = FLAT_FEE_USD;
        }
        
        // Convert fee from USD to token amount
        if (isETH) {
            uint256 ethPrice = getETHPrice();
            return (feeUSD * 1e18) / ethPrice;
        } else {
            // For USDC (6 decimals)
            return feeUSD / 1e12;
        }
    }

    /**
     * @notice Calculate points earned for a swap
     * @param usdNotional USD value in 18 decimals
     * @return Points earned (1 point per $10)
     */
    function calculatePoints(uint256 usdNotional) public pure returns (uint256) {
        return usdNotional / (10e18); // 1 point per $10
    }

    /**
     * @notice Get ETH value in USD using Chainlink price feed
     * @param ethAmount Amount of ETH in wei
     * @return USD value in 18 decimals
     */
    function getETHValueInUSD(uint256 ethAmount) public view returns (uint256) {
        uint256 ethPrice = getETHPrice();
        return (ethAmount * ethPrice) / 1e18;
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
     * @notice Get STARMINT value in USD
     * @dev Placeholder - integrate with oracle or TWAP when token launches
     * @param amount Amount of STARMINT tokens
     * @return USD value in 18 decimals
     */
    function getStarmintValueInUSD(uint256 amount) public view returns (uint256) {
        // TODO: Integrate with Chainlink or Uniswap TWAP when STARMINT launches
        // For now, assume 1 STARMINT = $1 (placeholder)
        return amount;
    }

    /**
     * @notice Record swap and update points
     */
    function _recordSwap(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 usdNotional,
        uint256 fee,
        uint256 points
    ) internal {
        userPoints[user] += points;
        totalPointsIssued += points;
        
        bytes32 txId = keccak256(abi.encodePacked(user, block.timestamp, amountIn, block.number));
        
        emit SwapExecuted(
            user,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            usdNotional,
            fee,
            points,
            txId
        );
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set STARMINT token address when launched
     * @param _starmintToken STARMINT token contract address
     */
    function setStarmintToken(address _starmintToken) external onlyOwner {
        if (_starmintToken == address(0)) revert ZeroAddress();
        starmintToken = _starmintToken;
        emit StarmintTokenSet(_starmintToken);
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /**
     * @notice Pause all swaps
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause all swaps
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck tokens
     * @param token Token address (use address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success,) = treasury.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(treasury, amount);
        }
        emit FeesWithdrawn(token, amount);
    }

    // ========== RECEIVE FUNCTION ==========
    
    receive() external payable {}
}
