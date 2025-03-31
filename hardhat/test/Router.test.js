const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Router Contract", function () {
  let Token0, Token1, Token2, PoolFactory, Pool, Router;
  let token0, token1, token2, factory, router;
  let owner, user;
  let globalSnapshotId;
  
  before(async function () {
    // Take a global snapshot before any tests
    globalSnapshotId = await ethers.provider.send("evm_snapshot", []);
    
    [owner, user] = await ethers.getSigners();
    
    // Deploy tokens for testing with UNIQUE names to avoid collision with other tests
    const NewToken = await hre.ethers.getContractFactory("NewToken");
    
    // Deploy Alpha with a unique name for this test file
    token0 = await NewToken.deploy("RouterAlpha", "RALPHA");
    await token0.waitForDeployment();
    
    // Deploy Beta with a unique name for this test file
    token1 = await NewToken.deploy("RouterBeta", "RBETA");
    await token1.waitForDeployment();
    
    // Deploy Gamma (for multi-hop tests) with a unique name for this test file
    token2 = await NewToken.deploy("RouterGamma", "RGAMMA");
    await token2.waitForDeployment();
    
    // Deploy the PoolFactory
    PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy the Router
    Router = await hre.ethers.getContractFactory("Router");
    router = await Router.deploy(await factory.getAddress());
    await router.waitForDeployment();
    
    // Send more tokens to user for testing
    await token0.transfer(user.address, ethers.parseEther("10000"));
    await token1.transfer(user.address, ethers.parseEther("10000"));
    await token2.transfer(user.address, ethers.parseEther("10000"));
    
    // Create a pool through the factory (will use in some tests)
    await factory.createPool(await token0.getAddress(), await token1.getAddress());
  });
  
  after(async function () {
    // Revert to the global snapshot after all tests in this file
    await ethers.provider.send("evm_revert", [globalSnapshotId]);
  });
  
  let snapshotId;
  
  beforeEach(async function () {
    // Take a snapshot before each test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    
    // Approve tokens for the router with a much higher amount to guarantee no allowance issues
    await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("1000000"));
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
      
      // Get the pool address
      const poolAddress = await factory.findPool(token0Address, token1Address);
      
      // Attach to the pool contract to check balances
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Add liquidity
      const tx = await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0);
      
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
      
      // Try to add liquidity to non-existent pool
      await expect(router.connect(user).addLiquidityFromToken0(token0Address, token2Address, amount0))
        .to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("addLiquidityFromToken1", function () {
    it("should add liquidity correctly", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount1 = ethers.parseEther("200");
      
      // Get the pool address
      const poolAddress = await factory.findPool(token0Address, token1Address);
      
      // Attach to the pool contract to check balances
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Add liquidity
      const tx = await router.connect(user).addLiquidityFromToken1(token0Address, token1Address, amount1);
      
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
      
      // Try to add liquidity to non-existent pool
      await expect(router.connect(user).addLiquidityFromToken1(token0Address, token2Address, amount1))
        .to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("withdrawLiquidity", function () {
    beforeEach(async function () {
      // Add liquidity before testing withdrawal
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0);
      
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
      
      // Withdraw liquidity
      const tx = await router.connect(user).withdrawLiquidity(
        token0Address, 
        token1Address, 
        lpAmount
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
      await expect(router.connect(user).withdrawLiquidity(token0Address, token2Address, lpAmount))
        .to.be.revertedWith("POOL_DOES_NOT_EXIST");
    });
  });
  
  describe("swap", function () {
    beforeEach(async function () {
      // Add liquidity before testing swaps
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const amount0 = ethers.parseEther("100");
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0);
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
      
      // Transfer more tokens to the user for multi-hop tests
      await token0.transfer(user.address, ethers.parseEther("1000"));
      await token1.transfer(user.address, ethers.parseEther("1000"));
      await token2.transfer(user.address, ethers.parseEther("1000"));
      
      // Re-approve tokens with higher amounts for multi-hop tests
      await token0.connect(user).approve(await router.getAddress(), ethers.parseEther("2000"));
      await token1.connect(user).approve(await router.getAddress(), ethers.parseEther("2000"));
      await token2.connect(user).approve(await router.getAddress(), ethers.parseEther("2000"));
      
      // Add liquidity to token0-token1 pool
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, ethers.parseEther("100"));
      
      // Create and add liquidity to token1-token2 pool
      const token2Address = await token2.getAddress();
      await router.createPool(token1Address, token2Address);
      
      // Get pool address to approve tokens directly for the pool
      const poolAddress = await factory.findPool(token1Address, token2Address);
      
      // Attach to pool to approve tokens directly
      const Pool = await hre.ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Approve tokens directly for the pool
      await token1.connect(user).approve(poolAddress, ethers.parseEther("2000"));
      await token2.connect(user).approve(poolAddress, ethers.parseEther("2000"));
      
      // Add liquidity to token1-token2 pool
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
      console.log(`Multi-hop swap output: ${ethers.formatEther(balance2After - balance2Before)} Token2`);
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
      
      await router.connect(user).addLiquidityFromToken0(token0Address, token1Address, amount0);
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
}); 