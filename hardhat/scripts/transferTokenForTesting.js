const { ethers } = require("hardhat");
const addresses = require("../../frontend/utils/deployed-addresses.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipientAddress = "0x0F6A3F394742B02eA5394A5Ca79800b1103e4735";

  const Alpha = await ethers.getContractAt("NewToken", addresses.tokenA, deployer);
  const Beta = await ethers.getContractAt("NewToken", addresses.tokenB, deployer);
  const Gamma = await ethers.getContractAt("NewToken", addresses.tokenC, deployer);
  const Delta = await ethers.getContractAt("NewToken", addresses.tokenD, deployer);

  const amount = ethers.parseEther("500000");

  await Alpha.transfer(recipientAddress, amount);
  console.log(`✅ Transferred ${amount} ALPHA to ${recipientAddress}`);

  await Beta.transfer(recipientAddress, amount);
  console.log(`✅ Transferred ${amount} BETA to ${recipientAddress}`);

  await Gamma.transfer(recipientAddress, amount);
  console.log(`✅ Transferred ${amount} CHARLIE to ${recipientAddress}`);

  await Delta.transfer(recipientAddress, amount);
  console.log(`✅ Transferred ${amount} DELTA to ${recipientAddress}`);

  // ✅ Safe balance check
  const balanceAlpha = await Alpha.balanceOf(recipientAddress);
  console.log(`🧾 ALPHA balance of recipient: ${ethers.formatEther(balanceAlpha)} tokens`);
}

main().catch((error) => {
  console.error("❌ Transfer script failed:", error);
  process.exit(1);
});
