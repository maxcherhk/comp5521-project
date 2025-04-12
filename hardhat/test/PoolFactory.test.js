const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolFactory Contract", function () {
  let Token0, Token1, PoolFactory;
  let token0, token1, factory;
  let owner, user, newAdmin;

  before(async function () {
    [owner, user, newAdmin] = await ethers.getSigners();

    // Deploy two tokens for testing
    const NewToken = await hre.ethers.getContractFactory("NewToken");
    
    // Deploy Alpha
    token0 = await NewToken.deploy("Alpha", "ALPHA");
    await token0.waitForDeployment();

    // Deploy Beta
    token1 = await NewToken.deploy("Beta", "BETA");
    await token1.waitForDeployment();
    
    // Deploy the PoolFactory
    PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.waitForDeployment();
  });

  let snapshotId;

  beforeEach(async function () {
    // Take a snapshot before each test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async function () {
    // Revert to the snapshot after each test
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("deployment", function () {
    it("should set the deployer as the fee admin", async function () {
      const feeAdmin = await factory.feeAdmin();
      expect(feeAdmin).to.equal(owner.address);
    });

    it("should have no pools initially", async function () {
      const allPools = await factory.getAllPools();
      expect(allPools.length).to.equal(0);
    });
  });

  describe("createPool", function () {
    it("should create a new pool for a token pair", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      const tx = await factory.createPool(token0Address, token1Address);
      
      // Check event emission
      await expect(tx)
        .to.emit(factory, "PoolCreated")
        .withArgs(
          token0Address < token1Address ? token0Address : token1Address,
          token0Address < token1Address ? token1Address : token0Address,
          await factory.getPool(
            token0Address < token1Address ? token0Address : token1Address,
            token0Address < token1Address ? token1Address : token0Address
          ),
          1, // First pool, so length is 1
          0  // Default fee rate is 0
        );
      
      // Verify pool creation
      const allPools = await factory.getAllPools();
      expect(allPools.length).to.equal(1);
      
      // Check that getPool returns the correct address
      const poolAddress = await factory.getPool(
        token0Address < token1Address ? token0Address : token1Address,
        token0Address < token1Address ? token1Address : token0Address
      );
      expect(poolAddress).to.equal(allPools[0]);
    });

    it("should create a new pool with custom fee rate", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Create a different token pair to avoid "pool exists" error
      const NewToken = await hre.ethers.getContractFactory("NewToken");
      const token2 = await NewToken.deploy("Delta", "DELTA");
      await token2.waitForDeployment();
      const token2Address = await token2.getAddress();
      
      // Custom fee rate of 30 basis points (0.3%)
      const customFeeRate = 30;
      
      const tx = await factory.createPoolWithFee(token0Address, token2Address, customFeeRate);
      
      // Check event emission with custom fee rate
      await expect(tx)
        .to.emit(factory, "PoolCreated")
        .withArgs(
          token0Address < token2Address ? token0Address : token2Address,
          token0Address < token2Address ? token2Address : token0Address,
          await factory.getPool(
            token0Address < token2Address ? token0Address : token2Address,
            token0Address < token2Address ? token2Address : token0Address
          ),
          1, // First pool, so length is 1
          customFeeRate
        );
      
      // Get the pool and check if the fee rate is set correctly
      const poolAddress = await factory.getPool(
        token0Address < token2Address ? token0Address : token2Address,
        token0Address < token2Address ? token2Address : token0Address
      );
      
      const Pool = await ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      // Verify the fee rate was properly set
      expect(await pool.getFeeRate()).to.equal(customFeeRate);
    });

    it("should revert when creating a pool with identical tokens", async function () {
      const token0Address = await token0.getAddress();
      
      await expect(factory.createPool(token0Address, token0Address))
        .to.be.revertedWith("IDENTICAL_ADDRESSES");
    });

    it("should revert when creating a pool with zero address", async function () {
      const token0Address = await token0.getAddress();
      
      await expect(factory.createPool(token0Address, ethers.ZeroAddress))
        .to.be.revertedWith("ZERO_ADDRESS");
    });

    it("should revert when creating a pool that already exists", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Create the pool first
      await factory.createPool(token0Address, token1Address);
      
      // Try to create it again
      await expect(factory.createPool(token0Address, token1Address))
        .to.be.revertedWith("POOL_EXISTS");
    });

    it("should handle token order consistently", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Sort tokens for consistent addressing
      const [sortedToken0, sortedToken1] = token0Address < token1Address 
        ? [token0Address, token1Address]
        : [token1Address, token0Address];
      
      // Create pool with tokens in one order
      await factory.createPool(token0Address, token1Address);
      const pool1 = await factory.getPool(sortedToken0, sortedToken1);
      
      // Reset state
      await ethers.provider.send("evm_revert", [snapshotId]);
      snapshotId = await ethers.provider.send("evm_snapshot", []);
      
      // Create pool with tokens in reverse order
      await factory.createPool(token1Address, token0Address);
      const pool2 = await factory.getPool(sortedToken0, sortedToken1);
      
      // The pools should have the same address mapping regardless of input order
      expect(pool1).to.equal(pool2);
    });
  });

  describe("getAllPools", function () {
    it("should return all created pools", async function () {
      // Create a few pools
      const NewToken = await hre.ethers.getContractFactory("NewToken");
      const token2 = await NewToken.deploy("Gamma", "GAMMA");
      await token2.waitForDeployment();

      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      const token2Address = await token2.getAddress();
      
      await factory.createPool(token0Address, token1Address);
      await factory.createPool(token0Address, token2Address);
      await factory.createPool(token1Address, token2Address);
      
      const allPools = await factory.getAllPools();
      expect(allPools.length).to.equal(3);
    });
  });

  describe("setFeeAdmin", function () {
    it("should allow fee admin to transfer role", async function () {
      await factory.setFeeAdmin(newAdmin.address);
      const feeAdmin = await factory.feeAdmin();
      expect(feeAdmin).to.equal(newAdmin.address);
    });

    it("should revert when non-admin tries to transfer role", async function () {
      await expect(factory.connect(user).setFeeAdmin(user.address))
        .to.be.revertedWith("Only fee admin can transfer role");
    });

    it("should revert when transferring to zero address", async function () {
      await expect(factory.setFeeAdmin(ethers.ZeroAddress))
        .to.be.revertedWith("New admin cannot be zero address");
    });
  });

  describe("findPool", function () {
    it("should find a pool by token pair", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // Create the pool
      await factory.createPool(token0Address, token1Address);
      
      // Try to find it using both token orders
      const foundPool1 = await factory.findPool(token0Address, token1Address);
      const foundPool2 = await factory.findPool(token1Address, token0Address);
      
      const expectedPool = await factory.getPool(
        token0Address < token1Address ? token0Address : token1Address,
        token0Address < token1Address ? token1Address : token0Address
      );
      
      expect(foundPool1).to.equal(expectedPool);
      expect(foundPool2).to.equal(expectedPool);
    });
    
    it("should return zero address for non-existent pool", async function () {
      const token0Address = await token0.getAddress();
      const token1Address = await token1.getAddress();
      
      // We haven't created any pools yet
      const foundPool = await factory.findPool(token0Address, token1Address);
      expect(foundPool).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setDefaultFeeRate", function () {
    it("should allow fee admin to set default fee rate", async function () {
      const newDefaultFeeRate = 50; // 0.5%
      await factory.setDefaultFeeRate(newDefaultFeeRate);
      expect(await factory.defaultFeeRate()).to.equal(newDefaultFeeRate);
    });

    it("should use the new default fee rate when creating pools", async function () {
      // Set a new default fee rate
      const newDefaultFeeRate = 50; // 0.5%
      await factory.setDefaultFeeRate(newDefaultFeeRate);
      
      // Create a new pool using the regular createPool method
      const NewToken = await hre.ethers.getContractFactory("NewToken");
      const token2 = await NewToken.deploy("Epsilon", "EPS");
      await token2.waitForDeployment();
      const token2Address = await token2.getAddress();
      
      const token0Address = await token0.getAddress();
      
      const tx = await factory.createPool(token0Address, token2Address);
      
      // Check that the event has the new default fee rate
      await expect(tx)
        .to.emit(factory, "PoolCreated")
        .withArgs(
          token0Address < token2Address ? token0Address : token2Address,
          token0Address < token2Address ? token2Address : token0Address,
          await factory.getPool(
            token0Address < token2Address ? token0Address : token2Address,
            token0Address < token2Address ? token2Address : token0Address
          ),
          1, // First pool, so length is 1
          newDefaultFeeRate
        );
      
      // Get the pool and verify the fee rate
      const poolAddress = await factory.getPool(
        token0Address < token2Address ? token0Address : token2Address,
        token0Address < token2Address ? token2Address : token0Address
      );
      
      const Pool = await ethers.getContractFactory("Pool");
      const pool = Pool.attach(poolAddress);
      
      expect(await pool.getFeeRate()).to.equal(newDefaultFeeRate);
    });

    it("should revert when non-admin tries to set default fee rate", async function () {
      await expect(factory.connect(user).setDefaultFeeRate(50))
        .to.be.revertedWith("Only fee admin can update default fee rate");
    });

    it("should revert when setting fee rate above 100%", async function () {
      await expect(factory.setDefaultFeeRate(10001)) // 100.01%
        .to.be.revertedWith("Fee rate cannot exceed 100%");
    });
  });
}); 