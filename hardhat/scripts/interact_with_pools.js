// Script to interact with multiple liquidity pools
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Interacting with multiple liquidity pools...");
  
  // Get deployed contracts from command line arguments
  const routerAddress = process.argv[2];
  const factoryAddress = process.argv[3];
  const tokenAAddress = process.argv[4];
  const tokenBAddress = process.argv[5];
  const tokenCAddress = process.argv[6];
  
  if (!routerAddress || !factoryAddress || !tokenAAddress || !tokenBAddress || !tokenCAddress) {
    console.error("Please provide the router, factory, and token addresses as arguments");
    console.log("Example: npx hardhat run scripts/interact_with_pools.js --network localhost ROUTER_ADDR FACTORY_ADDR TOKEN_A_ADDR TOKEN_B_ADDR TOKEN_C_ADDR");
    return;
  }

  // Get contract instances
  const router = await ethers.getContractAt("Router", routerAddress);
  const factory = await ethers.getContractAt("PoolFactory", factoryAddress);
  const tokenA = await ethers.getContractAt("NewToken", tokenAAddress);
  const tokenB = await ethers.getContractAt("NewToken", tokenBAddress);
  const tokenC = await ethers.getContractAt("NewToken", tokenCAddress);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // Step 1: Get pool addresses
  const poolAB = await factory.findPool(tokenAAddress, tokenBAddress);
  const poolBC = await factory.findPool(tokenBAddress, tokenCAddress);
  const poolAC = await factory.findPool(tokenAAddress, tokenCAddress);
  
  console.log("Pool A-B:", poolAB);
  console.log("Pool B-C:", poolBC);
  console.log("Pool A-C:", poolAC);

  // Step 2: Approve tokens for router usage
  const approvalAmount = ethers.parseEther("10000");
  
  console.log("Approving Token A for router...");
  await tokenA.approve(routerAddress, approvalAmount);
  
  console.log("Approving Token B for router...");
  await tokenB.approve(routerAddress, approvalAmount);
  
  console.log("Approving Token C for router...");
  await tokenC.approve(routerAddress, approvalAmount);

  // Step 3: Add liquidity to each pool
  console.log("\nAdding liquidity to Pool A-B...");
  const addLiquidityTxAB = await router.addLiquidityFromToken0(
    tokenAAddress,
    tokenBAddress,
    ethers.parseEther("100")
  );
  await addLiquidityTxAB.wait();
  console.log("Liquidity added to Pool A-B");

  console.log("Adding liquidity to Pool B-C...");
  const addLiquidityTxBC = await router.addLiquidityFromToken0(
    tokenBAddress,
    tokenCAddress,
    ethers.parseEther("100")
  );
  await addLiquidityTxBC.wait();
  console.log("Liquidity added to Pool B-C");

  console.log("Adding liquidity to Pool A-C...");
  const addLiquidityTxAC = await router.addLiquidityFromToken0(
    tokenAAddress,
    tokenCAddress,
    ethers.parseEther("100")
  );
  await addLiquidityTxAC.wait();
  console.log("Liquidity added to Pool A-C");

  // Step 4: Perform direct swaps
  console.log("\nPerforming direct swap from Token A to Token B...");
  const quoteAB = await router.getAmountOut(
    tokenAAddress,
    ethers.parseEther("10"),
    tokenBAddress
  );
  console.log(`Expected to receive: ${ethers.formatEther(quoteAB[0])} Token B`);
  
  const swapTxAB = await router.swap(
    tokenAAddress,
    ethers.parseEther("10"),
    tokenBAddress,
    0 // No minimum amount
  );
  await swapTxAB.wait();
  console.log("Direct swap A->B complete");

  // Step 5: Perform multi-hop swap
  console.log("\nPerforming multi-hop swap from Token A to Token C through Token B...");
  const swapPath = [tokenAAddress, tokenBAddress, tokenCAddress];
  
  const multiHopTx = await router.swapMultiHop(
    swapPath,
    ethers.parseEther("10"),
    0 // No minimum amount
  );
  await multiHopTx.wait();
  console.log("Multi-hop swap A->B->C complete");

  // Step 6: Check balances
  const balanceA = await tokenA.balanceOf(signer.address);
  const balanceB = await tokenB.balanceOf(signer.address);
  const balanceC = await tokenC.balanceOf(signer.address);
  
  console.log("\nFinal balances:");
  console.log(`Token A: ${ethers.formatEther(balanceA)}`);
  console.log(`Token B: ${ethers.formatEther(balanceB)}`);
  console.log(`Token C: ${ethers.formatEther(balanceC)}`);
  
  // Step 7: Get pool LP tokens
  const poolABContract = await ethers.getContractAt("Pool", poolAB);
  const poolBCContract = await ethers.getContractAt("Pool", poolBC);
  const poolACContract = await ethers.getContractAt("Pool", poolAC);
  
  const lpAB = await poolABContract.balanceOf(signer.address);
  const lpBC = await poolBCContract.balanceOf(signer.address);
  const lpAC = await poolACContract.balanceOf(signer.address);
  
  console.log("\nLP token balances:");
  console.log(`Pool A-B: ${ethers.formatEther(lpAB)}`);
  console.log(`Pool B-C: ${ethers.formatEther(lpBC)}`);
  console.log(`Pool A-C: ${ethers.formatEther(lpAC)}`);
  
  console.log("\nPool interaction complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 