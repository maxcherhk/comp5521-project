// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

contract Pool is LPToken, ReentrancyGuard {
    IERC20 immutable i_token0;
    IERC20 immutable i_token1;

    // Factory that created this pool
    address public factory;

    uint256 constant INITIAL_RATIO = 2; //token0:token1 = 1:2

    // Fee is in basis points (10000 = 100%)
    uint256 public feeRate = 0; // 0% fee by default
    address public feeAdmin;

    // Track accumulated fees for each token
    uint256 public accumulatedFees0;
    uint256 public accumulatedFees1;
    
    // Track fee per share values
    uint256 public feePerShare0;
    uint256 public feePerShare1;
    uint256 private constant FEE_PRECISION = 1e18;
    
    // Track claimed fees for each user
    mapping(address => uint256) public userFeeDebt0;
    mapping(address => uint256) public userFeeDebt1;
    
    mapping(address => uint256) public tokenBalances; // Now public

    event AddedLiquidity(
        uint256 indexed lpToken,
        address token0,
        uint256 indexed amount0,
        address token1,
        uint256 indexed amount1
    );

    event Swapped(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );

    // Added event for pool creation
    event PoolCreated(
        address token0,
        address token1,
        address factory,
        address feeAdmin,
        uint256 initialFeeRate
    );

    constructor(address _token0, address _token1, uint256 _initialFeeRate) LPToken(
        string(abi.encodePacked("LP-", ERC20(_token0).symbol(), "-", ERC20(_token1).symbol())),
        string(abi.encodePacked("LP-", ERC20(_token0).symbol(), "-", ERC20(_token1).symbol()))
    ) {
        // Add validation for token addresses
        require(_token0 != address(0) && _token1 != address(0), "Zero address");
        require(_token0 != _token1, "Same token");
        
        // Validate fee rate
        require(_initialFeeRate <= 10000, "Fee rate cannot exceed 100%");
        feeRate = _initialFeeRate;
        
        // Store factory address that created this pool
        factory = msg.sender;
        
        // Ensure the tokens are in the correct order
        (address tokenA, address tokenB) = _token0 < _token1 ? (_token0, _token1) : (_token1, _token0);
        
        i_token0 = IERC20(tokenA);
        i_token1 = IERC20(tokenB);

        // Get fee admin from factory
        feeAdmin = IPoolFactory(factory).feeAdmin();
        
        // Emit pool created event
        emit PoolCreated(tokenA, tokenB, factory, feeAdmin, _initialFeeRate);
    }

    // Add accessor functions to replace the redundant immutable address variables
    function token0() public view returns (address) {
        return address(i_token0);
    }

    function token1() public view returns (address) {
        return address(i_token1);
    }

    function getAmountIn(
        address tokenIn,
        uint256 amountOut,
        address tokenOut
    ) public view returns (uint256 amountIn, uint256 feeAmount) {
        uint256 balanceIn = tokenBalances[tokenIn];
        uint256 balanceOut = tokenBalances[tokenOut];

        require(balanceOut > amountOut, "Insufficient output reserve");
        require(balanceIn > 0 && balanceOut > 0, "Insufficient liquidity");

        // Avoid overflow: denominator must not be zero
        uint256 numerator = balanceIn * amountOut;
        uint256 denominator = balanceOut - amountOut;

        amountIn = numerator / denominator;

        // Apply fee
        feeAmount = (amountIn * feeRate) / 10000;
        amountIn += feeAmount;

        return (amountIn, feeAmount);
    }
    
    function getAmountOut(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) public view returns (uint256 amountOut, uint256 feeAmount) {
        uint256 balanceOut = tokenBalances[tokenOut];
        uint256 balanceIn = tokenBalances[tokenIn];
        
        // Fix division by zero vulnerability
        require(balanceIn > 0, "Insufficient liquidity");
        require(balanceOut > 0, "Insufficient liquidity");

        // Calculate the fee amount explicitly
        feeAmount = (amountIn * feeRate) / 10000;
        uint256 amountInWithFee = amountIn - feeAmount;
        
        // Calculate output amount with the reduced input (after fee)
        amountOut = (balanceOut * amountInWithFee) / (balanceIn + amountInWithFee);

        return (amountOut, feeAmount);
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) public nonReentrant {
        // input validity checks
        require(tokenIn != tokenOut, "Same tokens");
        require(
            tokenIn == token0() || tokenIn == token1(),
            "Invalid input token"
        );
        require(
            tokenOut == token0() || tokenOut == token1(),
            "Invalid output token"
        );
        require(amountIn > 0, "Zero amount");

        // Get both the output amount and fee amount in one call
        (uint256 amountOut, uint256 feeAmount) = getAmountOut(tokenIn, amountIn, tokenOut);
        uint256 amountInAfterFee = amountIn - feeAmount;

        // First transfer tokens from the user
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Transfer of input token failed"
        );
        
        // Then transfer tokens to the user
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Transfer of output token failed"
        );

        // Finally update the state
        // Accumulate fees for distribution to liquidity providers
        if (tokenIn == token0()) {
            accumulatedFees0 += feeAmount;
            // Update fee per share if there are LP tokens outstanding
            if (totalSupply() > 0) {
                feePerShare0 += (feeAmount * FEE_PRECISION) / totalSupply();
            }
        } else {
            accumulatedFees1 += feeAmount;
            // Update fee per share if there are LP tokens outstanding
            if (totalSupply() > 0) {
                feePerShare1 += (feeAmount * FEE_PRECISION) / totalSupply();
            }
        }

        // update pool balances (now considering only the amount after fee for pool calculations)
        tokenBalances[tokenIn] += amountInAfterFee;
        tokenBalances[tokenOut] -= amountOut;

        emit Swapped(msg.sender, tokenIn, amountIn, tokenOut, amountOut, feeAmount, block.timestamp);
    }

    function getLPBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    function getUserLiquidityPosition(address user) external view returns (uint256 amount0, uint256 amount1) {
        uint256 lpBalance = balanceOf(user);
        if (lpBalance == 0 || totalSupply() == 0) {
            return (0, 0);
        }
        
        // Calculate the proportion of the pool the user owns
        uint256 totalLP = totalSupply();
        amount0 = (lpBalance * tokenBalances[token0()]) / totalLP;
        amount1 = (lpBalance * tokenBalances[token1()]) / totalLP;
        
        return (amount0, amount1);
    }

    function getUserPoolShare(address user) external view returns (uint256) {
        uint256 lpBalance = balanceOf(user);
        uint256 totalLP = totalSupply();
        
        if (totalLP == 0) {
            return 0;
        }
        
        // Return user's share in basis points (1/100 of a percent)
        return (lpBalance * 10000) / totalLP;
    }

    // Updated function for liquidity providers to claim their share of fees
    function claimFees() external nonReentrant returns (uint256 fee0, uint256 fee1) {
        uint256 userLpBalance = balanceOf(msg.sender);
        require(userLpBalance > 0, "No LP tokens");

        uint256 pendingFee0 = (userLpBalance * feePerShare0) / FEE_PRECISION - userFeeDebt0[msg.sender];
        uint256 pendingFee1 = (userLpBalance * feePerShare1) / FEE_PRECISION - userFeeDebt1[msg.sender];

        if (pendingFee0 > 0) {
            require(i_token0.transfer(msg.sender, pendingFee0), "Transfer of token0 failed");
            accumulatedFees0 = accumulatedFees0 > pendingFee0 ? accumulatedFees0 - pendingFee0 : 0;
        }
        
        if (pendingFee1 > 0) {
            require(i_token1.transfer(msg.sender, pendingFee1), "Transfer of token1 failed");
            accumulatedFees1 = accumulatedFees1 > pendingFee1 ? accumulatedFees1 - pendingFee1 : 0;
        }

        // Update user's fee debt
        userFeeDebt0[msg.sender] = (userLpBalance * feePerShare0) / FEE_PRECISION;
        userFeeDebt1[msg.sender] = (userLpBalance * feePerShare1) / FEE_PRECISION;

        emit FeesCollected(msg.sender, pendingFee0, pendingFee1);
        return (pendingFee0, pendingFee1);
    }

    // Updated function to claim fees on behalf of a specified user
    function claimFeesForUser(address user) external nonReentrant returns (uint256 fee0, uint256 fee1) {
        // Verify that msg.sender is an authorized router
        require(msg.sender == factory || IPoolFactory(factory).isAuthorizedRouter(msg.sender), "Unauthorized");
        
        uint256 userLpBalance = balanceOf(user);
        require(userLpBalance > 0, "No LP tokens");

        uint256 pendingFee0 = (userLpBalance * feePerShare0) / FEE_PRECISION - userFeeDebt0[user];
        uint256 pendingFee1 = (userLpBalance * feePerShare1) / FEE_PRECISION - userFeeDebt1[user];

        if (pendingFee0 > 0) {
            require(i_token0.transfer(user, pendingFee0), "Transfer of token0 failed");
            accumulatedFees0 = accumulatedFees0 > pendingFee0 ? accumulatedFees0 - pendingFee0 : 0;
        }
        
        if (pendingFee1 > 0) {
            require(i_token1.transfer(user, pendingFee1), "Transfer of token1 failed");
            accumulatedFees1 = accumulatedFees1 > pendingFee1 ? accumulatedFees1 - pendingFee1 : 0;
        }

        // Update user's fee debt
        userFeeDebt0[user] = (userLpBalance * feePerShare0) / FEE_PRECISION;
        userFeeDebt1[user] = (userLpBalance * feePerShare1) / FEE_PRECISION;

        emit FeesCollected(user, pendingFee0, pendingFee1);
        return (pendingFee0, pendingFee1);
    }

    function getPendingFees(address user) external view returns (uint256 pendingFee0, uint256 pendingFee1) {
        uint256 userLpBalance = balanceOf(user);
        if (userLpBalance == 0) return (0, 0);
        
        pendingFee0 = (userLpBalance * feePerShare0) / FEE_PRECISION - userFeeDebt0[user];
        pendingFee1 = (userLpBalance * feePerShare1) / FEE_PRECISION - userFeeDebt1[user];
        
        return (pendingFee0, pendingFee1);
    }
    
    // Replace the non-override functions with a new approach
    // Override transfer function to handle fee debt updates
    function transfer(address to, uint256 amount) public override returns (bool) {
        _updateFeesOnTransfer(msg.sender, to, amount);
        return super.transfer(to, amount);
    }
    
    // Override transferFrom function to handle fee debt updates
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _updateFeesOnTransfer(from, to, amount);
        return super.transferFrom(from, to, amount);
    }
    
    // Helper function to update fee debts during transfers
    function _updateFeesOnTransfer(address from, address to, uint256 amount) internal {
        if (amount > 0) {
            // Update sender's fee debt
            userFeeDebt0[from] -= (amount * feePerShare0) / FEE_PRECISION;
            userFeeDebt1[from] -= (amount * feePerShare1) / FEE_PRECISION;
            
            // Update receiver's fee debt
            userFeeDebt0[to] += (amount * feePerShare0) / FEE_PRECISION;
            userFeeDebt1[to] += (amount * feePerShare1) / FEE_PRECISION;
        }
    }
    
    // Update fee debt when minting LP tokens
    function _mintWithFeeUpdate(address to, uint256 amount) internal {
        if (amount > 0) {
            userFeeDebt0[to] += (amount * feePerShare0) / FEE_PRECISION;
            userFeeDebt1[to] += (amount * feePerShare1) / FEE_PRECISION;
        }
        _mint(to, amount);
    }
    
    // Update fee debt when burning LP tokens
    function _burnWithFeeUpdate(address from, uint256 amount) internal {
        if (amount > 0) {
            userFeeDebt0[from] -= (amount * feePerShare0) / FEE_PRECISION;
            userFeeDebt1[from] -= (amount * feePerShare1) / FEE_PRECISION;
        }
        _burn(from, amount);
    }

    function addLiquidityFromToken0(uint256 amount0) public nonReentrant {
        // input validity check
        require(amount0 > 0, "Amount must be greater than 0");

        // calculate the required amount of token1
        uint256 amount1 = getRequiredAmount1(amount0);
        
        // calculate liquidity tokens to mint
        uint256 amountLP;
        if (totalSupply() > 0) {
            amountLP =
                (amount0 * totalSupply()) /
                tokenBalances[token0()];
        } else {
            amountLP = amount0;
        }
        
        // First perform the token transfers
        require(
            i_token0.transferFrom(msg.sender, address(this), amount0),
            "Transfer of token0 failed"
        );
        
        require(
            i_token1.transferFrom(msg.sender, address(this), amount1),
            "Transfer of token1 failed"
        );
        
        // Then update state variables after successful transfers
        tokenBalances[token0()] += amount0;
        tokenBalances[token1()] += amount1;
        
        // Finally mint LP tokens
        _mintWithFeeUpdate(msg.sender, amountLP);

        emit AddedLiquidity(
            amountLP,
            token0(),
            amount0,
            token1(),
            amount1
        );
    }

    function addLiquidityFromToken1(uint256 amount1) public nonReentrant {
        // input validity check
        require(amount1 > 0, "Amount must be greater than 0");

        // calculate the required amount of token0
        uint256 amount0 = getRequiredAmount0(amount1);
        
        // calculate liquidity tokens to mint
        uint256 amountLP;
        if (totalSupply() > 0) {
            amountLP =
                (amount1 * totalSupply()) /
                tokenBalances[token1()];
        } else {
            amountLP = amount1 / INITIAL_RATIO; // Adjusted for initial ratio
        }
        
        // First perform the token transfers
        require(
            i_token1.transferFrom(msg.sender, address(this), amount1),
            "Transfer of token1 failed"
        );
        
        require(
            i_token0.transferFrom(msg.sender, address(this), amount0),
            "Transfer of token0 failed"
        );
        
        // Then update state variables after successful transfers
        tokenBalances[token1()] += amount1;
        tokenBalances[token0()] += amount0;
        
        // Finally mint LP tokens
        _mintWithFeeUpdate(msg.sender, amountLP);

        emit AddedLiquidity(
            amountLP,
            token0(),
            amount0,
            token1(),
            amount1
        );
    }

    function getRequiredAmount0(uint256 amount1) public view returns (uint256) {
        uint256 balance0 = tokenBalances[token0()];
        uint256 balance1 = tokenBalances[token1()];

        if (balance0 == 0 || balance1 == 0) {
            return amount1 / INITIAL_RATIO; // Initial ratio is token0:token1 = 1:2
        }
        return (amount1 * balance0) / balance1;
    }
    
    function getRequiredAmount1(uint256 amount0) public view returns (uint256) {
        uint256 balance0 = tokenBalances[token0()];
        uint256 balance1 = tokenBalances[token1()];

        if (balance0 == 0 || balance1 == 0) {
            return amount0 * INITIAL_RATIO;
        }
        return (amount0 * balance1) / balance0;
    }

    function withdrawLiquidity(uint256 lpAmount) public nonReentrant {
        // Input validity check
        require(lpAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP tokens");

        // Calculate the proportional amounts of token0 and token1 to withdraw
        uint256 totalLP = totalSupply();
        uint256 amount0 = (lpAmount * tokenBalances[token0()]) / totalLP;
        uint256 amount1 = (lpAmount * tokenBalances[token1()]) / totalLP;

        // First burn the LP tokens to prevent reentrancy
        _burnWithFeeUpdate(msg.sender, lpAmount);
        
        // Update pool balances
        tokenBalances[token0()] -= amount0;
        tokenBalances[token1()] -= amount1;

        // Finally transfer tokens back to the user
        require(
            i_token0.transfer(msg.sender, amount0),
            "Transfer of token0 failed"
        );
        require(
            i_token1.transfer(msg.sender, amount1),
            "Transfer of token1 failed"
        );

        // Emit an event for the withdrawal
        emit RemovedLiquidity(
            lpAmount,
            token0(),
            amount0,
            token1(),
            amount1
        );
    }

    function previewWithdraw(uint256 lpAmount) public view returns (uint256 amount0, uint256 amount1) {
        require(lpAmount > 0, "Amount must be greater than 0");
        
        uint256 totalLP = totalSupply();
        amount0 = (lpAmount * tokenBalances[token0()]) / totalLP;
        amount1 = (lpAmount * tokenBalances[token1()]) / totalLP;
        
        return (amount0, amount1);
    }
    
    function getReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = tokenBalances[token0()];
        reserve1 = tokenBalances[token1()];
        return (reserve0, reserve1);
    }
    // Add the event for liquidity removal
    event RemovedLiquidity(
        uint256 indexed lpToken,
        address token0,
        uint256 indexed amount0,
        address token1,
        uint256 indexed amount1
    );

    // Update fee rate (only fee admin can call)
    function setFeeRate(uint256 _feeRate) external {
        require(msg.sender == feeAdmin, "Only fee admin can update fee rate");
        require(_feeRate <= 10000, "Fee rate cannot exceed 100%"); // Max 100% fee as safety measure
        feeRate = _feeRate;
        emit FeeRateUpdated(_feeRate);
    }
    
    // Transfer fee admin role to a new address
    function setFeeAdmin(address _newAdmin) external {
        require(msg.sender == feeAdmin, "Only fee admin can transfer role");
        require(_newAdmin != address(0), "New admin cannot be zero address");
        feeAdmin = _newAdmin;
        emit FeeAdminUpdated(_newAdmin);
    }

    function getFeeRate() external view returns (uint256) {
        return feeRate;
    }

    function getFeeAdmin() external view returns (address) {
        return feeAdmin;
    }

    event FeesCollected(address indexed user, uint256 amount0, uint256 amount1);
    event FeeRateUpdated(uint256 newFeeRate);
    event FeeAdminUpdated(address newFeeAdmin);
}

// Interface for the PoolFactory
interface IPoolFactory {
    function feeAdmin() external view returns (address);
    function isAuthorizedRouter(address router) external view returns (bool);
}
