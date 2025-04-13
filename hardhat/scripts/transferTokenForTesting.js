const { ethers } = require("hardhat");
const addresses = require("../../frontend/utils/deployed-addresses.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipientAddress = "0xadF156f13968183836fD2d28a75f84CCB0e9475f";

  const Alpha = await ethers.getContractAt("NewToken", addresses.tokenA, deployer);
  const Beta = await ethers.getContractAt("NewToken", addresses.tokenB, deployer);
  const Gamma = await ethers.getContractAt("NewToken", addresses.tokenC, deployer);
  const Delta = await ethers.getContractAt("NewToken", addresses.tokenD, deployer);

  const amount = ethers.parseEther("500000");

  await Alpha.transfer(recipientAddress, amount);
  console.log(`✅ Transferred  ALPHA to `);

  await Beta.transfer(recipientAddress, amount);
  console.log(`✅ Transferred  BETA to `);

  await Gamma.transfer(recipientAddress, amount);
  console.log(`✅ Transferred  CHARLIE to `);

  await Delta.transfer(recipientAddress, amount);
  console.log(`✅ Transferred  DELTA to `);

  // ✅ Safe balance check
  const balanceAlpha = await Alpha.balanceOf(recipientAddress);
  console.log(`🧾 ALPHA balance of recipient: ${ethers.formatEther(balanceAlpha)} tokens`);
}

main().catch((error) => {
  console.error("❌ Transfer script failed:", error);
  process.exit(1);
}); 