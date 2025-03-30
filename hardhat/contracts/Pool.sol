// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

contract Pool is LPToken, ReentrancyGuard {
    IERC20 immutable i_token0;
    IERC20 immutable i_token1;

    address immutable i_token0_address;
    address immutable i_token1_address;

    uint256 constant INITIAL_RATIO = 2; //token0:token1 = 1:2

    // Fee is in basis points (10000 = 100%)
    uint256 public feeRate = 0; // 0% fee by default
    address public feeAdmin;

    mapping(address => uint256) tokenBalances;

    event AddedLiquidity(
        uint256 indexed lpToken,
        address token0,
        uint256 indexed amount0,
        address token1,
        uint256 indexed amount1
    );

    event Swapped(
        address tokenIn,
        uint256 indexed amountIn,
        address tokenOut,
        uint256 indexed amountOut
    );

    constructor(address token0, address token1) LPToken("LPToken", "LPT") {
        i_token0 = IERC20(token0);
        i_token1 = IERC20(token1);

        i_token0_address = token0;
        i_token1_address = token1;

         feeAdmin = msg.sender; // Set deployer as fee admin
    }

    function getAmountOut(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) public view returns (uint256) {
        uint256 balanceOut = tokenBalances[tokenOut];
        uint256 balanceIn = tokenBalances[tokenIn];

        // Apply fee to the input amount
        uint256 amountInWithFee = amountIn * (10000 - feeRate) / 10000;
        
        // Calculate output amount with the reduced input (after fee)
        uint256 amountOut = (balanceOut * amountInWithFee) / (balanceIn + amountInWithFee);

        return amountOut;
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) public nonReentrant {
        // input validity checks
        require(tokenIn != tokenOut, "Same tokens");
        require(
            tokenIn == i_token0_address || tokenIn == i_token1_address,
            "Invalid token"
        );
        require(
            tokenOut == i_token0_address || tokenOut == i_token1_address,
            "Invalid token"
        );
        require(amountIn > 0, "Zero amount");

        uint256 amountOut = getAmountOut(tokenIn, amountIn, tokenOut);

        // swapping tokens
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Swap Failed"
        );
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Swap Failed"
        );

        // update pool balances
        tokenBalances[tokenIn] += amountIn;
        tokenBalances[tokenOut] -= amountOut;

        emit Swapped(tokenIn, amountIn, tokenOut, amountOut);
    }

    function addLiquidity(uint256 amount0) public nonReentrant {
        // input validity check
        require(amount0 > 0, "Amount must be greater than 0");

        // calculate and mint liquidity tokens
        uint256 amount1 = getRequiredAmount1(amount0);
        uint256 amountLP;
        if (totalSupply() > 0) {
            amountLP =
                (amount0 * totalSupply()) /
                tokenBalances[i_token0_address];
        } else {
            amountLP = amount0;
        }
        _mint(msg.sender, amountLP);

        // deposit token0
        require(
            i_token0.transferFrom(msg.sender, address(this), amount0),
            "Transfer Alpha failed"
        );
        tokenBalances[i_token0_address] += amount0;

        // deposit token1
        require(
            i_token1.transferFrom(msg.sender, address(this), amount1),
            "Transfer Beta failed"
        );
        tokenBalances[i_token1_address] += amount1;

        emit AddedLiquidity(
            amountLP,
            i_token0_address,
            amount0,
            i_token1_address,
            amount1
        );
    }

    function getRequiredAmount1(uint256 amount0) public view returns (uint256) {
        uint256 balance0 = tokenBalances[i_token0_address];
        uint256 balance1 = tokenBalances[i_token1_address];

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
        uint256 amount0 = (lpAmount * tokenBalances[i_token0_address]) /
            totalLP;
        uint256 amount1 = (lpAmount * tokenBalances[i_token1_address]) /
            totalLP;

        // Burn the LP tokens
        _burn(msg.sender, lpAmount);

        // Update pool balances
        tokenBalances[i_token0_address] -= amount0;
        tokenBalances[i_token1_address] -= amount1;

        // Transfer tokens back to the user
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
            i_token0_address,
            amount0,
            i_token1_address,
            amount1
        );
    }

    function getReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = tokenBalances[i_token0_address];
        reserve1 = tokenBalances[i_token1_address];
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
        require(_feeRate <= 100, "Fee rate cannot exceed 1%"); // Max 1% fee as safety measure
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
    
    // Add new events
    event FeeRateUpdated(uint256 newFeeRate);
    event FeeAdminUpdated(address newFeeAdmin);

}
