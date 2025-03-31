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
    
    // Allow users to create new pools through the router
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != address(0) && tokenB != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenA != tokenB, "IDENTICAL_TOKENS");
        
        return PoolFactory(factory).createPool(tokenA, tokenB);
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
} 