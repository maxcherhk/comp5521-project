
# Router Contract Interface

## Liquidity Management

### `previewAddLiquidity(address tokenA, address tokenB, uint256 amount, bool isFromToken0)`
- **Description**: Previews the expected LP tokens and pool share before adding liquidity
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `amount`: Amount of token to add (either token0 or token1 based on `isFromToken0`)
  - `isFromToken0`: Whether `amount` is for token0 (`true`) or token1 (`false`)
- **Returns**: `(uint256 lpAmount, uint256 poolShareBasisPoints, uint256 amount0, uint256 amount1)`

### `addLiquidity(address tokenA, address tokenB, uint256 amount, uint256 minLpAmount, bool isFromToken0)`
- **Description**: Adds liquidity to a pool using either token0 or token1 as the base
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `amount`: Amount of token to add
  - `minLpAmount`: Minimum LP tokens to receive (slippage protection)
  - `isFromToken0`: Whether `amount` is for token0 (`true`) or token1 (`false`)
- **Returns**: `uint256 lpAmount`

### `addLiquidityFromToken0(address tokenA, address tokenB, uint256 amount0, uint256 minLpAmount)`
- **Description**: Adds liquidity to a pool using token0 as the base
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `amount0`: Amount of token0 to add
  - `minLpAmount`: Minimum LP tokens to receive
- **Returns**: `uint256 lpAmount`

### `addLiquidityFromToken1(address tokenA, address tokenB, uint256 amount1, uint256 minLpAmount)`
- **Description**: Adds liquidity to a pool using token1 as the base
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `amount1`: Amount of token1 to add
  - `minLpAmount`: Minimum LP tokens to receive
- **Returns**: `uint256 lpAmount`

### `withdrawLiquidity(address tokenA, address tokenB, uint256 lpAmount, uint256 minAmountA, uint256 minAmountB)`
- **Description**: Withdraws liquidity from a pool
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `lpAmount`: Amount of LP tokens to withdraw
  - `minAmountA`: Minimum amount of tokenA to receive
  - `minAmountB`: Minimum amount of tokenB to receive
- **Returns**: `(uint256 amountA, uint256 amountB)`

## Swapping

### `swap(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOutMin)`
- **Description**: Swaps tokens through a single pool
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
  - `amountOutMin`: Minimum output amount (slippage protection)
- **Returns**: `uint256 amountOut`

### `swapMultiHop(address[] path, uint256 amountIn, uint256 amountOutMin)`
- **Description**: Swaps tokens through multiple pools with an explicit path
- **Parameters**:
  - `path`: Array of token addresses defining the swap path
  - `amountIn`: Amount of input token
  - `amountOutMin`: Minimum output amount
- **Returns**: `(uint256 amountOut, uint256 totalFee)`

### `swapWithBestRoute(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOutMin, uint256 maxHops)`
- **Description**: Automatically finds and executes the best swap route
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
  - `amountOutMin`: Minimum output amount
  - `maxHops`: Maximum number of hops (1-4)
- **Returns**: `(uint256 amountOut, address[] bestPath)`

### `swapWithBestRouteDefault(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOutMin)`
- **Description**: Same as `swapWithBestRoute` but with default max hops (4)
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
  - `amountOutMin`: Minimum output amount
- **Returns**: `(uint256 amountOut, address[] bestPath)`

## Preview & Quotes

### `previewSwap(address[] path, uint256 amountIn)`
- **Description**: Previews the result of a swap without executing it
- **Parameters**:
  - `path`: Array of token addresses defining the swap path
  - `amountIn`: Amount of input token
- **Returns**: `(uint256 expectedAmountOut, uint256 totalFee, uint256[] amountsOut, uint256[] feesPerHop)`

### `previewSwapMultiHop(address[] path, uint256 amountIn)`
- **Description**: Same as `previewSwap`, kept for backward compatibility
- **Parameters**:
  - `path`: Array of token addresses defining the swap path
  - `amountIn`: Amount of input token
- **Returns**: `(uint256 expectedAmountOut, uint256 totalFee, uint256[] amountsOut, uint256[] feesPerHop)`

### `previewSwapWithBestRoute(address tokenIn, uint256 amountIn, address tokenOut, uint256 maxHops)`
- **Description**: Previews the best route for a swap
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
  - `maxHops`: Maximum number of hops (1-4)
- **Returns**: `(address[] bestPath, uint256 expectedOutput, uint256 totalFee, uint256[] amountsOut)`

### `previewSwapWithBestRouteDefault(address tokenIn, uint256 amountIn, address tokenOut)`
- **Description**: Same as `previewSwapWithBestRoute` but with default max hops (4)
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
- **Returns**: `(address[] bestPath, uint256 expectedOutput, uint256 totalFee, uint256[] amountsOut)`

### `getAmountOut(address tokenIn, uint256 amountIn, address tokenOut)`
- **Description**: Gets quote for a direct swap between two tokens
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
- **Returns**: `(uint256 amountOut, uint256 feeAmount)`

## Route Finding

### `findBestRoute(address tokenIn, uint256 amountIn, address tokenOut, address[] pools, uint256 maxHops)`
- **Description**: Finds the best route for a swap with highest output
- **Parameters**:
  - `tokenIn`: Address of input token
  - `amountIn`: Amount of input token
  - `tokenOut`: Address of output token
  - `pools`: Array of pool addresses to consider
  - `maxHops`: Maximum number of hops (1-4)
- **Returns**: `(address[] bestPath, uint256 bestAmountOut)`

## Pool Management

### `createPool(address tokenA, address tokenB)`
- **Description**: Creates a new pool for a token pair
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
- **Returns**: `address pool`

### `createPoolWithFee(address tokenA, address tokenB, uint256 feeRate)`
- **Description**: Creates a new pool with a custom fee rate
- **Parameters**:
  - `tokenA`: First token address
  - `tokenB`: Second token address
  - `feeRate`: Fee rate in basis points (0-10000)
- **Returns**: `address pool`

## Fee Claiming

### `claimFeesFromPools(address[][] tokenPairs)`
- **Description**: Claims accumulated fees from multiple pools
- **Parameters**:
  - `tokenPairs`: Array of token pair arrays `[[tokenA1, tokenB1], [tokenA2, tokenB2], ...]`
- **Returns**: `ClaimResult[] results` (Array of claim results with pool, token, and fee info)

### `getPendingFeesFromPools(address[][] tokenPairs, address user)`
- **Description**: Gets pending fees from multiple pools for a user
- **Parameters**:
  - `tokenPairs`: Array of token pair arrays
  - `user`: Address of the user to check fees for
- **Returns**: `ClaimResult[] results` (Array of pending fees with pool, token, and fee info)
