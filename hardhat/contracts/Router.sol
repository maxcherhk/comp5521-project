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
    
    struct PathSimulationResult {
        uint256 expectedOutput;
        uint256 totalFee;
        uint256[] amountsOut;
        uint256[] feesPerHop;
    }
    
    struct ClaimResult {
        address pool;
        address token0;
        address token1;
        uint256 fee0;
        uint256 fee1;
    }

    // Define a struct to hold routing data (to reduce stack usage)
    struct RouteParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 bestAmountOut;
        address[] bestPath;
    }

    // Modifiers for common validations
    modifier validateTokens(address tokenA, address tokenB) {
        require(tokenA != address(0) && tokenB != address(0), "ZERO_TOKEN_ADDRESS");
        require(tokenA != tokenB, "IDENTICAL_TOKENS");
        _;
    }
    
    modifier validateAmount(uint256 amount) {
        require(amount > 0, "ZERO_AMOUNT");
        _;
    }
    
    modifier validatePath(address[] memory path) {
        require(path.length >= 2, "INVALID_PATH");
        _;
    }
    
    modifier validateMaxHops(uint256 maxHops) {
        require(maxHops >= 1 && maxHops <= 4, "INVALID_MAX_HOPS");
        _;
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
    
    // Helper for token transfers, approvals and liquidity operations
    function _transferAndApproveTokens(
        address fromToken, 
        address toToken, 
        address pool,
        uint256 amountFrom,
        uint256 amountTo
    ) private {
        // Transfer tokens from user to this contract
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amountFrom);
        IERC20(toToken).safeTransferFrom(msg.sender, address(this), amountTo);
        
        // Approve tokens for the pool
        IERC20(fromToken).approve(pool, amountFrom);
        IERC20(toToken).approve(pool, amountTo);
    }
    
    // Preview function to show expected LP tokens and pool share before adding liquidity
    function previewAddLiquidity(
        address tokenA,
        address tokenB,
        uint256 amount,
        bool isFromToken0
    ) external view validateTokens(tokenA, tokenB) validateAmount(amount) returns (
        uint256 lpAmount, 
        uint256 poolShareBasisPoints,
        uint256 amount0,
        uint256 amount1
    ) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Calculate required amounts based on which token is the base
        if (isFromToken0) {
            amount0 = amount;
            amount1 = poolContract.getRequiredAmount1(amount);
        } else {
            amount1 = amount;
            amount0 = poolContract.getRequiredAmount0(amount);
        }
        
        // Calculate LP tokens using the same formula as in the Pool contract
        uint256 totalLP = poolContract.totalSupply();
        address token0 = poolContract.token0();
        address token1 = poolContract.token1();
        
        if (totalLP > 0) {
            if (isFromToken0) {
                lpAmount = (amount0 * totalLP) / poolContract.tokenBalances(token0);
            } else {
                lpAmount = (amount1 * totalLP) / poolContract.tokenBalances(token1);
            }
        } else {
            // Initial liquidity provision
            if (isFromToken0) {
                lpAmount = amount0;
            } else {
                uint256 INITIAL_RATIO = 2; // Same as in Pool contract
                lpAmount = amount1 / INITIAL_RATIO;
            }
        }
        
        // Calculate pool share in basis points (1/100 of a percent)
        if (totalLP > 0) {
            poolShareBasisPoints = (lpAmount * 10000) / (totalLP + lpAmount);
        } else {
            poolShareBasisPoints = 10000; // 100% for first liquidity provider
        }
        
        return (lpAmount, poolShareBasisPoints, amount0, amount1);
    }
    
    // Consolidated addLiquidity function that works with either token0 or token1 as the base
    function addLiquidity(
        address tokenA, 
        address tokenB, 
        uint256 amount,
        uint256 minLpAmount,
        bool isFromToken0
    ) external nonReentrant validateTokens(tokenA, tokenB) validateAmount(amount) returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        uint256 amount0;
        uint256 amount1;
        
        // Calculate required amounts based on which token is the base
        if (isFromToken0) {
            amount0 = amount;
            amount1 = poolContract.getRequiredAmount1(amount);
            _transferAndApproveTokens(tokenA, tokenB, pool, amount0, amount1);
            poolContract.addLiquidityFromToken0(amount0);
        } else {
            amount1 = amount;
            amount0 = poolContract.getRequiredAmount0(amount);
            _transferAndApproveTokens(tokenA, tokenB, pool, amount0, amount1);
            poolContract.addLiquidityFromToken1(amount1);
        }
        
        // Return LP tokens to the user
        lpAmount = poolContract.balanceOf(address(this));
        require(lpAmount >= minLpAmount, "INSUFFICIENT_LP_AMOUNT");
        
        poolContract.transfer(msg.sender, lpAmount);
        
        emit LiquidityAdded(pool, msg.sender, lpAmount);
        return lpAmount;
    }
    
    // Kept for backward compatibility
    function addLiquidityFromToken0(
        address tokenA, 
        address tokenB, 
        uint256 amount0,
        uint256 minLpAmount
    ) external nonReentrant validateTokens(tokenA, tokenB) validateAmount(amount0) returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Calculate amount1 required before transferring
        uint256 amount1 = poolContract.getRequiredAmount1(amount0);
        
        // Transfer tokens from user to this contract
        _transferAndApproveTokens(tokenA, tokenB, pool, amount0, amount1);
        
        // Add liquidity to the pool
        poolContract.addLiquidityFromToken0(amount0);
        
        // Return LP tokens to the user
        lpAmount = poolContract.balanceOf(address(this));
        require(lpAmount >= minLpAmount, "INSUFFICIENT_LP_AMOUNT");
        
        poolContract.transfer(msg.sender, lpAmount);
        
        emit LiquidityAdded(pool, msg.sender, lpAmount);
        return lpAmount;
    }
    
    // Kept for backward compatibility
    function addLiquidityFromToken1(
        address tokenA, 
        address tokenB, 
        uint256 amount1,
        uint256 minLpAmount
    ) external nonReentrant validateTokens(tokenA, tokenB) validateAmount(amount1) returns (uint256 lpAmount) {
        address pool = _ensurePoolExists(tokenA, tokenB);
        Pool poolContract = Pool(pool);
        
        // Calculate amount0 required before transferring
        uint256 amount0 = poolContract.getRequiredAmount0(amount1);
        
        // Transfer tokens from user to this contract
        _transferAndApproveTokens(tokenA, tokenB, pool, amount0, amount1);
        
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
    ) external nonReentrant validateTokens(tokenA, tokenB) validateAmount(lpAmount) returns (uint256 amountA, uint256 amountB) {
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
    
    // Core swap execution function that handles both direct and multi-hop swaps
    function _executeSwap(
        address[] memory path, 
        uint256 amountIn, 
        uint256 amountOutMin
    ) private returns (uint256 amountOut, uint256 totalFee) {
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
    
    // Core function to simulate path without execution
    function _simulatePath(
        address[] memory path, 
        uint256 amountIn
    ) private view returns (PathSimulationResult memory result) {
        require(path.length >= 2, "INVALID_PATH");
        
        // Initialize arrays to store intermediate values
        result.amountsOut = new uint256[](path.length);
        result.feesPerHop = new uint256[](path.length - 1);
        
        // Set initial amount
        result.amountsOut[0] = amountIn;
        result.totalFee = 0;
        
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
            result.feesPerHop[i] = feeAmount;
            currentAmount = expectedOut;
            result.amountsOut[i+1] = expectedOut;
            
            // Accumulate the fee
            result.totalFee += feeAmount;
        }
        
        result.expectedOutput = currentAmount;
        
        return result;
    }
    
    // Direct swap through a single pool
    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin
    ) external nonReentrant validateTokens(tokenIn, tokenOut) validateAmount(amountIn) returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        (amountOut,) = _executeSwap(path, amountIn, amountOutMin);
        return amountOut;
    }
    
    // Multi-hop swap with explicit path
    function swapMultiHop(
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant validatePath(path) validateAmount(amountIn) returns (uint256 amountOut, uint256 totalFee) {
        return _executeSwap(path, amountIn, amountOutMin);
    }
    
    // Preview swap result without executing
    function previewSwap(
        address[] calldata path,
        uint256 amountIn
    ) external view validatePath(path) validateAmount(amountIn) returns (
        uint256 expectedAmountOut, 
        uint256 totalFee, 
        uint256[] memory amountsOut, 
        uint256[] memory feesPerHop
    ) {
        PathSimulationResult memory result = _simulatePath(path, amountIn);
        return (
            result.expectedOutput,
            result.totalFee,
            result.amountsOut,
            result.feesPerHop
        );
    }
    
    // Kept for backward compatibility
    function previewSwapMultiHop(
        address[] calldata path,
        uint256 amountIn
    ) external view returns (uint256 expectedAmountOut, uint256 totalFee, uint256[] memory amountsOut, uint256[] memory feesPerHop) {
        PathSimulationResult memory result = _simulatePath(path, amountIn);
        return (
            result.expectedOutput,
            result.totalFee,
            result.amountsOut,
            result.feesPerHop
        );
    }
    
    // Find best route and return preview data
    function _previewSwapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 maxHops
    ) private view validateTokens(tokenIn, tokenOut) validateAmount(amountIn) validateMaxHops(maxHops) returns (
        address[] memory bestPath, 
        uint256 expectedOutput,
        uint256 totalFee,
        uint256[] memory amountsOut
    ) {
        // Get all pools from factory
        address[] memory allPools = PoolFactory(factory).getAllPools();
        
        // Find the best route with the highest output
        (bestPath, expectedOutput) = findBestRoute(tokenIn, amountIn, tokenOut, allPools, maxHops);
        
        // Ensure a valid path was found
        require(bestPath.length >= 2, "NO_ROUTE_FOUND");
        
        // Get full path simulation
        PathSimulationResult memory result = _simulatePath(bestPath, amountIn);
        
        return (bestPath, result.expectedOutput, result.totalFee, result.amountsOut);
    }
    
    // Public function to preview the result of swapWithBestRoute
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
    
    // Default version with maxHops = 4
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
    
    // Core function for swap with best route
    function _swapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        uint256 maxHops
    ) private validateTokens(tokenIn, tokenOut) validateAmount(amountIn) validateMaxHops(maxHops) returns (uint256 amountOut, address[] memory bestPath) {
        // Get all pools from factory
        address[] memory allPools = PoolFactory(factory).getAllPools();
        
        // Find the best route with the highest output
        uint256 expectedOutput;
        (bestPath, expectedOutput) = findBestRoute(tokenIn, amountIn, tokenOut, allPools, maxHops);
        
        // Ensure a valid path was found and meets minimum output
        require(bestPath.length >= 2, "NO_ROUTE_FOUND");
        require(expectedOutput >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Emit which route was selected
        emit BestRouteFound(bestPath, expectedOutput);
        
        // Execute the swap using the best path
        (amountOut,) = _executeSwap(bestPath, amountIn, amountOutMin);
        
        return (amountOut, bestPath);
    }
    
    // Public function for swap with best route
    function swapWithBestRoute(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        uint256 maxHops
    ) external nonReentrant returns (uint256 amountOut, address[] memory bestPath) {
        return _swapWithBestRoute(tokenIn, amountIn, tokenOut, amountOutMin, maxHops);
    }
    
    // Default version with maxHops = 4
    function swapWithBestRouteDefault(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut, address[] memory bestPath) {
        return _swapWithBestRoute(tokenIn, amountIn, tokenOut, amountOutMin, 4);
    }
    
    // Pool creation and management functions
    function createPool(address tokenA, address tokenB) external validateTokens(tokenA, tokenB) returns (address pool) {
        return PoolFactory(factory).createPool(tokenA, tokenB);
    }
    
    function createPoolWithFee(address tokenA, address tokenB, uint256 feeRate) external validateTokens(tokenA, tokenB) returns (address pool) {
        require(feeRate <= 10000, "Fee rate cannot exceed 100%");
        return PoolFactory(factory).createPoolWithFee(tokenA, tokenB, feeRate);
    }
    
    // Get quote for swap
    function getAmountOut(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view validateTokens(tokenIn, tokenOut) validateAmount(amountIn) returns (uint256 amountOut, uint256 feeAmount) {
        address pool = _getPool(tokenIn, tokenOut);
        require(pool != address(0), "POOL_DOES_NOT_EXIST");
        return Pool(pool).getAmountOut(tokenIn, amountIn, tokenOut);
    }
    
    // Route finding functions
    function findBestRoute(
        address tokenIn, 
        uint256 amountIn, 
        address tokenOut, 
        address[] memory pools,
        uint256 maxHops
    ) public view validateTokens(tokenIn, tokenOut) validateAmount(amountIn) validateMaxHops(maxHops) returns (address[] memory bestPath, uint256 bestAmountOut) {
        // Initialize with empty path and zero output
        bestPath = new address[](0);
        bestAmountOut = 0;
        
        // Create a RouteParams struct to reduce stack usage
        RouteParams memory params;
        params.tokenIn = tokenIn;
        params.tokenOut = tokenOut;
        params.amountIn = amountIn;
        params.bestAmountOut = 0;
        params.bestPath = new address[](0);
        
        // Check for direct route (1 hop)
        params = _checkDirectRoute(params);
        
        // Early return if maxHops is 1
        if (maxHops == 1) {
            return (params.bestPath, params.bestAmountOut);
        }
        
        // For 2 and 3-hop routes
        address[] memory intermediateTokens = findIntermediateTokens(tokenIn, tokenOut, pools);
        
        // Check 2-hop routes
        params = _checkTwoHopRoutes(params, intermediateTokens);
        
        // Check 3-hop routes if requested and possible
        if (maxHops >= 3 && intermediateTokens.length > 1) {
            params = _checkThreeHopRoutes(params, intermediateTokens);
        }
        
        return (params.bestPath, params.bestAmountOut);
    }
    
    // Helper function to check direct route
    function _checkDirectRoute(RouteParams memory params) private view returns (RouteParams memory) {
        address directPool = _getPool(params.tokenIn, params.tokenOut);
        if (directPool != address(0)) {
            bool success;
            uint256 output;
            
            try Pool(directPool).getAmountOut(params.tokenIn, params.amountIn, params.tokenOut) returns (uint256 amt, uint256) {
                output = amt;
                success = true;
            } catch {
                success = false;
            }
            
            if (success && output > 0) {
                address[] memory directPath = new address[](2);
                directPath[0] = params.tokenIn;
                directPath[1] = params.tokenOut;
                
                params.bestPath = directPath;
                params.bestAmountOut = output;
            }
        }
        
        return params;
    }
    
    // Helper function to check two-hop routes
    function _checkTwoHopRoutes(
        RouteParams memory params,
        address[] memory intermediateTokens
    ) private view returns (RouteParams memory) {
        for (uint i = 0; i < intermediateTokens.length; i++) {
            address intermediate = intermediateTokens[i];
            
            // Skip if intermediate is the same as input or output token
            if (intermediate == params.tokenIn || intermediate == params.tokenOut) continue;
            
            _checkSingleTwoHopRoute(params, intermediate);
        }
        
        return params;
    }
    
    // Helper function to check a single two-hop route
    function _checkSingleTwoHopRoute(RouteParams memory params, address intermediate) private view returns (RouteParams memory) {
        // First hop pool
        address firstHopPool = _getPool(params.tokenIn, intermediate);
        if (firstHopPool == address(0)) return params;
        
        // Second hop pool
        address secondHopPool = _getPool(intermediate, params.tokenOut);
        if (secondHopPool == address(0)) return params;
        
        // Simulate first hop
        uint256 intermediateAmount;
        bool success = true;
        
        try Pool(firstHopPool).getAmountOut(params.tokenIn, params.amountIn, intermediate) returns (uint256 output, uint256) {
            intermediateAmount = output;
        } catch {
            success = false;
        }
        
        if (!success || intermediateAmount == 0) return params;
        
        // Simulate second hop
        uint256 finalOutput;
        
        try Pool(secondHopPool).getAmountOut(intermediate, intermediateAmount, params.tokenOut) returns (uint256 output, uint256) {
            finalOutput = output;
        } catch {
            return params;
        }
        
        // Update best path if this route is better
        if (finalOutput > params.bestAmountOut) {
            address[] memory path = new address[](3);
            path[0] = params.tokenIn;
            path[1] = intermediate;
            path[2] = params.tokenOut;
            
            params.bestPath = path;
            params.bestAmountOut = finalOutput;
        }
        
        return params;
    }
    
    // Helper function to check three-hop routes
    function _checkThreeHopRoutes(
        RouteParams memory params,
        address[] memory intermediateTokens
    ) private view returns (RouteParams memory) {
        for (uint i = 0; i < intermediateTokens.length; i++) {
            address intermediate1 = intermediateTokens[i];
            
            // Skip if intermediate is the same as input/output
            if (intermediate1 == params.tokenIn || intermediate1 == params.tokenOut) continue;
            
            for (uint j = 0; j < intermediateTokens.length; j++) {
                if (i == j) continue; // Skip same intermediate
                
                address intermediate2 = intermediateTokens[j];
                
                // Skip invalid combinations
                if (intermediate2 == params.tokenIn || intermediate2 == params.tokenOut || intermediate2 == intermediate1) continue;
                
                params = _checkSingleThreeHopRoute(params, intermediate1, intermediate2);
            }
        }
        
        return params;
    }
    
    // Helper function to check a single three-hop route
    function _checkSingleThreeHopRoute(
        RouteParams memory params,
        address intermediate1,
        address intermediate2
    ) private view returns (RouteParams memory) {
        // Check if pools exist for this path
        address pool1 = _getPool(params.tokenIn, intermediate1);
        address pool2 = _getPool(intermediate1, intermediate2);
        address pool3 = _getPool(intermediate2, params.tokenOut);
        
        if (pool1 == address(0) || pool2 == address(0) || pool3 == address(0)) {
            return params;
        }
        
        // Simulate first hop
        uint256 firstHopOutput;
        
        try Pool(pool1).getAmountOut(params.tokenIn, params.amountIn, intermediate1) returns (uint256 output, uint256) {
            firstHopOutput = output;
        } catch {
            return params;
        }
        
        if (firstHopOutput == 0) return params;
        
        // Simulate second hop
        uint256 secondHopOutput;
        
        try Pool(pool2).getAmountOut(intermediate1, firstHopOutput, intermediate2) returns (uint256 output, uint256) {
            secondHopOutput = output;
        } catch {
            return params;
        }
        
        if (secondHopOutput == 0) return params;
        
        // Simulate third hop
        uint256 finalOutput;
        
        try Pool(pool3).getAmountOut(intermediate2, secondHopOutput, params.tokenOut) returns (uint256 output, uint256) {
            finalOutput = output;
        } catch {
            return params;
        }
        
        // Update best path if this route is better
        if (finalOutput > params.bestAmountOut) {
            address[] memory path = new address[](4);
            path[0] = params.tokenIn;
            path[1] = intermediate1;
            path[2] = intermediate2;
            path[3] = params.tokenOut;
            
            params.bestPath = path;
            params.bestAmountOut = finalOutput;
        }
        
        return params;
    }
    
    // Helper function to find intermediate tokens for routing
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
                    // Add if not a duplicate
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
        
        // Create correctly sized array
        address[] memory result = new address[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = intermediates[i];
        }
        
        return result;
    }
    
    // Fee claiming functions
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
    
    // Preview fees to be claimed
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