const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Router Best Route Functions", function () {
  let owner, user1, user2;
  let router, factory;
  let tokenA, tokenB, tokenC, tokenD, tokenE;
  let poolAB, poolBC, poolCD, poolAD, poolCE;
  let snapshotId;

  before(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const TokenContract = await ethers.getContractFactory("NewToken");
    tokenA = await TokenContract.deploy("TokenA", "TKNA");
    await tokenA.waitForDeployment();
    
    tokenB = await TokenContract.deploy("TokenB", "TKNB");
    await tokenB.waitForDeployment();
    
    tokenC = await TokenContract.deploy("TokenC", "TKNC");
    await tokenC.waitForDeployment();
    
    tokenD = await TokenContract.deploy("TokenD", "TKND");
    await tokenD.waitForDeployment();
    
    tokenE = await TokenContract.deploy("TokenE", "TKNE");
    await tokenE.waitForDeployment();
    
    // Transfer tokens to user1 for testing
    // NewToken mints 1,000,000 tokens to deployer in constructor
    const transferAmount = ethers.parseEther("500000");
    await tokenA.transfer(user1.address, transferAmount);
    await tokenB.transfer(user1.address, transferAmount);
    await tokenC.transfer(user1.address, transferAmount);
    await tokenD.transfer(user1.address, transferAmount);
    await tokenE.transfer(user1.address, transferAmount);

    // Deploy factory
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy router
    const Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(await factory.getAddress());
    await router.waitForDeployment();
    
    // Create pools with different fee rates
    await factory.createPoolWithFee(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      300 // 3% fee
    );
    
    await factory.createPoolWithFee(
      await tokenB.getAddress(),
      await tokenC.getAddress(),
      200 // 2% fee
    );
    
    await factory.createPoolWithFee(
      await tokenC.getAddress(),
      await tokenD.getAddress(),
      100 // 1% fee
    );
    
    await factory.createPoolWithFee(
      await tokenA.getAddress(),
      await tokenD.getAddress(),
      500 // 5% fee - direct but expensive
    );
    
    await factory.createPoolWithFee(
      await tokenC.getAddress(),
      await tokenE.getAddress(),
      150 // 1.5% fee
    );
    
    // Get pool addresses
    poolAB = await factory.findPool(await tokenA.getAddress(), await tokenB.getAddress());
    poolBC = await factory.findPool(await tokenB.getAddress(), await tokenC.getAddress());
    poolCD = await factory.findPool(await tokenC.getAddress(), await tokenD.getAddress());
    poolAD = await factory.findPool(await tokenA.getAddress(), await tokenD.getAddress());
    poolCE = await factory.findPool(await tokenC.getAddress(), await tokenE.getAddress());
    
    // Add liquidity to all pools
    const PoolContract = await ethers.getContractFactory("Pool");
    
    // Helper to add liquidity to a pool
    const addPoolLiquidity = async (pool, amount) => {
      // Get pool contract
      const poolContract = PoolContract.attach(pool);
      
      // Get the actual token0 and token1 from the pool
      const token0Address = await poolContract.token0();
      const token1Address = await poolContract.token1();
      
      // Map addresses to token contracts
      const tokenMap = {
        [await tokenA.getAddress()]: tokenA,
        [await tokenB.getAddress()]: tokenB,
        [await tokenC.getAddress()]: tokenC,
        [await tokenD.getAddress()]: tokenD,
        [await tokenE.getAddress()]: tokenE
      };
      
      const token0 = tokenMap[token0Address];
      const token1 = tokenMap[token1Address];
      
      console.log(`Adding liquidity to pool ${await token0.symbol()}-${await token1.symbol()}`);
      
      // Calculate amount1 based on initial ratio (1:2)
      const amount1 = amount * 2n;
      
      // Approve tokens with sufficient headroom
      await token0.approve(pool, amount * 10n);
      await token1.approve(pool, amount1 * 10n);
      
      // Add liquidity
      await poolContract.addLiquidityFromToken0(amount);
    };
    
    const liquidityAmount = ethers.parseEther("10000");
    
    // Add liquidity to all pools
    await addPoolLiquidity(poolAB, liquidityAmount);
    await addPoolLiquidity(poolBC, liquidityAmount);
    await addPoolLiquidity(poolCD, liquidityAmount);
    await addPoolLiquidity(poolAD, liquidityAmount);
    await addPoolLiquidity(poolCE, liquidityAmount);
    
    // Approve tokens for user to use in tests
    await tokenA.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await tokenB.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await tokenC.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await tokenD.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000000"));
    await tokenE.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000000"));
  });
  
  beforeEach(async function () {
    // Take a snapshot before each test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });
  
  afterEach(async function () {
    // Revert to the snapshot after each test
    await ethers.provider.send("evm_revert", [snapshotId]);
  });



  describe("swapWithBestRoute", function () {
    it("should execute a direct swap when it's the best route", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenDAddr = await tokenD.getAddress();
      
      const amountIn = ethers.parseEther("100");
      const amountOutMin = 0; // No slippage protection for testing
      const maxHops = 3;
      
      // Get user's initial balances
      const initialBalanceA = await tokenA.balanceOf(user1.address);
      const initialBalanceD = await tokenD.balanceOf(user1.address);
      
      // If a direct route exists from A to D and is optimal, it should be used
      const tx = await router.connect(user1).swapWithBestRoute(
        tokenAAddr,
        amountIn,
        tokenDAddr,
        amountOutMin,
        maxHops
      );
      
      // Check balances after swap
      const finalBalanceA = await tokenA.balanceOf(user1.address);
      const finalBalanceD = await tokenD.balanceOf(user1.address);
      
      // User should have less tokenA and more tokenD
      expect(finalBalanceA).to.equal(initialBalanceA - amountIn);
      expect(finalBalanceD).to.be.greaterThan(initialBalanceD);
    });
    
    
    it("should fail when no route exists", async function () {
      // Deploy a new token that has no pools
      const TokenContract = await ethers.getContractFactory("NewToken");
      const tokenF = await TokenContract.deploy("TokenF", "TKNF");
      await tokenF.waitForDeployment();
      
      const tokenAAddr = await tokenA.getAddress();
      const tokenFAddr = await tokenF.getAddress();
      
      const amountIn = ethers.parseEther("100");
      const amountOutMin = 0;
      const maxHops = 3;
      
      // The swap should fail as there's no route from A to F
      await expect(
        router.connect(user1).swapWithBestRoute(
          tokenAAddr,
          amountIn,
          tokenFAddr,
          amountOutMin,
          maxHops
        )
      ).to.be.revertedWith("NO_ROUTE_FOUND");
    });
    
    it("should respect the amountOutMin parameter", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenDAddr = await tokenD.getAddress();
      
      const amountIn = ethers.parseEther("100");
      // Set a very high min output amount that can't be satisfied
      const amountOutMin = ethers.parseEther("1000000");
      const maxHops = 3;
      
      // The swap should fail due to insufficient output
      await expect(
        router.connect(user1).swapWithBestRoute(
          tokenAAddr,
          amountIn,
          tokenDAddr,
          amountOutMin,
          maxHops
        )
      ).to.be.revertedWith("INSUFFICIENT_OUTPUT_AMOUNT");
    });
    
    it("should compare different routes and pick the one with the highest output", async function () {
      // We have multiple routes from A to D:
      // 1. A->D (direct)
      // 2. A->B->C->D (3 hops)
      
      const tokenAAddr = await tokenA.getAddress();
      const tokenDAddr = await tokenD.getAddress();
      
      const amountIn = ethers.parseEther("100");
      const amountOutMin = 0;
      const maxHops = 3;
      
      // First, get the expected output for each route
      const PoolContract = await ethers.getContractFactory("Pool");
      
      // Direct route A->D
      const poolADContract = PoolContract.attach(poolAD);
      const directOutputResult = await poolADContract.getAmountOut(tokenAAddr, amountIn, tokenDAddr);
      const directOutput = directOutputResult[0];
      
      // Multi-hop A->B->C->D
      // Get individual outputs for each hop
      const poolABContract = PoolContract.attach(poolAB);
      const output1Result = await poolABContract.getAmountOut(tokenAAddr, amountIn, await tokenB.getAddress());
      const output1 = output1Result[0];
      
      const poolBCContract = PoolContract.attach(poolBC);
      const output2Result = await poolBCContract.getAmountOut(await tokenB.getAddress(), output1, await tokenC.getAddress());
      const output2 = output2Result[0];
      
      const poolCDContract = PoolContract.attach(poolCD);
      const output3Result = await poolCDContract.getAmountOut(await tokenC.getAddress(), output2, tokenDAddr);
      const output3 = output3Result[0];
      
      // Now execute the swap
      const tx = await router.connect(user1).swapWithBestRoute(
        tokenAAddr,
        amountIn,
        tokenDAddr,
        amountOutMin,
        maxHops
      );
      
      // Check the BestRouteFound event to see which route was chosen
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BestRouteFound'
      );
      
      // Get the bestPath from the event
      const bestPath = event.args[0];
      
      // Determine which route should have given the highest output
      let expectedPath;
      if (directOutput > output3) {
        expectedPath = [tokenAAddr, tokenDAddr]; // Direct route
      } else {
        expectedPath = [tokenAAddr, await tokenB.getAddress(), await tokenC.getAddress(), tokenDAddr]; // Multi-hop
      }
      
      // The bestPath should match the route with the highest output
      expect(bestPath.length).to.equal(expectedPath.length);
      for (let i = 0; i < bestPath.length; i++) {
        expect(bestPath[i]).to.equal(expectedPath[i]);
      }
    });
  });
}); 