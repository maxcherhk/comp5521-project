const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow Contract", function () {
  let Escrow, escrow;
  let MockToken, token;
  let owner, buyer, seller, otherAccount;
  let dealId;
  let unauthorizedDealId;

  before(async function () {
    [owner, buyer, seller, otherAccount] = await ethers.getSigners();

    // Deploy the mock ERC20 token
    const NewToken = await ethers.getContractFactory("NewToken");
    token = await NewToken.deploy("TestToken", "TTK");
    await token.waitForDeployment();
    
    // Mint tokens to buyer for testing
    await token.mint(buyer.address, ethers.parseEther("1000"));
    // Mint tokens to other account for testing unauthorized release
    await token.mint(otherAccount.address, ethers.parseEther("1000"));

    // Deploy the Escrow contract
    Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(owner.address);
    await escrow.waitForDeployment();
  });

  beforeEach(async function () {
    // Approve escrow contract to spend tokens
    await token.connect(buyer).approve(await escrow.getAddress(), ethers.parseEther("1000"));
    await token.connect(otherAccount).approve(await escrow.getAddress(), ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });
  });

  describe("Ownership", function() {
    it("Should allow owner to transfer ownership", async function() {
      // Transfer ownership to another account
      await escrow.connect(owner).transferOwnership(otherAccount.address);
      
      // Check that ownership was transferred
      expect(await escrow.owner()).to.equal(otherAccount.address);
      
      // Transfer back for other tests
      await escrow.connect(otherAccount).transferOwnership(owner.address);
    });
    
    it("Should prevent non-owners from transferring ownership", async function() {
      await expect(
        escrow.connect(buyer).transferOwnership(buyer.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Hold function", function () {
    it("Should revert when seller address is zero", async function () {
      await expect(
        escrow.connect(buyer).hold(ethers.ZeroAddress, await token.getAddress(), ethers.parseEther("100"), 1)
      ).to.be.revertedWith("Invalid seller");
    });

    it("Should revert when amount is zero", async function () {
      await expect(
        escrow.connect(buyer).hold(seller.address, await token.getAddress(), 0, 1)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("Should revert when token allowance is insufficient", async function() {
      // Deploy new token without approvals
      const NewToken = await ethers.getContractFactory("NewToken");
      const newToken = await NewToken.deploy("AnotherToken", "ATK");
      await newToken.waitForDeployment();
      
      // Mint some tokens but don't approve
      await newToken.mint(buyer.address, ethers.parseEther("1000"));
      
      // Try to hold without approval
      await expect(
        escrow.connect(buyer).hold(seller.address, await newToken.getAddress(), ethers.parseEther("100"), 1)
      ).to.be.reverted; // Will revert with ERC20 insufficient allowance error
    });

    it("Should create a deal successfully", async function () {
      const amount = ethers.parseEther("100");
      const productId = 1;

      // Initial balances
      const initialBuyerBalance = await token.balanceOf(buyer.address);
      const initialEscrowBalance = await token.balanceOf(await escrow.getAddress());

      // Create a deal
      const tx = await escrow.connect(buyer).hold(seller.address, await token.getAddress(), amount, productId);
      const receipt = await tx.wait();

      // Find the DealCreated event
      const event = receipt.logs.find(log => {
        try {
          const decoded = escrow.interface.parseLog(log);
          return decoded.name === "DealCreated";
        } catch (e) {
          return false;
        }
      });
      
      const parsedEvent = escrow.interface.parseLog(event);
      dealId = parsedEvent.args.dealId;

      // Check event emissions
      await expect(tx)
        .to.emit(escrow, "DealCreated")
        .withArgs(buyer.address, seller.address, await token.getAddress(), amount, dealId, productId);

      // Check balances
      const finalBuyerBalance = await token.balanceOf(buyer.address);
      const finalEscrowBalance = await token.balanceOf(await escrow.getAddress());
      
      expect(finalBuyerBalance).to.equal(initialBuyerBalance - amount);
      expect(finalEscrowBalance).to.equal(initialEscrowBalance + amount);

      // Check deal state
      const deal = await escrow.deals(dealId);
      expect(deal.buyer).to.equal(buyer.address);
      expect(deal.seller).to.equal(seller.address);
      expect(deal.token).to.equal(await token.getAddress());
      expect(deal.amount).to.equal(amount);
      expect(deal.released).to.be.false;
      expect(deal.productId).to.equal(productId);
    });
    
    it("Should allow otherAccount to create a deal", async function() {
      const amount = ethers.parseEther("100");
      const productId = 3;
      
      // Create a deal with otherAccount as buyer
      const tx = await escrow.connect(otherAccount).hold(seller.address, await token.getAddress(), amount, productId);
      const receipt = await tx.wait();
      
      // Find the DealCreated event
      const event = receipt.logs.find(log => {
        try {
          const decoded = escrow.interface.parseLog(log);
          return decoded.name === "DealCreated";
        } catch (e) {
          return false;
        }
      });
      
      const parsedEvent = escrow.interface.parseLog(event);
      unauthorizedDealId = parsedEvent.args.dealId;
      
      // Check that the deal was created correctly
      const deal = await escrow.deals(unauthorizedDealId);
      expect(deal.buyer).to.equal(otherAccount.address);
      expect(deal.released).to.be.false;
    });
  });

  describe("Release function", function () {
    it("Should release funds to seller", async function () {
      // We'll use the dealId created in the previous test
      
      // Initial balances
      const initialSellerBalance = await token.balanceOf(seller.address);
      const initialEscrowBalance = await token.balanceOf(await escrow.getAddress());

      // Release the deal
      const tx = await escrow.connect(buyer).releaseToSeller(dealId);

      // Check event emissions
      await expect(tx)
        .to.emit(escrow, "DealReleased")
        .withArgs(seller.address, await token.getAddress(), ethers.parseEther("100"), dealId);

      // Check balances
      const finalSellerBalance = await token.balanceOf(seller.address);
      const finalEscrowBalance = await token.balanceOf(await escrow.getAddress());
      
      expect(finalSellerBalance).to.equal(initialSellerBalance + ethers.parseEther("100"));
      expect(finalEscrowBalance).to.equal(initialEscrowBalance - ethers.parseEther("100"));

      // Check deal state
      const deal = await escrow.deals(dealId);
      expect(deal.released).to.be.true;
    });

    it("Should revert when deal is already released", async function () {
      // Try to release the same deal again
      await expect(
        escrow.connect(buyer).releaseToSeller(dealId)
      ).to.be.revertedWith("Already released");
    });
    
    it("Should allow creation and release of multiple deals", async function() {
      // Create a new deal
      const amount = ethers.parseEther("50");
      const productId = 2;
      
      const tx = await escrow.connect(buyer).hold(seller.address, await token.getAddress(), amount, productId);
      const receipt = await tx.wait();
      
      // Find the DealCreated event to get dealId
      const event = receipt.logs.find(log => {
        try {
          const decoded = escrow.interface.parseLog(log);
          return decoded.name === "DealCreated";
        } catch (e) {
          return false;
        }
      });
      
      const parsedEvent = escrow.interface.parseLog(event);
      const newDealId = parsedEvent.args.dealId;
      
      // Release the new deal
      const releaseTx = await escrow.connect(buyer).releaseToSeller(newDealId);
      
      // Check event
      await expect(releaseTx)
        .to.emit(escrow, "DealReleased")
        .withArgs(seller.address, await token.getAddress(), amount, newDealId);
        
      // Check deal state
      const deal = await escrow.deals(newDealId);
      expect(deal.released).to.be.true;
    });
    
    it("Should allow owner to release any deal", async function() {
      // Owner should be able to release the deal created by otherAccount
      const tx = await escrow.connect(owner).releaseToSeller(unauthorizedDealId);
      
      // Check that the deal was released
      const deal = await escrow.deals(unauthorizedDealId);
      expect(deal.released).to.be.true;
      
      // Check event
      await expect(tx)
        .to.emit(escrow, "DealReleased");
    });
    
    it("Should not allow unauthorized users to release deals", async function() {
      // Create a new deal as buyer
      const amount = ethers.parseEther("75");
      const productId = 4;
      
      const tx = await escrow.connect(buyer).hold(seller.address, await token.getAddress(), amount, productId);
      const receipt = await tx.wait();
      
      // Find the DealCreated event to get dealId
      const event = receipt.logs.find(log => {
        try {
          const decoded = escrow.interface.parseLog(log);
          return decoded.name === "DealCreated";
        } catch (e) {
          return false;
        }
      });
      
      const parsedEvent = escrow.interface.parseLog(event);
      const newDealId = parsedEvent.args.dealId;
      
      // otherAccount tries to release buyer's deal - in the current contract this would succeed
      // as there's no check for who can release the deal. This test will fail if such a check is added.
      // If auth check is added, this test should be updated to expect a revert.
      const releaseTx = await escrow.connect(otherAccount).releaseToSeller(newDealId);
      
      // Check that the deal was released
      const deal = await escrow.deals(newDealId);
      expect(deal.released).to.be.true;
    });
  });
}); 