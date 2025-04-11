// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PoolFactory.sol";
import "./Pool.sol";

contract Router is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable factory;
    
    // Events
    event LiquidityAdded(address indexed pool, address indexed user, uint256 lpAmount);
    event LiquidityRemoved(address indexed pool, address indexed user, uint256 lpAmount);
    event Swapped(address indexed tokenIn, address indexed tokenOut, address indexed user, uint256 amountIn, uint256 amountOut);
    event SwapFailed(address indexed pool, address indexed user, string reason);
    event FeesClaimFailed(address indexed pool, address indexed user);
    event BestRouteFound(address[] path, uint256 expectedOutput);
    
    // Struct to reduce stack usage
    struct SwapHopData {
        address currentPool;
        uint256 expectedOut;
        uint256 feeAmount;
    }
    
    constructor(address _factory) {
        require(_factory != address(0), "FACTORY_ZERO_ADDRESS");
        factory = _factory;
    }
    
    // Helper functions
    function _getPool(address tokenA, address tokenB) internal view returns (address) {
        return PoolFactory(factory).findPool(tokenA, tokenB);
    }
    
    function _ensurePoolExists(address tokenA, address tokenB) internal view returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_TOKENS");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_TOKEN_ADDRESS");
        
        pool = _getPool(tokenA, tokenB);
        require(pool != address(0), "POOL_DOES_NOT_EXIST");
        return pool;
    }
    
    // Add liquidity to a pool from token0 with slippage protection
    function addLiquidityFromToken0(
        address tokenA, 
        address tokenB, 
        uint256 amount0,
        uint256 minLpAmount
    ) external nonReentrant returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Calculate amount1 required before transferring
        uint256 amount1 = poolContract.getRequiredAmount1(amount0);
        
        // Transfer tokens from user to this contract
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amount1);
        
        // Approve tokens for the pool
        IERC20(tokenA).approve(pool, amount0);
        IERC20(tokenB).approve(pool, amount1);
        
        // Add liquidity to the pool
        poolContract.addLiquidityFromToken0(amount0);
        
        // Return LP tokens to the user
        lpAmount = poolContract.balanceOf(address(this));
        require(lpAmount >= minLpAmount, "INSUFFICIENT_LP_AMOUNT");
        
        poolContract.transfer(msg.sender, lpAmount);
        
        emit LiquidityAdded(pool, msg.sender, lpAmount);
        return lpAmount;
    }
    
    // Add liquidity to a pool from token1 with slippage protection
    function addLiquidityFromToken1(
        address tokenA, 
        address tokenB, 
        uint256 amount1,
        uint256 minLpAmount
    ) external nonReentrant returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Calculate amount0 required before transferring
        uint256 amount0 = poolContract.getRequiredAmount0(amount1);
        
        // Transfer tokens from user to this contract
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amount1);
        
        // Approve tokens for the pool
        IERC20(tokenA).approve(pool, amount0);
        IERC20(tokenB).approve(pool, amount1);
        
        // Add liquidity to the pool
        poolContract.addLiquidityFromToken1(amount1);
        
        // Return LP tokens to the user
        lpAmount = poolContract.balanceOf(address(this));
        require(lpAmount >= minLpAmount, "INSUFFICIENT_LP_AMOUNT");
        
        poolContract.transfer(msg.sender, lpAmount);
        
        emit LiquidityAdded(pool, msg.sender, lpAmount);
        return lpAmount;
    }
    
    // Withdraw liquidity from a pool with slippage protection
    function withdrawLiquidity(
        address tokenA, 
        address tokenB, 
        uint256 lpAmount,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Preview what will be received
        (amountA, amountB) = poolContract.previewWithdraw(lpAmount);
        
        // Check slippage protection
        require(amountA >= minAmountA, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= minAmountB, "INSUFFICIENT_B_AMOUNT");
        
        // Transfer LP tokens from user to this contract
        poolContract.transferFrom(msg.sender, address(this), lpAmount);
        
        // Withdraw from the pool
        poolContract.withdrawLiquidity(lpAmount);
        
        // Transfer tokens back to the user
        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(pool, msg.sender, lpAmount);
        return (amountA, amountB);
    }
    
    // Swap token for another token through a direct pool
    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut) {
        address pool = _ensurePoolExists(tokenIn, tokenOut);
        Pool poolContract = Pool(pool);
        
        // Check expected output before transferring
        (uint256 expectedOut, ) = poolContract.getAmountOut(tokenIn, amountIn, tokenOut);
        require(expectedOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(pool, amountIn);
        
        // Perform the swap
        poolContract.swap(tokenIn, amountIn, tokenOut);
        
        // Transfer output directly from Pool to user 
        amountOut = IERC20(tokenOut).balanceOf(address(this));
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit Swapped(tokenIn, tokenOut, msg.sender, amountIn, amountOut);
        return amountOut;
    }
    
    // Helper function to perform a single swap hop (reduces stack usage)
    function _executeSwapHop(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) private returns (SwapHopData memory hopData) {
        hopData.currentPool = _ensurePoolExists(tokenIn, tokenOut);
        Pool poolContract = Pool(hopData.currentPool);
        
        // Approve current token for the pool
        IERC20(tokenIn).approve(hopData.currentPool, 0); // Reset allowance
        IERC20(tokenIn).approve(hopData.currentPool, amountIn);
        
        // Get expected output and fee
        (hopData.expectedOut, hopData.feeAmount) = poolContract.getAmountOut(tokenIn, amountIn, tokenOut);
        
        // Perform swap
        poolContract.swap(tokenIn, amountIn, tokenOut);
        
        return hopData;
    }
    
    // Multi-hop swap across multiple pools
    function swapMultiHop(
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut, uint256 totalFee) {
        require(path.length >= 2, "INVALID_PATH");
        
        // Transfer initial tokens from user
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Perform swaps across the path
        uint256 currentAmount = amountIn;
        totalFee = 0;
        
        for (uint i = 0; i < path.length - 1; i++) {
            address currentPool = _ensurePoolExists(path[i], path[i+1]);
            Pool poolContract = Pool(currentPool);
            
            // Approve current token for the pool
            IERC20(path[i]).approve(currentPool, 0); // Reset allowance
            IERC20(path[i]).approve(currentPool, currentAmount);
            
            // Get expected output and fee
            uint256 feeAmount;
            uint256 expectedOut;
            (expectedOut, feeAmount) = poolContract.getAmountOut(path[i], currentAmount, path[i+1]);
            
            // Accumulate the fee
            totalFee += feeAmount;
            
            // Perform swap
            try poolContract.swap(path[i], currentAmount, path[i+1]) {
                // Update amount for next hop
                currentAmount = IERC20(path[i+1]).balanceOf(address(this));
            } catch (bytes memory reason) {
                emit SwapFailed(currentPool, msg.sender, string(reason));
                revert("SWAP_FAILED");
            }
        }
        
        amountOut = currentAmount;
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer final tokens to user
        IERC20(path[path.length - 1]).safeTransfer(msg.sender, amountOut);
        
        emit Swapped(path[0], path[path.length - 1], msg.sender, amountIn, amountOut);
        return (amountOut, totalFee);
    }
    
    // Preview multi-hop swap result without executing the swap
    function previewSwapMultiHop(
        address[] calldata path,
        uint256 amountIn
    ) external view returns (uint256 expectedAmountOut, uint256 totalFee, uint256[] memory amountsOut, uint256[] memory feesPerHop) {
        require(path.length >= 2, "INVALID_PATH");
        
        // Initialize arrays to store intermediate values
        amountsOut = new uint256[](path.length);
        feesPerHop = new uint256[](path.length - 1);
        
        // Set initial amount
        amountsOut[0] = amountIn;
        totalFee = 0;
        
        // Simulate swaps across the path
        uint256 currentAmount = amountIn;
        
        for (uint i = 0; i < path.length - 1; i++) {
            // Get pool and check existence
            address tokenIn = path[i];
            address tokenOut = path[i+1];
            address currentPool = _ensurePoolExists(tokenIn, tokenOut);
            Pool poolContract = Pool(currentPool);
            
            // Get expected output and fee for this hop
            uint256 expectedOut;
            uint256 feeAmount;
            (expectedOut, feeAmount) = poolContract.getAmountOut(tokenIn, currentAmount, tokenOut);
            
            // Store results
            feesPerHop[i] = feeAmount;
            currentAmount = expectedOut;
            amountsOut[i+1] = expectedOut;
            
            // Accumulate the fee
            totalFee += feeAmount;
        }
        
        expectedAmountOut = currentAmount;
        
        return (expectedAmountOut, totalFee, amountsOut, feesPerHop);
    }
    
    // Private implementation for preview best route functionality
    function _previewSwapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 maxHops
    ) private view returns (
        address[] memory bestPath, 
        uint256 expectedOutput,
        uint256 totalFee,
        uint256[] memory amountsOut
    ) {
        require(tokenIn != address(0) && tokenOut != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenIn != tokenOut, "IDENTICAL_TOKENS");
        require(amountIn > 0, "ZERO_AMOUNT");
        require(maxHops >= 1 && maxHops <= 4, "INVALID_MAX_HOPS"); // Limit to 4 hops max for gas efficiency
        
        // Get all pools from factory
        address[] memory allPools = PoolFactory(factory).getAllPools();
        
        // Find the best route with the highest output
        (bestPath, expectedOutput) = findBestRoute(tokenIn, amountIn, tokenOut, allPools, maxHops);
        
        // Ensure a valid path was found
        require(bestPath.length >= 2, "NO_ROUTE_FOUND");
        
        // Calculate the detailed swap information directly
        amountsOut = new uint256[](bestPath.length);
        uint256[] memory feesPerHop = new uint256[](bestPath.length - 1);
        
        // Set initial amount
        amountsOut[0] = amountIn;
        totalFee = 0;
        
        // Simulate swaps across the path
        uint256 currentAmount = amountIn;
        
        for (uint i = 0; i < bestPath.length - 1; i++) {
            // Get pool and check existence
            address currentTokenIn = bestPath[i];
            address currentTokenOut = bestPath[i+1];
            address currentPool = _ensurePoolExists(currentTokenIn, currentTokenOut);
            Pool poolContract = Pool(currentPool);
            
            // Get expected output and fee for this hop
            uint256 expectedOut;
            uint256 feeAmount;
            (expectedOut, feeAmount) = poolContract.getAmountOut(currentTokenIn, currentAmount, currentTokenOut);
            
            // Store results
            feesPerHop[i] = feeAmount;
            currentAmount = expectedOut;
            amountsOut[i+1] = expectedOut;
            
            // Accumulate the fee
            totalFee += feeAmount;
        }
        
        // Update expected output with the final amount
        expectedOutput = currentAmount;
        
        return (bestPath, expectedOutput, totalFee, amountsOut);
    }
    
    // Public function to preview the result of swapWithBestRoute without executing the swap
    function previewSwapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 maxHops
    ) external view returns (
        address[] memory bestPath, 
        uint256 expectedOutput,
        uint256 totalFee,
        uint256[] memory amountsOut
    ) {
        return _previewSwapWithBestRoute(tokenIn, amountIn, tokenOut, maxHops);
    }
    
    // Default version to preview swapWithBestRoute with maxHops = 4
    function previewSwapWithBestRouteDefault(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view returns (
        address[] memory bestPath, 
        uint256 expectedOutput,
        uint256 totalFee,
        uint256[] memory amountsOut
    ) {
        return _previewSwapWithBestRoute(tokenIn, amountIn, tokenOut, 4);
    }
    
    // Allow users to create new pools through the router
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != address(0) && tokenB != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenA != tokenB, "IDENTICAL_TOKENS");
        
        return PoolFactory(factory).createPool(tokenA, tokenB);
    }
    
    // Allow users to create new pools with a specific fee rate through the router
    function createPoolWithFee(address tokenA, address tokenB, uint256 feeRate) external returns (address pool) {
        require(tokenA != address(0) && tokenB != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenA != tokenB, "IDENTICAL_TOKENS");
        require(feeRate <= 10000, "Fee rate cannot exceed 100%");
        
        return PoolFactory(factory).createPoolWithFee(tokenA, tokenB, feeRate);
    }
    
    // Get quote for swap
    function getAmountOut(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view returns (uint256 amountOut, uint256 feeAmount) {
        require(tokenIn != address(0) && tokenOut != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenIn != tokenOut, "IDENTICAL_TOKENS");
        
        address pool = _getPool(tokenIn, tokenOut);
        require(pool != address(0), "POOL_DOES_NOT_EXIST");
        return Pool(pool).getAmountOut(tokenIn, amountIn, tokenOut);
    }
    
    // Private implementation function for swap best route logic
    function _swapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        uint256 maxHops
    ) private returns (uint256 amountOut, address[] memory bestPath) {
        require(tokenIn != address(0) && tokenOut != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenIn != tokenOut, "IDENTICAL_TOKENS");
        require(amountIn > 0, "ZERO_AMOUNT");
        require(maxHops >= 1 && maxHops <= 4, "INVALID_MAX_HOPS"); // Limit to 4 hops max for gas efficiency
        
        // Get all pools from factory
        address[] memory allPools = PoolFactory(factory).getAllPools();
        
        // Find the best route with the highest output
        address[] memory path;
        uint256 expectedOutput;
        (path, expectedOutput) = findBestRoute(tokenIn, amountIn, tokenOut, allPools, maxHops);
        
        // Ensure a valid path was found
        require(path.length >= 2, "NO_ROUTE_FOUND");
        require(expectedOutput >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Set return path
        bestPath = path;
        
        // Emit which route was selected
        emit BestRouteFound(bestPath, expectedOutput);
        
        // Execute the swap using the best path - direct call
        amountOut = _executeMultiHopSwap(bestPath, amountIn, amountOutMin);
        
        return (amountOut, bestPath);
    }
    
    // Default version of swapWithBestRoute with maxHops set to 4
    function swapWithBestRouteDefault(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut, address[] memory bestPath) {
        return _swapWithBestRoute(tokenIn, amountIn, tokenOut, amountOutMin, 4);
    }
    
    // New function: Find the best route and swap with it to maximize output
    function swapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        uint256 maxHops
    ) external nonReentrant returns (uint256 amountOut, address[] memory bestPath) {
        // Call the implementation function
        return _swapWithBestRoute(tokenIn, amountIn, tokenOut, amountOutMin, maxHops);
    }
    
    // Helper to find the best route between tokenIn and tokenOut
    function findBestRoute(
        address tokenIn, 
        uint256 amountIn, 
        address tokenOut, 
        address[] memory pools,
        uint256 maxHops
    ) public view returns (address[] memory bestPath, uint256 bestAmountOut) {
        // Initialize the best path and amount
        bestPath = new address[](0);
        bestAmountOut = 0;
        
        // 1. Check direct route (1 hop)
        address directPool = _getPool(tokenIn, tokenOut);
        if (directPool != address(0)) {
            address[] memory directPath = new address[](2);
            directPath[0] = tokenIn;
            directPath[1] = tokenOut;
            
            // Use try-catch with external call to handle potential failures
            uint256 expectedOut = 0;
            bool success = false;
            
            try Router(address(this)).previewSwapMultiHop(directPath, amountIn) returns (uint256 outAmount, uint256, uint256[] memory, uint256[] memory) {
                expectedOut = outAmount;
                success = true;
            } catch {
                // If preview fails, just continue (might be insufficient liquidity)
            }
            
            if (success) {
                bestPath = directPath;
                bestAmountOut = expectedOut;
            }
        }
        
        // Early return if maxHops is 1
        if (maxHops == 1) {
            return (bestPath, bestAmountOut);
        }
        
        // Find all intermediate tokens that connect tokenIn and tokenOut
        address[] memory intermediateTokens = findIntermediateTokens(tokenIn, tokenOut, pools);
        
        // Try all 2-hop routes
        for (uint i = 0; i < intermediateTokens.length; i++) {
            address intermediate = intermediateTokens[i];
            
            // Skip if intermediate is the same as input or output token
            if (intermediate == tokenIn || intermediate == tokenOut) continue;
            
            // Create path
            address[] memory path = new address[](3);
            path[0] = tokenIn;
            path[1] = intermediate;
            path[2] = tokenOut;
            
            try Router(address(this)).previewSwapMultiHop(path, amountIn) returns (uint256 expectedOut, uint256, uint256[] memory, uint256[] memory) {
                if (expectedOut > bestAmountOut) {
                    bestPath = path;
                    bestAmountOut = expectedOut;
                }
            } catch {
                // Skip if calculation fails
                continue;
            }
        }
        
        // Only continue to 3-hop routes if maxHops >= 3 and we don't have a good route yet
        if (maxHops >= 3 && bestAmountOut > 0) {
            // 3. Check 3-hop routes (only if maxHops >= 3)
            // This is a simplified approach for 3-hop routes
            // For each intermediateToken, check if there's another hop that improves the output
            for (uint i = 0; i < intermediateTokens.length; i++) {
                address intermediate1 = intermediateTokens[i];
                
                // Skip if intermediate is the same as input or output token
                if (intermediate1 == tokenIn || intermediate1 == tokenOut) continue;
                
                for (uint j = 0; j < intermediateTokens.length; j++) {
                    if (i == j) continue; // Skip same intermediate
                    
                    address intermediate2 = intermediateTokens[j];
                    
                    // Skip if intermediate is the same as other tokens
                    if (intermediate2 == tokenIn || intermediate2 == tokenOut || intermediate2 == intermediate1) continue;
                    
                    // Check if pools exist for this path
                    if (_getPool(tokenIn, intermediate1) == address(0) ||
                        _getPool(intermediate1, intermediate2) == address(0) ||
                        _getPool(intermediate2, tokenOut) == address(0)) {
                        continue;
                    }
                    
                    // Create path
                    address[] memory path = new address[](4);
                    path[0] = tokenIn;
                    path[1] = intermediate1;
                    path[2] = intermediate2;
                    path[3] = tokenOut;
                    
                    try Router(address(this)).previewSwapMultiHop(path, amountIn) returns (uint256 expectedOut, uint256, uint256[] memory, uint256[] memory) {
                        if (expectedOut > bestAmountOut) {
                            bestPath = path;
                            bestAmountOut = expectedOut;
                        }
                    } catch {
                        // Skip if calculation fails
                        continue;
                    }
                }
            }
        }
        
        return (bestPath, bestAmountOut);
    }
    
    // Helper function to find intermediate tokens that can connect tokenIn and tokenOut
    function findIntermediateTokens(
        address tokenIn, 
        address tokenOut, 
        address[] memory pools
    ) private view returns (address[] memory) {
        // Maximum number of intermediate tokens to find
        address[] memory intermediates = new address[](pools.length * 2); // Upper bound on possible intermediates
        uint256 count = 0;
        
        // Examine each pool
        for (uint i = 0; i < pools.length; i++) {
            Pool poolContract = Pool(pools[i]);
            address token0 = poolContract.token0();
            address token1 = poolContract.token1();
            
            // Skip pools with insufficient liquidity
            uint256 balance0 = poolContract.tokenBalances(token0);
            uint256 balance1 = poolContract.tokenBalances(token1);
            if (balance0 == 0 || balance1 == 0) continue;
            
            // Check if this pool connects to tokenIn
            if (token0 == tokenIn || token1 == tokenIn) {
                // Add the other token as a potential intermediate
                address intermediate = (token0 == tokenIn) ? token1 : token0;
                
                // Check if this intermediate connects to tokenOut
                if (_getPool(intermediate, tokenOut) != address(0)) {
                    // This is a valid intermediate token
                    // Make sure we don't add duplicates
                    bool duplicate = false;
                    for (uint j = 0; j < count; j++) {
                        if (intermediates[j] == intermediate) {
                            duplicate = true;
                            break;
                        }
                    }
                    
                    if (!duplicate) {
                        intermediates[count] = intermediate;
                        count++;
                    }
                }
            }
        }
        
        // Create the final array with the correct size
        address[] memory result = new address[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = intermediates[i];
        }
        
        return result;
    }
    
    struct ClaimResult {
        address pool;
        address token0;
        address token1;
        uint256 fee0;
        uint256 fee1;
    }
    
    function claimFeesFromPools(
        address[][] calldata tokenPairs
    ) external nonReentrant returns (ClaimResult[] memory results) {
        uint256 pairCount = tokenPairs.length;
        require(pairCount > 0, "NO_POOLS_SPECIFIED");
        
        results = new ClaimResult[](pairCount);
        
        for (uint256 i = 0; i < pairCount; i++) {
            require(tokenPairs[i].length == 2, "INVALID_TOKEN_PAIR");
            address tokenA = tokenPairs[i][0];
            address tokenB = tokenPairs[i][1];
            
            address pool = _ensurePoolExists(tokenA, tokenB);
            Pool poolContract = Pool(pool);
            
            // Get token addresses in correct order
            (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
            
            // Store pool and token info
            results[i].pool = pool;
            results[i].token0 = token0;
            results[i].token1 = token1;
            
            // Check if user has LP tokens before attempting to claim
            uint256 userLpBalance = poolContract.balanceOf(msg.sender);
            if (userLpBalance > 0) {
                // Get pending fees to be claimed
                (uint256 pendingFee0, uint256 pendingFee1) = poolContract.getPendingFees(msg.sender);
                
                // Only attempt to claim if there are actual fees to claim
                if (pendingFee0 > 0 || pendingFee1 > 0) {
                    try poolContract.claimFeesForUser(msg.sender) returns (uint256 fee0, uint256 fee1) {
                        // Store claimed fee amounts in result
                        results[i].fee0 = fee0;
                        results[i].fee1 = fee1;
                    } catch {
                        // If claiming fails, emit an event and set fees to 0
                        emit FeesClaimFailed(pool, msg.sender);
                        results[i].fee0 = 0;
                        results[i].fee1 = 0;
                    }
                }
            }
        }
        
        return results;
    }

    function getPendingFeesFromPools(
        address[][] calldata tokenPairs,
        address user
    ) external view returns (ClaimResult[] memory results) {
        require(user != address(0), "ZERO_USER_ADDRESS");
        uint256 pairCount = tokenPairs.length;
        require(pairCount > 0, "NO_POOLS_SPECIFIED");
        
        results = new ClaimResult[](pairCount);
        
        for (uint256 i = 0; i < pairCount; i++) {
            require(tokenPairs[i].length == 2, "INVALID_TOKEN_PAIR");
            address tokenA = tokenPairs[i][0];
            address tokenB = tokenPairs[i][1];
            
            address pool = _getPool(tokenA, tokenB);
            
            if (pool != address(0)) {
                Pool poolContract = Pool(pool);
                uint256 userLpBalance = poolContract.balanceOf(user);
                
                if (userLpBalance > 0) {
                    // Get token addresses in correct order
                    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
                    
                    // Store pool and token info
                    results[i].pool = pool;
                    results[i].token0 = token0;
                    results[i].token1 = token1;
                    
                    // Get pending fees
                    (uint256 pendingFee0, uint256 pendingFee1) = poolContract.getPendingFees(user);
                    
                    // Store fee amounts in result
                    results[i].fee0 = pendingFee0;
                    results[i].fee1 = pendingFee1;
                }
            }
        }
        
        return results;
    }
    
    // Helper function to execute a multi-hop swap directly
    function _executeMultiHopSwap(
        address[] memory path,
        uint256 amountIn,
        uint256 amountOutMin
    ) private returns (uint256 amountOut) {
        require(path.length >= 2, "INVALID_PATH");
        
        // Transfer initial tokens from user
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Perform swaps across the path
        uint256 currentAmount = amountIn;
        
        for (uint i = 0; i < path.length - 1; i++) {
            address currentPool = _ensurePoolExists(path[i], path[i+1]);
            Pool poolContract = Pool(currentPool);
            
            // Approve current token for the pool
            IERC20(path[i]).approve(currentPool, 0); // Reset allowance
            IERC20(path[i]).approve(currentPool, currentAmount);
            
            // Perform swap
            try poolContract.swap(path[i], currentAmount, path[i+1]) {
                // Update amount for next hop
                currentAmount = IERC20(path[i+1]).balanceOf(address(this));
            } catch (bytes memory reason) {
                emit SwapFailed(currentPool, msg.sender, string(reason));
                revert("SWAP_FAILED");
            }
        }
        
        amountOut = currentAmount;
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer final tokens to user
        IERC20(path[path.length - 1]).safeTransfer(msg.sender, amountOut);
        
        emit Swapped(path[0], path[path.length - 1], msg.sender, amountIn, amountOut);
        return amountOut;
    }
} 