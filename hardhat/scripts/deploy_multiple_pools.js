const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying multiple liquidity pool system...");

  // Deploy tokens
  const NewToken = await hre.ethers.getContractFactory("NewToken");

  console.log("Deploying token A...");
  const tokenA = await NewToken.deploy("Alpha", "ALPHA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("Token A deployed at:", tokenAAddress);

  console.log("Deploying token B...");
  const tokenB = await NewToken.deploy("Beta", "BETA");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("Token B deployed at:", tokenBAddress);

  console.log("Deploying token C...");
  const tokenC = await NewToken.deploy("Charlie", "CHARLIE");
  await tokenC.waitForDeployment();
  const tokenCAddress = await tokenC.getAddress();
  console.log("Token C deployed at:", tokenCAddress);

  console.log("Deploying token D...");
  const tokenD = await NewToken.deploy("Delta", "DELTA");
  await tokenD.waitForDeployment();
  const tokenDAddress = await tokenD.getAddress();
  console.log("Token D deployed at:", tokenDAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Mint tokens
  const amount = hre.ethers.parseEther("1000000");
  await tokenA.mint(deployer.address, amount);
  await tokenB.mint(deployer.address, amount);
  await tokenC.mint(deployer.address, amount);
  await tokenD.mint(deployer.address, amount);
  console.log("✅ Minted 1M tokens to deployer.");

  // Deploy PoolFactory
  console.log("Deploying Pool Factory...");
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Pool Factory deployed at:", factoryAddress);

  // Deploy Router
  console.log("Deploying Router...");
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(factoryAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed at:", routerAddress);

  // Deploy Escrow
  console.log("Deploying Escrow...");
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(deployer.address); // ✅ Pass owner address
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("Escrow deployed at:", escrowAddress);

  // Create pools
  await factory.createPoolWithFee(tokenAAddress, tokenBAddress, 300);
  await factory.createPoolWithFee(tokenBAddress, tokenCAddress, 200);
  await factory.createPoolWithFee(tokenCAddress, tokenDAddress, 100);
  await factory.createPoolWithFee(tokenAAddress, tokenDAddress, 500);

  const poolAB = await factory.findPool(tokenAAddress, tokenBAddress);
  const poolBC = await factory.findPool(tokenBAddress, tokenCAddress);
  const poolCD = await factory.findPool(tokenCAddress, tokenDAddress);
  const poolAD = await factory.findPool(tokenAAddress, tokenDAddress);

  console.log("✅ All pools created.");

  // Save addresses
  const addresses = {
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    tokenC: tokenCAddress,
    tokenD: tokenDAddress,
    poolAB,
    poolBC,
    poolCD,
    poolAD,
    factory: factoryAddress,
    router: routerAddress,
    escrow: escrowAddress
  };

  const utilsPath = path.join(__dirname, "../../frontend/utils");
  if (!fs.existsSync(utilsPath)) {
    fs.mkdirSync(utilsPath, { recursive: true });
  }

  fs.writeFileSync(path.join(utilsPath, "deployed-addresses.json"), JSON.stringify(addresses, null, 2), { flag: "w" });
  console.log("✅ Addresses written to deployed-addresses.json");

  // Export ABIs including Escrow
  const abis = {
    NewToken: (await hre.artifacts.readArtifact("NewToken")).abi,
    LPToken: (await hre.artifacts.readArtifact("LPToken")).abi,
    Pool: (await hre.artifacts.readArtifact("Pool")).abi,
    Router: (await hre.artifacts.readArtifact("Router")).abi,
    Escrow: (await hre.artifacts.readArtifact("Escrow")).abi // ✅ ADD THIS
  };

  fs.writeFileSync(path.join(utilsPath, "deployed-abis.json"), JSON.stringify(abis, null, 2), { flag: "w" });
  console.log("✅ ABIs written to deployed-abis.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
