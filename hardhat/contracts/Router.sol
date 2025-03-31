// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PoolFactory.sol";
import "./Pool.sol";

contract Router is ReentrancyGuard {
    address public immutable factory;
    
    constructor(address _factory) {
        factory = _factory;
    }
    
    // Helper functions
    function _getPool(address tokenA, address tokenB) internal view returns (address) {
        return PoolFactory(factory).findPool(tokenA, tokenB);
    }
    
    function _ensurePoolExists(address tokenA, address tokenB) internal view returns (address pool) {
        pool = _getPool(tokenA, tokenB);
        require(pool != address(0), "POOL_DOES_NOT_EXIST");
        return pool;
    }
    
    // Add liquidity to a pool from token0
    function addLiquidityFromToken0(
        address tokenA, 
        address tokenB, 
        uint256 amount0
    ) external nonReentrant returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        
        // Approve tokens for the pool
        IERC20(tokenA).transferFrom(msg.sender, address(this), amount0);
        IERC20(tokenA).approve(pool, amount0);
        
        // Calculate amount1 required
        uint256 amount1 = Pool(pool).getRequiredAmount1(amount0);
        
        // Transfer token1 from user
        IERC20(tokenB).transferFrom(msg.sender, address(this), amount1);
        IERC20(tokenB).approve(pool, amount1);
        
        // Add liquidity to the pool
        Pool(pool).addLiquidityFromToken0(amount0);
        
        // Return LP tokens to the user
        lpAmount = Pool(pool).balanceOf(address(this));
        Pool(pool).transfer(msg.sender, lpAmount);
        
        return lpAmount;
    }
    
    // Add liquidity to a pool from token1
    function addLiquidityFromToken1(
        address tokenA, 
        address tokenB, 
        uint256 amount1
    ) external nonReentrant returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        
        // Approve tokens for the pool
        IERC20(tokenB).transferFrom(msg.sender, address(this), amount1);
        IERC20(tokenB).approve(pool, amount1);
        
        // Calculate amount0 required
        uint256 amount0 = Pool(pool).getRequiredAmount0(amount1);
        
        // Transfer token0 from user
        IERC20(tokenA).transferFrom(msg.sender, address(this), amount0);
        IERC20(tokenA).approve(pool, amount0);
        
        // Add liquidity to the pool
        Pool(pool).addLiquidityFromToken1(amount1);
        
        // Return LP tokens to the user
        lpAmount = Pool(pool).balanceOf(address(this));
        Pool(pool).transfer(msg.sender, lpAmount);
        
        return lpAmount;
    }
    
    // Withdraw liquidity from a pool
    function withdrawLiquidity(
        address tokenA, 
        address tokenB, 
        uint256 lpAmount
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        
        // Transfer LP tokens from user to this contract
        Pool(pool).transferFrom(msg.sender, address(this), lpAmount);
        
        // Preview what will be received
        (amountA, amountB) = Pool(pool).previewWithdraw(lpAmount);
        
        // Withdraw from the pool
        Pool(pool).withdrawLiquidity(lpAmount);
        
        // Transfer tokens back to the user
        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);
        
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
        
        // Transfer tokens from user
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(pool, amountIn);
        
        // Check expected output
        (uint256 expectedOut, ) = Pool(pool).getAmountOut(tokenIn, amountIn, tokenOut);
        require(expectedOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Perform the swap
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));
        
        Pool(pool).swap(tokenIn, amountIn, tokenOut);
        
        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;
        
        // Send output tokens to user
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        return amountOut;
    }
    
    // Multi-hop swap across multiple pools
    function swapMultiHop(
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut, uint256 totalFee) {
        require(path.length >= 2, "INVALID_PATH");
        
        // Transfer initial tokens from user
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Perform swaps across the path
        uint256 currentAmount = amountIn;
        totalFee = 0;
        
        for (uint i = 0; i < path.length - 1; i++) {
            address currentPool = _ensurePoolExists(path[i], path[i+1]);
            
            // Approve current token for the pool
            IERC20(path[i]).approve(currentPool, currentAmount);
            
            // Get expected output and fee
            uint256 feeAmount;
            uint256 expectedOut;
            (expectedOut, feeAmount) = Pool(currentPool).getAmountOut(path[i], currentAmount, path[i+1]);
            
            // Accumulate the fee
            totalFee += feeAmount;
            
            // Perform swap
            Pool(currentPool).swap(path[i], currentAmount, path[i+1]);
            
            // Update amount for next hop
            currentAmount = IERC20(path[i+1]).balanceOf(address(this));
        }
        
        amountOut = currentAmount;
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer final tokens to user
        IERC20(path[path.length - 1]).transfer(msg.sender, amountOut);
        
        return (amountOut, totalFee);
    }
    
    // Allow users to create new pools through the router
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        return PoolFactory(factory).createPool(tokenA, tokenB);
    }
    
    // Get quote for swap
    function getAmountOut(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view returns (uint256 amountOut, uint256 feeAmount) {
        address pool = _getPool(tokenIn, tokenOut);
        require(pool != address(0), "POOL_DOES_NOT_EXIST");
        return Pool(pool).getAmountOut(tokenIn, amountIn, tokenOut);
    }
} 