// Deploy script for setting up multiple liquidity pools
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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
  const tokenC = await NewToken.deploy("Charlie", "CHARLIE");
  await tokenC.waitForDeployment();
  console.log("Token C deployed at:", await tokenC.getAddress());

  console.log("Deploying token D...");
  const tokenD = await NewToken.deploy("Delta", "DELTA");
  await tokenD.waitForDeployment();
  console.log("Token D deployed at:", await tokenD.getAddress());

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

  console.log("Creating Token A - Token D pool...");
  const tx4 = await factory.createPool(
    await tokenA.getAddress(),
    await tokenD.getAddress()
  );
  await tx4.wait();

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
  
  const poolAD = await factory.findPool(
    await tokenA.getAddress(),
    await tokenD.getAddress()
  );
  console.log("Pool A-D:", poolAD);
  
  console.log("Multiple pools deployment complete!");


  // Write contract addresses to file
  const addresses = {
    tokenA: await tokenA.getAddress(),
    tokenB: await tokenB.getAddress(),
    tokenC: await tokenC.getAddress(),
    tokenD: await tokenD.getAddress(),
    poolAB: poolAB,
    poolBC: poolBC,
    poolAC: poolAC,
    poolAD: poolAD,
    factory: await factory.getAddress(),
    router: await router.getAddress()
  };

  // Create utils directory if it doesn't exist
  const utilsPath = path.join(__dirname, "../frontend/src/utils");
  if (!fs.existsSync(utilsPath)) {
    fs.mkdirSync(utilsPath, { recursive: true });
  }

  // Write data to the file (creates the file if it doesn't exist)
  fs.writeFileSync(path.join(utilsPath, "deployed-addresses.json"),
  JSON.stringify(addresses, null, 2), { flag: 'w' }); // 'w' flag ensures the file is created or overwritten
  console.log("\nContract addresses have been written to deployed-addresses.json");

  // Export ABIs
  const artifacts = {
    NewToken: await hre.artifacts.readArtifact("NewToken"),
    LPToken: await hre.artifacts.readArtifact("LPToken"),
    Pool: await hre.artifacts.readArtifact("Pool")
  };
  
  const abis = {
    NewToken: artifacts.NewToken.abi,
    LPToken: artifacts.LPToken.abi,
    Pool: artifacts.Pool.abi
  };
  
  // Write data to the file (creates the file if it doesn't exist)
  fs.writeFileSync(path.join(utilsPath, "deployed-abis.json"),
  JSON.stringify(abis, null, 2), { flag: 'w' }); // 'w' flag ensures the file is created or overwritten
  console.log("\nABIs have been written to deployed-abis.json");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 