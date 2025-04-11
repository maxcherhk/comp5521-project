const { ethers } = require("hardhat");
const addresses = require("../frontend/src/utils/deployed-addresses.json");  
// hardhat/frontend/src/utils/deployed-addresses.json
// hardhat/scripts/transferTokeForTesting.js
async function main() {
  // Connect to the Hardhat network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Replace with the address of the recipient account
  const recipientAddress = "0x0F6A3F394742B02eA5394A5Ca79800b1103e4735"; // My address (from MetaMask)

  const NewToken = await hre.ethers.getContractFactory("NewToken");
  const Alpha = NewToken.attach(addresses.tokenA);
  const Beta = NewToken.attach(addresses.tokenB);
  const Gamma = NewToken.attach(addresses.tokenC);
  const Delta = NewToken.attach(addresses.tokenD);


  const amount = ethers.parseEther("500000");
  await Alpha.transfer(recipientAddress, amount)
  console.log(`Transferred ${amount} Alpha tokens to ${recipientAddress}`);
  await Beta.transfer(recipientAddress, amount)
  console.log(`Transferred ${amount} Beta tokens to ${recipientAddress}`);
  await Gamma.transfer(recipientAddress, amount)
  console.log(`Transferred ${amount} Gamma tokens to ${recipientAddress}`);
  await Delta.transfer(recipientAddress, amount)
  console.log(`Transferred ${amount} Delta tokens to ${recipientAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });