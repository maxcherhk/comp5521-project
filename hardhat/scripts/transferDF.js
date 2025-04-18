const { ethers } = require("hardhat");

async function main() {
	// Connect to the Hardhat network
	const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

	// Replace with the private key of the sender account
	const senderPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default Hardhat account #1
	const senderWallet = new ethers.Wallet(senderPrivateKey, provider);

	// Replace with the address of the recipient account
	const recipientAddress = "0x0F6A3F394742B02eA5394A5Ca79800b1103e4735"; // Your address (from MetaMask)

	// Amount to transfer (in Ether)
	const amountInEther = "1000"; // 1 ETH
	const amountInWei = ethers.parseEther(amountInEther);

	// Send the transaction
	console.log(`Sending ${amountInEther} DF from ${senderWallet.address} to ${recipientAddress}...`);
	const tx = await senderWallet.sendTransaction({
		to: recipientAddress,
		value: amountInWei,
	});

	// Wait for the transaction to be mined
	await tx.wait();
	console.log(`Transaction successful with hash: ${tx.hash}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
