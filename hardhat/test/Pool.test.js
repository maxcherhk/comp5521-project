const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Pool Contract", function () {

  let Token0, Token1, Pool;
  let token0, token1, pool;
  let owner, user;

  before(async function () {

    // Deploy two tokens
    const NewToken = await hre.ethers.getContractFactory("NewToken");
    
    // Deploy Alpha
    token0 = await NewToken.deploy("Alpha", "ALPHA");
    await token0.waitForDeployment();

    // Deploy Beta
    token1 = await NewToken.deploy("Beta", "BETA");
    await token1.waitForDeployment();
    

    // Deploy the Pool
    Pool = await hre.ethers.getContractFactory("Pool");
    pool = await Pool.deploy(
      await token0.getAddress(),
      await token1.getAddress()
    );
    await pool.waitForDeployment();

    [deployer, user] = await ethers.getSigners();

    // Send tokens to user for testing
    await token0.transfer(user.address, ethers.parseEther("1000"));
    await token1.transfer(user.address, ethers.parseEther("1000"));
  });

  beforeEach(async function () {
    // Reset approvals for each test
    await token0.connect(user).approve(pool.getAddress(), ethers.parseEther("1000000"));
    await token1.connect(user).approve(pool.getAddress(), ethers.parseEther("1000000"));
  });

  let snapshotId;

  before(async function () {
    // Take a snapshot before running any tests
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async function () {
    // Revert to the snapshot after each describe block
    await ethers.provider.send("evm_revert", [snapshotId]);
    // Take a new snapshot for the next test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("addLiquidity", function () {

    it("should add initial liquidity and mint LP tokens", async function () {

      const amount0 = ethers.parseEther("100");
      const tx = await pool.connect(user).addLiquidity(amount0);
      
      // Check LP tokens minted
      const lpBalance = await pool.balanceOf(user.address);
      expect(lpBalance).to.equal(amount0);

      // Check reserves updated correctly
      const [res0, res1] = await pool.getReserves();
      expect(res0).to.equal(amount0);
      expect(res1).to.equal(amount0 * 2n); // INITIAL_RATIO = 2

      // Check event emission
      await expect(tx)
        .to.emit(pool, "AddedLiquidity")
        .withArgs(amount0, token0.getAddress(), amount0, token1.getAddress(), amount0 * 2n);
    });

    it("should add liquidity proportionally when pool has reserves", async function () {
      // Initial liquidity
      const amount0 = ethers.parseEther("100");
      await pool.connect(user).addLiquidity(amount0);

      // Additional liquidity
      const addAmount0 = ethers.parseEther("50");
      const tx = await pool.connect(user).addLiquidity(addAmount0);

      // Expected LP tokens: (50 * 100) / 100 = 50
      const expectedLP = addAmount0;
      const lpBalance = await pool.balanceOf(user.address);
      expect(lpBalance).to.equal(amount0 + expectedLP);

      // Check reserves
      const [res0, res1] = await pool.getReserves();
      expect(res0).to.equal(amount0+addAmount0);
      expect(res1).to.equal(ethers.parseEther("300")); // 200 + 100

      // Check event
      await expect(tx)
        .to.emit(pool, "AddedLiquidity")
        .withArgs(expectedLP, token0.getAddress(), addAmount0, token1.getAddress(), addAmount0*2n);
    });

    it("should revert when adding zero liquidity", async function () {
      await expect(pool.connect(user).addLiquidity(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("swap", function () {
    beforeEach(async function () {
      // Add initial liquidity: 100 Token0, 200 Token1
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
    });

    it("should swap Alpha for Beta correctly", async function () {
      const swapAmount = ethers.parseEther("100");
      const expectedOutput = ethers.parseEther("100"); // (200 * 100) / (100 + 100) = 100

      // Perform swap
      const tx = await pool.connect(user).swap(token0.getAddress(), swapAmount, token1.getAddress());

      // Check user's balances
      const finalBal0 = await token0.balanceOf(user.address);
      const finalBal1 = await token1.balanceOf(user.address);
      expect(finalBal0).to.equal(ethers.parseEther("800")); // 1000 - 100 (initial) - 100 (swap)
      expect(finalBal1).to.equal(ethers.parseEther("900")); // 1000 - 200 (initial) + 100 (swap)

      // Check reserves
      const [res0, res1] = await pool.getReserves();
      expect(res0).to.equal(ethers.parseEther("200")); // 100 + 100
      expect(res1).to.equal(ethers.parseEther("100")); // 200 - 100

      // Check event
      await expect(tx)
        .to.emit(pool, "Swapped")
        .withArgs(token0.getAddress(), swapAmount, token1.getAddress(), expectedOutput);
    });

    it("should revert for invalid token pairs", async function () {
      await expect(pool.connect(user).swap(token0.getAddress(), 100, token0.getAddress()))
        .to.be.revertedWith("Same tokens");
    });

    it("should revert for zero swap amount", async function () {
      await expect(pool.connect(user).swap(token0.getAddress(), 0, token1.getAddress()))
        .to.be.revertedWith("Zero amount");
    });
  });

  describe("getRequiredAmount1", function () {
    it("should return initial ratio when pool is empty", async function () {
      const amount0 = ethers.parseEther("100");
      const requiredAmount1 = await pool.getRequiredAmount1(amount0);
      expect(requiredAmount1).to.equal(amount0 * 2n);
    });

    it("should return proportional amount when pool has reserves", async function () {
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
      const amount0 = ethers.parseEther("50");
      const requiredAmount1 = await pool.getRequiredAmount1(amount0);
      expect(requiredAmount1).to.equal(ethers.parseEther("100")); // (50 * 200) / 100
    });
  });

  describe("getAmountOut", function () {
    beforeEach(async function () {
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
    });

    it("should calculate correct output for Token0 to Token1", async function () {
      const amountIn = ethers.parseEther("100");
      const [amountOut, feeAmount] = await pool.getAmountOut(token0.getAddress(), amountIn, token1.getAddress());
      expect(amountOut).to.equal(ethers.parseEther("100")); // (200 * 100) / (100 + 100)
    });

    it("should calculate correct output for Token1 to Token0", async function () {
      // First swap to change reserves to 200 Token0, 100 Token1
      await pool.connect(user).swap(token0.getAddress(), ethers.parseEther("100"), token1.getAddress());

      const amountIn = ethers.parseEther("50");
      const [amountOut, feeAmount] = await pool.getAmountOut(token1.getAddress(), amountIn, token0.getAddress());
      const expected = amountIn * 200n / (100n + 50n); // (200 * 50) / 150 ≈ 66.666...
      expect(amountOut).to.equal(expected);
    });
  });
  
  describe("previewWithdraw", function () {
    beforeEach(async function () {
      // Add initial liquidity: 100 Token0, 200 Token1
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
      
      // Add approvals for deployer
      await token0.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
      await token1.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
    });
  
    it("should correctly calculate withdrawal amounts", async function () {
      // Check for half the LP tokens
      const lpAmount = ethers.parseEther("50");
      const [amount0, amount1] = await pool.previewWithdraw(lpAmount);
      
      // Should get 50% of reserves
      expect(amount0).to.equal(ethers.parseEther("50")); // 50% of 100
      expect(amount1).to.equal(ethers.parseEther("100")); // 50% of 200
    });
  
    it("should calculate proportional amounts when there are multiple liquidity providers", async function () {
      // Add more liquidity from another account
      const addAmount0 = ethers.parseEther("50");
      await pool.connect(deployer).addLiquidity(addAmount0);
      
      // Total reserves now: 150 Token0, 300 Token1
      // Total LP supply: 150
      
      // Preview withdrawing user's original 100 LP tokens
      const lpAmount = ethers.parseEther("100");
      const [amount0, amount1] = await pool.previewWithdraw(lpAmount);
      
      // Should get 100/150 = 2/3 of reserves
      expect(amount0).to.equal(ethers.parseEther("100")); // 2/3 of 150
      expect(amount1).to.equal(ethers.parseEther("200")); // 2/3 of 300
    });
  
    it("should revert when preview amount is zero", async function () {
      await expect(pool.previewWithdraw(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Fee management", function () {
    it("should initialize with deployer as fee admin", async function () {
      const admin = await pool.feeAdmin();
      expect(admin).to.equal(deployer.address);
    });

    it("should initialize with 0% fee rate", async function () {
      const feeRate = await pool.feeRate();
      expect(feeRate).to.equal(0);
    });

    it("should allow fee admin to set fee rate", async function () {
      // Set fee to 0.3% (30 basis points)
      const tx = await pool.connect(deployer).setFeeRate(30);
      
      const newFeeRate = await pool.feeRate();
      expect(newFeeRate).to.equal(30);
      
      await expect(tx)
        .to.emit(pool, "FeeRateUpdated")
        .withArgs(30);
    });

    it("should revert when non-admin tries to set fee rate", async function () {
      await expect(pool.connect(user).setFeeRate(30))
        .to.be.revertedWith("Only fee admin can update fee rate");
    });

    it("should allow fee admin to transfer admin role", async function () {
      const tx = await pool.connect(deployer).setFeeAdmin(user.address);
      
      const newAdmin = await pool.feeAdmin();
      expect(newAdmin).to.equal(user.address);
      
      await expect(tx)
        .to.emit(pool, "FeeAdminUpdated")
        .withArgs(user.address);
    });

    it("should revert when fee rate exceeds 1%", async function () {
      await expect(pool.connect(deployer).setFeeRate(101))
        .to.be.revertedWith("Fee rate cannot exceed 1%");
    });
  });

  describe("getAmountOut with fees", function () {
    beforeEach(async function () {
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
      // Set fee to 0.3% (30 basis points)
      await pool.connect(deployer).setFeeRate(30);
    });

    it("should calculate output accounting for fees", async function () {
      const amountIn = ethers.parseEther("100");
      const [amountOut, feeAmount] = await pool.getAmountOut(token0.getAddress(), amountIn, token1.getAddress());
      
      // Fee-adjusted calculation: 
      // amountInWithFee = 100 * (10000 - 30) / 10000 = 99.7 ETH
      // amountOut = (200 * 99.7) / (100 + 99.7) = 99.7 ETH
      const expectedAmountInWithFee = amountIn * (10000n - 30n) / 10000n;
      const expectedAmountOut = ethers.parseEther("200") * expectedAmountInWithFee / 
                               (ethers.parseEther("100") + expectedAmountInWithFee);
      const expectedFeeAmount = amountIn - expectedAmountInWithFee;
      expect(amountOut).to.equal(expectedAmountOut);
      expect(feeAmount).to.equal(expectedFeeAmount);
    });
  });

  describe("swap with fees", function () {
    beforeEach(async function () {
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
      // Set fee to 0.3% (30 basis points)
      await pool.connect(deployer).setFeeRate(30);
    });

    it("should swap with fee applied", async function () {
      const initialBalance1 = await token1.balanceOf(user.address);
      
      const amountIn = ethers.parseEther("100");
      await pool.connect(user).swap(token0.getAddress(), amountIn, token1.getAddress());
      
      const finalBalance1 = await token1.balanceOf(user.address);
      const receivedAmount = finalBalance1 - initialBalance1;
      
      // Calculate expected output with 0.3% fee
      const amountInWithFee = amountIn * (10000n - 30n) / 10000n;
      const expectedOutput = ethers.parseEther("200") * amountInWithFee / 
                           (ethers.parseEther("100") + amountInWithFee);
      
      expect(receivedAmount).to.equal(expectedOutput);
    });
  });
  describe("LP token information functions", function () {
    beforeEach(async function () {
      // Add initial liquidity from user: 100 Token0, 200 Token1
      await pool.connect(user).addLiquidity(ethers.parseEther("100"));
    });
    
    describe("getLPBalance", function () {
      it("should return correct LP balance for a user with liquidity", async function () {
        const lpBalance = await pool.getLPBalance(user.address);
        expect(lpBalance).to.equal(ethers.parseEther("100"));
      });
      
      it("should return zero for a user without liquidity", async function () {
        const lpBalance = await pool.getLPBalance(deployer.address);
        expect(lpBalance).to.equal(0);
      });
    });
    
    describe("getUserLiquidityPosition", function () {
      it("should return correct token amounts for a user with liquidity", async function () {
        const [amount0, amount1] = await pool.getUserLiquidityPosition(user.address);
        expect(amount0).to.equal(ethers.parseEther("100")); // All token0 reserve
        expect(amount1).to.equal(ethers.parseEther("200")); // All token1 reserve
      });
      
      it("should return zeros for a user without liquidity", async function () {
        const [amount0, amount1] = await pool.getUserLiquidityPosition(deployer.address);
        expect(amount0).to.equal(0);
        expect(amount1).to.equal(0);
      });
      
      it("should return proportional amounts with multiple liquidity providers", async function () {
        // Add more liquidity from deployer (50 Token0, 100 Token1)
        await token0.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
        await token1.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
        await pool.connect(deployer).addLiquidity(ethers.parseEther("50"));
        
        // Check user's position (should have 2/3 of the pool)
        const [userAmount0, userAmount1] = await pool.getUserLiquidityPosition(user.address);
        expect(userAmount0).to.equal(ethers.parseEther("100")); // 2/3 of 150
        expect(userAmount1).to.equal(ethers.parseEther("200")); // 2/3 of 300
        
        // Check deployer's position (should have 1/3 of the pool)
        const [deployerAmount0, deployerAmount1] = await pool.getUserLiquidityPosition(deployer.address);
        expect(deployerAmount0).to.equal(ethers.parseEther("50")); // 1/3 of 150
        expect(deployerAmount1).to.equal(ethers.parseEther("100")); // 1/3 of 300
      });
    });
    
    describe("getUserPoolShare", function () {
      it("should return 100% (10000 basis points) for single liquidity provider", async function () {
        const share = await pool.getUserPoolShare(user.address);
        expect(share).to.equal(10000); // 100% in basis points
      });
      
      it("should return zero for a user without liquidity", async function () {
        const share = await pool.getUserPoolShare(deployer.address);
        expect(share).to.equal(0);
      });
      
      it("should return correct percentages with multiple liquidity providers", async function () {
        // Add more liquidity from deployer (100 Token0, 200 Token1)
        await token0.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
        await token1.connect(deployer).approve(pool.getAddress(), ethers.parseEther("1000000"));
        await pool.connect(deployer).addLiquidity(ethers.parseEther("100"));
        
        // Check user's share (should be 50%)
        const userShare = await pool.getUserPoolShare(user.address);
        expect(userShare).to.equal(5000); // 50% in basis points
        
        // Check deployer's share (should be 50%)
        const deployerShare = await pool.getUserPoolShare(deployer.address);
        expect(deployerShare).to.equal(5000); // 50% in basis points
      });
    });
  });
});