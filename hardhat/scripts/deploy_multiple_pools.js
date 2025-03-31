// Deploy script for setting up multiple liquidity pools
const hre = require("hardhat");

async function main() {
  console.log("Deploying multiple liquidity pool system...");
  
  // Deploy test tokens
  const NewToken = await hre.ethers.getContractFactory("NewToken");
  
  console.log("Deploying token A...");
  const tokenA = await NewToken.deploy("Alpha", "ALPHA");
  await tokenA.waitForDeployment();
  console.log("Token A deployed at:", await tokenA.getAddress());
  
  console.log("Deploying token B...");
  const tokenB = await NewToken.deploy("Beta", "BETA");
  await tokenB.waitForDeployment();
  console.log("Token B deployed at:", await tokenB.getAddress());
  
  console.log("Deploying token C...");
  const tokenC = await NewToken.deploy("Gamma", "GAMMA");
  await tokenC.waitForDeployment();
  console.log("Token C deployed at:", await tokenC.getAddress());

  // Deploy the factory
  console.log("Deploying Pool Factory...");
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Pool Factory deployed at:", factoryAddress);

  // Deploy the router
  console.log("Deploying Router...");
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(factoryAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed at:", routerAddress);

  // Create pools through the factory
  console.log("Creating Token A - Token B pool...");
  const tx1 = await factory.createPool(
    await tokenA.getAddress(),
    await tokenB.getAddress()
  );
  await tx1.wait();
  
  console.log("Creating Token B - Token C pool...");
  const tx2 = await factory.createPool(
    await tokenB.getAddress(),
    await tokenC.getAddress()
  );
  await tx2.wait();
  
  console.log("Creating Token A - Token C pool...");
  const tx3 = await factory.createPool(
    await tokenA.getAddress(),
    await tokenC.getAddress()
  );
  await tx3.wait();

  // Get all pools
  const pools = await factory.getAllPools();
  console.log("All pools created:", pools);

  // Get the A-B pool
  const poolAB = await factory.findPool(
    await tokenA.getAddress(),
    await tokenB.getAddress()
  );
  console.log("Pool A-B:", poolAB);
  
  // Get the B-C pool
  const poolBC = await factory.findPool(
    await tokenB.getAddress(),
    await tokenC.getAddress()
  );
  console.log("Pool B-C:", poolBC);
  
  // Get the A-C pool
  const poolAC = await factory.findPool(
    await tokenA.getAddress(),
    await tokenC.getAddress()
  );
  console.log("Pool A-C:", poolAC);
  
  console.log("Multiple pools deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 