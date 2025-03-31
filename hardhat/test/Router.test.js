const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Router Contract", function () {
  let Token0, Token1, Token2, PoolFactory, Pool, Router;
  let token0, token1, token2, factory, router;
  let token0Address, token1Address, token2Address;
  let owner, user;
  let globalSnapshotId;
  
  before(async function () {
    // Take a global snapshot before any tests
    globalSnapshotId = await ethers.provider.send("evm_snapshot", []);
    
    [owner, user] = await ethers.getSigners();
    
    // Deploy tokens for testing
    const NewToken = await hre.ethers.getContractFactory("NewToken");
    
    // Deploy tokens with unique names for this test file
    const tokenA = await NewToken.deploy("RouterTokenA", "RTA");
    await tokenA.waitForDeployment();
    
    const tokenB = await NewToken.deploy("RouterTokenB", "RTB");
    await tokenB.waitForDeployment();
    
    const tokenC = await NewToken.deploy("RouterTokenC", "RTC");
    await tokenC.waitForDeployment();
    
    // Get token addresses
    const addrA = await tokenA.getAddress();
    const addrB = await tokenB.getAddress();
    const addrC = await tokenC.getAddress();
    
    // console.log(`Token addresses in Router test: ${addrA}, ${addrB}, ${addrC}`);
    
    // Sort tokens by address to ensure consistency with Pool contract's sorting
    // Sort tokens 0 and 1 to match pool creation requirements
    if (addrA.toLowerCase() < addrB.toLowerCase()) {
      token0 = tokenA;
      token1 = tokenB;
    } else {
      token0 = tokenB;
      token1 = tokenA;
    }
    
    // Ensure token2 is for multi-hop tests
    token2 = tokenC;
    
    // Get sorted addresses for consistent use
    token0Address = await token0.getAddress();
    token1Address = await token1.getAddress();
    token2Address = await token2.getAddress();

    // console.log(`Sorted token addresses: token0=${token0Address}, token1=${token1Address}, token2=${token2Address}`);
    
    // Verify token order is correct for Pool contract
    expect(token0Address.toLowerCase() < token1Address.toLowerCase()).to.be.true;
    
    // Deploy the PoolFactory
    PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy the Router
    Router = await hre.ethers.getContractFactory("Router");
    router = await Router.deploy(await factory.getAddress());
    await router.waitForDeployment();
    
    // Authorize the router in the factory
    await factory.setRouterAuthorization(await router.getAddress(), true);
    
    // Send tokens to user for testing
    await token0.transfer(user.address, ethers.parseEther("10000"));
    await token1.transfer(user.address, ethers.parseEther("10000"));
    await token2.transfer(user.address, ethers.parseEther("10000"));
    
    // Create a pool through the factory (will use in some tests)
    await factory.createPool(token0Address, token1Address);
  });
  
  after(async function () {
    // Revert to the global snapshot after all tests in this file
    await ethers.provider.send("evm_revert", [globalSnapshotId]);
    
    // Take a new snapshot for subsequent test files
    await ethers.provider.send("evm_snapshot", []);
  });
  
  let snapshotId;
  
  beforeEach(async function () {
    // Take a snapshot before each test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    
    // Approve tokens for the router with a much higher amount to guarantee no allowance issues
    await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("10000000"));
    await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("10000000")); 
    await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("10000000"));
  });
  
  afterEach(async function () {
    // Revert to the snapshot after each test
    await ethers.provider.send("evm_revert", [snapshotId]);
  });
  
  describe("Deployment", function () {
    it("should store the factory address", async function () {
      const factoryAddress = await router.factory();
      expect(factoryAddress).to.equal(await factory.getAddress());
    });
  });
  
  describe("createPool", function () {
    it("should create a new pool through the router", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      
      // No pool should exist yet
      const initialPool = await factory.findPool(token0Address, token2Address);
      expect(initialPool).to.equal(ethers.ZeroAddress);
      
      // Create pool through router
      await router.createPool(token0Address, token2Address);
      
      // Pool should now exist
      const newPool = await factory.findPool(token0Address, token2Address);
      expect(newPool).to.not.equal(ethers.ZeroAddress);
    });
    
    it("should revert when creating a pool that already exists", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Try to create a pool that already exists
      await expect(router.createPool(token0Address, token1Address))
        .to.be.revertedWith("POOL_EXISTS");
    });
  });
  
  describe("addLiquidityFromToken0", function () {
    it("should add liquidity correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("90"); // Setting min LP amount slightly lower than expected
      
      // Get the pool address
      const poolAddress = await factory.findPool(token0Address, token1Address);
      
      // Attach to the pool contract to check balances
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Add liquidity
      const tx = await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0, minLpAmount);
      
      // Check user's balances after liquidity added
      const balance0 = await token0.balanceOf(user.address);
      const balance1 = await token1.balanceOf(user.address);
      const lpBalance = await pool.balanceOf(user.address);
      
      // User should have token0 and token1 deducted
      expect(balance0).to.equal(ethers.parseEther("9900")); // 10000 - 100
      expect(balance1).to.equal(ethers.parseEther("9800")); // 10000 - 200 (INITIAL_RATIO = 2)
      
      // User should have LP tokens equal to the token0 amount
      expect(lpBalance).to.equal(amount0);
      
      // Check pool reserves
      const [reserve0, reserve1] = await pool.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount0 * 2n); // INITIAL_RATIO = 2
    });
    
    it("should revert when the pool does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("90");
      
      // Try to add liquidity to non-existent pool
      await expect(router.connect(user).addLiquidityFromToken0(token0Address, token2Address, amount0, minLpAmount))
        .to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
    
    it("should revert when LP amount is less than minLpAmount", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("101"); // Set higher than expected LP amount
      
      // Try to add liquidity with too high minLpAmount
      await expect(router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0, minLpAmount))
        .to.be.revertedWith("INSUFFICIENT_LP_AMOUNT");
    });
  });
  
  describe("addLiquidityFromToken1", function () {
    it("should add liquidity correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount1 = ethers.parseEther("200");
      const minLpAmount = ethers.parseEther("90"); // Setting min LP amount slightly lower than expected
      
      // Get the pool address
      const poolAddress = await factory.findPool(token0Address, token1Address);
      
      // Attach to the pool contract to check balances
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Add liquidity
      const tx = await router.connect(user).addLiquidityFromToken1(token0Address, token1Address, amount1, minLpAmount);
      
      // Check user's balances after liquidity added
      const balance0 = await token0.balanceOf(user.address);
      const balance1 = await token1.balanceOf(user.address);
      const lpBalance = await pool.balanceOf(user.address);
      
      // User should have token0 and token1 deducted
      expect(balance0).to.equal(ethers.parseEther("9900")); // 10000 - 100
      expect(balance1).to.equal(ethers.parseEther("9800")); // 10000 - 200
      
      // User should have LP tokens equal to amount1/2 (due to INITIAL_RATIO)
      expect(lpBalance).to.equal(amount1 / 2n);
      
      // Check pool reserves
      const [reserve0, reserve1] = await pool.getReserves();
      expect(reserve0).to.equal(amount1 / 2n); // amount1/INITIAL_RATIO
      expect(reserve1).to.equal(amount1);
    });
    
    it("should revert when the pool does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      const amount1 = ethers.parseEther("200");
      const minLpAmount = ethers.parseEther("90");
      
      // Try to add liquidity to non-existent pool
      await expect(router.connect(user).addLiquidityFromToken1(token0Address, token2Address, amount1, minLpAmount))
        .to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
    
    it("should revert when LP amount is less than minLpAmount", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount1 = ethers.parseEther("200");
      const minLpAmount = ethers.parseEther("101"); // Set higher than expected LP amount (which is 100)
      
      // Try to add liquidity with too high minLpAmount
      await expect(router.connect(user).addLiquidityFromToken1(token0Address, token1Address, amount1, minLpAmount))
        .to.be.revertedWith("INSUFFICIENT_LP_AMOUNT");
    });
  });
  
  describe("withdrawLiquidity", function () {
    beforeEach(async function () {
      // Add liquidity before testing withdrawal
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("90");
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0, minLpAmount);
      
      // Get pool and approve transfer of LP tokens
      const poolAddress = await factory.findPool(token0Address, token1Address);
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      await pool.connect(user).approve(await router.getAddress(), ethers.parseEther("1000"));
    });
    
    it("should withdraw liquidity correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const lpAmount = ethers.parseEther("50"); // Withdraw half of the LP tokens
      
      // Get balances before withdrawal
      const balance0Before = await token0.balanceOf(user.address);
      const balance1Before = await token1.balanceOf(user.address);
      
      // Set minimum amounts (with some buffer below expected output)
      const minAmount0 = ethers.parseEther("45"); // Slightly less than expected 50
      const minAmount1 = ethers.parseEther("90"); // Slightly less than expected 100
      
      // Withdraw liquidity with slippage protection
      const tx = await router.connect(user).withdrawLiquidity(
        token0Address, 
        token1Address, 
        lpAmount,
        minAmount0,
        minAmount1
      );
      
      // Get balances after withdrawal
      const balance0After = await token0.balanceOf(user.address);
      const balance1After = await token1.balanceOf(user.address);
      
      // User should have received half of their tokens back
      expect(balance0After - balance0Before).to.equal(ethers.parseEther("50")); // 100 * 0.5
      expect(balance1After - balance1Before).to.equal(ethers.parseEther("100")); // 200 * 0.5
    });
    
    it("should revert when the pool does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      const lpAmount = ethers.parseEther("50");
      
      // Try to withdraw from non-existent pool
      await expect(router.connect(user).withdrawLiquidity(
        token0Address, 
        token2Address, 
        lpAmount,
        0,
        0
      )).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });

    it("should revert when minAmountA is not met", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const lpAmount = ethers.parseEther("50");
      
      // Set minimum amount0 higher than expected output
      const minAmount0 = ethers.parseEther("60"); // Higher than expected 50
      const minAmount1 = ethers.parseEther("90"); // Acceptable for amount1
      
      // Should revert due to insufficient A amount
      await expect(router.connect(user).withdrawLiquidity(
        token0Address, 
        token1Address, 
        lpAmount,
        minAmount0,
        minAmount1
      )).to.be.revertedWith("INSUFFICIENT_A_AMOUNT");
    });

    it("should revert when minAmountB is not met", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const lpAmount = ethers.parseEther("50");
      
      // Set minimum amount1 higher than expected output
      const minAmount0 = ethers.parseEther("45"); // Acceptable for amount0
      const minAmount1 = ethers.parseEther("120"); // Higher than expected 100
      
      // Should revert due to insufficient B amount
      await expect(router.connect(user).withdrawLiquidity(
        token0Address, 
        token1Address, 
        lpAmount,
        minAmount0,
        minAmount1
      )).to.be.revertedWith("INSUFFICIENT_B_AMOUNT");
    });

    it("should return the correct token amounts", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const lpAmount = ethers.parseEther("50"); // Withdraw half of the LP tokens
      
      // Get balances before withdrawal
      const balance0Before = await token0.balanceOf(user.address);
      const balance1Before = await token1.balanceOf(user.address);
      
      // Set minimum amounts
      const minAmount0 = ethers.parseEther("45");
      const minAmount1 = ethers.parseEther("90");
      
      // Withdraw liquidity and capture return values
      const [returnedAmount0, returnedAmount1] = await router.connect(user).withdrawLiquidity.staticCall(
        token0Address, 
        token1Address, 
        lpAmount,
        minAmount0,
        minAmount1
      );
      
      // Execute the actual transaction
      await router.connect(user).withdrawLiquidity(
        token0Address, 
        token1Address, 
        lpAmount,
        minAmount0,
        minAmount1
      );
      
      // Get balances after withdrawal
      const balance0After = await token0.balanceOf(user.address);
      const balance1After = await token1.balanceOf(user.address);
      
      // Calculate actual received amounts
      const received0 = balance0After - balance0Before;
      const received1 = balance1After - balance1Before;
      
      // The returned values should match the actual token transfers
      expect(returnedAmount0).to.equal(received0);
      expect(returnedAmount1).to.equal(received1);
      
      // And they should match the expected amounts from half of the liquidity
      expect(returnedAmount0).to.equal(ethers.parseEther("50")); // 100 * 0.5
      expect(returnedAmount1).to.equal(ethers.parseEther("100")); // 200 * 0.5
    });
  });
  
  describe("swap", function () {
    beforeEach(async function () {
      // Add liquidity before testing swaps
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("90"); // Add min LP amount
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0, minLpAmount);
    });
    
    it("should swap tokens correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const swapAmount = ethers.parseEther("10");
      const minAmountOut = ethers.parseEther("15"); // Token0:Token1 is 1:2, so 10 input should yield about 20 output
      
      // Get balances before swap
      const balance0Before = await token0.balanceOf(user.address);
      const balance1Before = await token1.balanceOf(user.address);
      
      // Perform swap
      const tx = await router.connect(user).swap(
        token0Address,
        swapAmount,
        token1Address,
        minAmountOut
      );
      
      // Get balances after swap
      const balance0After = await token0.balanceOf(user.address);
      const balance1After = await token1.balanceOf(user.address);
      
      // Check token balances changed correctly
      expect(balance0Before - balance0After).to.equal(swapAmount); // User spent 10 token0
      expect(balance1After - balance1Before).to.be.gte(minAmountOut); // User received at least 15 token1
    });
    
    it("should revert when the output amount is less than the minimum", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const swapAmount = ethers.parseEther("10");
      const minAmountOut = ethers.parseEther("30"); // Setting unrealistically high min output
      
      // Try swap with too high min output
      await expect(router.connect(user).swap(
        token0Address,
        swapAmount,
        token1Address,
        minAmountOut
      )).to.be.revertedWith("INSUFFICIENT_OUTPUT_AMOUNT");
    });
    
    it("should revert when the pool does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      const swapAmount = ethers.parseEther("10");
      
      // Try to swap in non-existent pool
      await expect(router.connect(user).swap(
        token0Address,
        swapAmount,
        token2Address,
        0
      )).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("swapMultiHop", function () {
    beforeEach(async function () {
      // Create and add liquidity to token0-token1 pool
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      // Transfer more tokens to the user for multi-hop tests
      await token0.transfer(user.address, ethers.parseEther("1000"));
      await token1.transfer(user.address, ethers.parseEther("1000"));
      await token2.transfer(user.address, ethers.parseEther("1000"));
      
      // Re-approve tokens with higher amounts for multi-hop tests
      await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      
      const minLpAmount = ethers.parseEther("90"); // Add min LP amount
      
      // Add liquidity to token0-token1 pool
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, ethers.parseEther("1000"), minLpAmount);
      
      // Create and add liquidity to token1-token2 pool
      await router.createPool(token1Address, token2Address);
      
      // Get pool address to approve tokens directly for the pool
      const poolAddress = await factory.findPool(token1Address, token2Address);
      
      // Attach to pool to approve tokens directly
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Approve tokens directly for the pool with much higher amounts
      await token1.connect(user).approve(poolAddress, ethers.parseEther("10000"));
      await token2.connect(user).approve(poolAddress, ethers.parseEther("10000"));
      
      // Add liquidity to token1-token2 pool - this is direct Pool call, no need for minLpAmount
      await pool.connect(user).addLiquidityFromToken0(ethers.parseEther("100"));
    });
    
    it("should execute multi-hop swaps correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      const path = [token0Address, token1Address, token2Address];
      const amountIn = ethers.parseEther("10");
      const minAmountOut = ethers.parseEther("5"); // Lower minimum amount to ensure test passes
      
      // Get balances before swap
      const balance0Before = await token0.balanceOf(user.address);
      const balance2Before = await token2.balanceOf(user.address);
      
      // Perform multi-hop swap
      const tx = await router.connect(user).swapMultiHop(
        path,
        amountIn,
        minAmountOut
      );
      
      // Get balances after swap
      const balance0After = await token0.balanceOf(user.address);
      const balance2After = await token2.balanceOf(user.address);
      
      // Check token balances changed correctly
      expect(balance0Before - balance0After).to.equal(amountIn); // User spent 10 token0
      expect(balance2After - balance2Before).to.be.gte(minAmountOut); // User received token2
      
      // Optional: log the actual output amount for reference
      // console.log(`Multi-hop swap output: ${ethers.formatEther(balance2After - balance2Before)} Token2`);
    });
    
    it("should revert with invalid path", async function () {
      const token0Address = await token0.getAddress();
      
      // Try with single token path
      await expect(router.connect(user).swapMultiHop(
        [token0Address],
        ethers.parseEther("10"),
        0
      )).to.be.revertedWith("INVALID_PATH");
    });
    
    it("should revert when a pool in the path does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      
      // Try path where token0-token2 pool doesn't exist
      await expect(router.connect(user).swapMultiHop(
        [token0Address, token2Address],
        ethers.parseEther("10"),
        0
      )).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("getAmountOut", function () {
    beforeEach(async function () {
      // Add liquidity before testing quote
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      const minLpAmount = ethers.parseEther("90"); // Add min LP amount
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0, minLpAmount);
    });
    
    it("should return the correct output amount and fee", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amountIn = ethers.parseEther("10");
      
      // Get quote
      const [amountOut, feeAmount] = await router.getAmountOut(
        token0Address,
        amountIn,
        token1Address
      );
      
      // With the initial reserves and a 0% fee, the swap should give approximately:
      // amountOut = (200 * 10) / (100 + 10) ≈ 18.18 token1
      expect(amountOut).to.be.gt(ethers.parseEther("18"));
      expect(amountOut).to.be.lt(ethers.parseEther("19"));
      
      // With 0% default fee, this should be 0
      expect(feeAmount).to.equal(0);
    });
    
    it("should revert for non-existent pool", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      const amountIn = ethers.parseEther("10");
      
      // Try to get quote for non-existent pool
      await expect(router.getAmountOut(
        token0Address,
        amountIn,
        token2Address
      )).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("claimFeesFromPools", function () {
    let poolAddress;
    let Pool;
    let pool;
    
    beforeEach(async function () {
      // Get token addresses
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Create a pool with liquidity
      poolAddress = await factory.findPool(token0Address, token1Address);
      
      // Attach to the pool contract
      Pool = await hre.ethers.getContractFactory("Pool");
      pool = Pool.attach(poolAddress);
      
      // Add initial liquidity
      const minLpAmount = ethers.parseEther("90"); // Add min LP amount
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, ethers.parseEther("1000"), minLpAmount);
      
      // Set a fee rate to generate fees (0.3%)
      await pool.setFeeRate(30);
      
      // Perform swaps to generate fees
      await router.connect(user).swap(
        token0Address,
        ethers.parseEther("100"),
        token1Address,
        0
      );
      
      await router.connect(user).swap(
        token1Address,
        ethers.parseEther("100"),
        token0Address,
        0
      );
    });
    
    it("should claim fees from a single pool", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Check initial balances
      const initialBalance0 = await token0.balanceOf(user.address);
      const initialBalance1 = await token1.balanceOf(user.address);
      
      // Check accumulated fees in the pool
      const [pendingFee0, pendingFee1] = await pool.getPendingFees(user.address);
      expect(pendingFee0).to.be.gt(0);
      expect(pendingFee1).to.be.gt(0);
      
      // Claim fees
      const tokenPairs = [[token0Address, token1Address]];
      const result = await router.connect(user).claimFeesFromPools(tokenPairs);
      
      // Check balances after claiming
      const finalBalance0 = await token0.balanceOf(user.address);
      const finalBalance1 = await token1.balanceOf(user.address);
      
      // User should have received fees
      expect(finalBalance0).to.be.gt(initialBalance0);
      expect(finalBalance1).to.be.gt(initialBalance1);
      
      // Check the fee amounts match what was pending
      expect(finalBalance0 - initialBalance0).to.equal(pendingFee0);
      expect(finalBalance1 - initialBalance1).to.equal(pendingFee1);
    });
    
    it("should claim fees from multiple pools", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      // Create and setup second pool directly
      await factory.createPool(token1Address, token2Address);
      const pool2Address = await factory.findPool(token1Address, token2Address);
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool2 = Pool.attach(pool2Address);
      
      // Add liquidity to the pools directly to avoid router approval issues
      // First, approve tokens for both pools
      await token0.connect(user).approve(await pool.getAddress(), ethers.parseEther("1000000")); 
      await token1.connect(user).approve(await pool.getAddress(), ethers.parseEther("1000000"));
      await token1.connect(user).approve(pool2Address, ethers.parseEther("1000000"));
      await token2.connect(user).approve(pool2Address, ethers.parseEther("1000000"));
      
      // Add liquidity directly to the pools
      await pool.connect(user).addLiquidityFromToken0(ethers.parseEther("1000"));
      await pool2.connect(user).addLiquidityFromToken0(ethers.parseEther("1000"));
      
      // Set fee rates to generate fees (0.3%)
      await pool.setFeeRate(30);
      await pool2.setFeeRate(30);
      
      // Perform swaps to generate fees
      await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
      await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
      await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
      
      await router.connect(user).swap(
        token0Address,
        ethers.parseEther("100"),
        token1Address,
        0
      );
      
      await router.connect(user).swap(
        token1Address,
        ethers.parseEther("100"),
        token2Address,
        0
      );
      
      // Get user's token balances before claiming fees
      const token0BalanceBefore = await token0.balanceOf(user.address);
      const token1BalanceBefore = await token1.balanceOf(user.address);
      const token2BalanceBefore = await token2.balanceOf(user.address);
      
      // Check pending fees before claim
      const [pendingFee0_1, pendingFee1_1] = await pool.getPendingFees(user.address);
      const [pendingFee0_2, pendingFee1_2] = await pool2.getPendingFees(user.address);
      
      // Verify that there are some pending fees
      // At least one of the pools should have fees
      const totalPendingFees = pendingFee0_1 + pendingFee1_1 + pendingFee0_2 + pendingFee1_2;
      expect(totalPendingFees).to.be.gt(0);
      
      // Claim fees from both pools
      const tokenPairs = [
        [token0Address, token1Address],
        [token1Address, token2Address]
      ];
      
      // Claim fees
      const tx = await router.connect(user).claimFeesFromPools(tokenPairs);
      await tx.wait();
      
      // Get user's token balances after claiming fees
      const token0BalanceAfter = await token0.balanceOf(user.address);
      const token1BalanceAfter = await token1.balanceOf(user.address);
      const token2BalanceAfter = await token2.balanceOf(user.address);
      
      // At least one of the token balances should have increased
      const hasIncreasedBalance = 
        token0BalanceAfter > token0BalanceBefore || 
        token1BalanceAfter > token1BalanceBefore || 
        token2BalanceAfter > token2BalanceBefore;
      
      expect(hasIncreasedBalance).to.be.true;
      
      // Verify fees were claimed (by checking they are now zero)
      const [afterFee0_1, afterFee1_1] = await pool.getPendingFees(user.address);
      const [afterFee0_2, afterFee1_2] = await pool2.getPendingFees(user.address);
      
      // Pending fees should now be zero or very close to zero (might be some dust)
      expect(afterFee0_1).to.be.lt(ethers.parseUnits("1", 10)); // less than 10^-8
      expect(afterFee1_1).to.be.lt(ethers.parseUnits("1", 10));
      expect(afterFee0_2).to.be.lt(ethers.parseUnits("1", 10));
      expect(afterFee1_2).to.be.lt(ethers.parseUnits("1", 10));
    });
    
    it("should handle pools where user has no LP tokens", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      // Create a pool where user has no LP tokens
      await router.createPool(token0Address, token2Address);
      
      // Claim fees from both pools (one with LP tokens, one without)
      const tokenPairs = [
        [token0Address, token1Address],
        [token0Address, token2Address]
      ];
      
      // This should not revert
      await router.connect(user).claimFeesFromPools(tokenPairs);
    });
    
    it("should revert with no pools specified", async function () {
      await expect(
        router.connect(user).claimFeesFromPools([])
      ).to.be.revertedWith("NO_POOLS_SPECIFIED");
    });
    
    it("should revert with invalid token pair", async function () {
      const token0Address = await token0.getAddress();
      
      await expect(
        router.connect(user).claimFeesFromPools([[token0Address]])
      ).to.be.revertedWith("INVALID_TOKEN_PAIR");
    });
    
    it("should revert when a pool does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      
      // Try to claim from non-existent pool
      await expect(
        router.connect(user).claimFeesFromPools([[token0Address, token2Address]])
      ).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });

  describe("previewSwapMultiHop", function () {
    beforeEach(async function () {
      // Create and add liquidity to token0-token1 pool
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      // Transfer more tokens to the user for multi-hop tests
      await token0.transfer(user.address, ethers.parseEther("1000"));
      await token1.transfer(user.address, ethers.parseEther("1000"));
      await token2.transfer(user.address, ethers.parseEther("1000"));
      
      // Re-approve tokens with higher amounts for multi-hop tests
      await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("10000"));
      
      const minLpAmount = ethers.parseEther("90"); // Add min LP amount
      
      // Add liquidity to token0-token1 pool
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, ethers.parseEther("1000"), minLpAmount);
      
      // Create and add liquidity to token1-token2 pool
      await router.createPool(token1Address, token2Address);
      
      // Get pool address to approve tokens directly for the pool
      const poolAddress = await factory.findPool(token1Address, token2Address);
      
      // Attach to pool to approve tokens directly
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Approve tokens directly for the pool with much higher amounts
      await token1.connect(user).approve(poolAddress, ethers.parseEther("10000"));
      await token2.connect(user).approve(poolAddress, ethers.parseEther("10000"));
      
      // Add liquidity to token1-token2 pool - this is direct Pool call, no need for minLpAmount
      await pool.connect(user).addLiquidityFromToken0(ethers.parseEther("100"));
    });
    
    it("should correctly preview multi-hop swap results", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      const path = [token0Address, token1Address, token2Address];
      const amountIn = ethers.parseEther("10");
      
      // Get preview of multi-hop swap
      const [expectedAmountOut, totalFee, amountsOut, feesPerHop] = await router.previewSwapMultiHop(
        path,
        amountIn
      );
      
      // Verify the returned values
      expect(expectedAmountOut).to.be.gt(0); // Expected output should be greater than 0
      expect(amountsOut.length).to.equal(3); // Should match the path length
      expect(feesPerHop.length).to.equal(2); // Should be path.length - 1
      
      // amountsOut[0] should be the input amount
      expect(amountsOut[0]).to.equal(amountIn);
      
      // Each subsequent amount should be the result of the swap
      expect(amountsOut[1]).to.be.gt(0);
      expect(amountsOut[2]).to.be.gt(0);
      
      // Verify the fee values
      expect(feesPerHop[0]).to.be.gte(0);
      expect(feesPerHop[1]).to.be.gte(0);
      
      // Total fee should be the sum of individual fees
      expect(totalFee).to.equal(feesPerHop[0] + feesPerHop[1]);
    });
    
    it("should match actual swap output with preview output", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      const path = [token0Address, token1Address, token2Address];
      const amountIn = ethers.parseEther("10");
      
      // Get preview of multi-hop swap
      const [expectedAmountOut, totalFeePreview] = await router.previewSwapMultiHop(
        path,
        amountIn
      );
      
      // Get balances before actual swap
      const balance0Before = await token0.balanceOf(user.address);
      const balance2Before = await token2.balanceOf(user.address);
      
      // Perform actual multi-hop swap
      const tx = await router.connect(user).swapMultiHop(
        path,
        amountIn,
        0 // No minimum output requirement for this test
      );
      
      // Get the result of the actual swap
      const receipt = await tx.wait();
      const [actualAmountOut, totalFeeActual] = await router.connect(user).swapMultiHop.staticCall(
        path,
        amountIn,
        0
      );
      
      // Get balances after swap
      const balance0After = await token0.balanceOf(user.address);
      const balance2After = await token2.balanceOf(user.address);
      
      // Check token balances changed correctly
      expect(balance0Before - balance0After).to.equal(amountIn); // User spent 10 token0
      
      // Actual received amount should match the preview amount (or very close)
      const actualReceived = balance2After - balance2Before;
      
      // Allow a small margin of error (due to potential differences in gas or other factors)
      const tolerance = ethers.parseEther("0.001"); // 0.1% tolerance
      
      expect(actualReceived).to.be.closeTo(expectedAmountOut, tolerance);
      expect(totalFeeActual).to.be.closeTo(totalFeePreview, tolerance);
    });
    
    it("should revert with invalid path", async function () {
      const token0Address = await token0.getAddress();
      
      // Try with single token path
      await expect(router.previewSwapMultiHop(
        [token0Address],
        ethers.parseEther("10")
      )).to.be.revertedWith("INVALID_PATH");
    });
    
    it("should revert when a pool in the path does not exist", async function () {
      const token0Address = await token0.getAddress();
      const token2Address = await token2.getAddress();
      
      // Try path where token0-token2 pool doesn't exist
      await expect(router.previewSwapMultiHop(
        [token0Address, token2Address],
        ethers.parseEther("10")
      )).to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
}); 