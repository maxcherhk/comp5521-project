import { ethers } from "ethers";
import { getContracts, getTokenBalances, getPoolInfo } from "./contract"; // Adjust the import path as needed

export const connectWallet = async (
	setProvider,
	setAccount,
	setContracts,
	setIsWalletConnected,
	setBalance0,
	setBalance1,
	setPoolInfo
) => {
	try {
		if (!window.ethereum) {
			throw new Error("MetaMask not installed");
		}
		const provider = new ethers.BrowserProvider(window.ethereum);
		const accounts = await provider.send("eth_requestAccounts", []);
		const signer = await provider.getSigner();

		const initializedContracts = await getContracts(signer);

		setProvider(provider);
		setAccount(accounts[0]);
		setContracts(initializedContracts);
		setIsWalletConnected(true);

		// Get balance
		const balances = await getTokenBalances(initializedContracts, accounts[0]);
		setBalance0(balances.token0);
		setBalance1(balances.token1);

		// Get pool info
		const info = await getPoolInfo(initializedContracts);
		setPoolInfo(info);
		console.log(info);

		alert(`Wallet connected!`);
	} catch (error) {
		console.error("Detailed connection error:", error);
		alert(`Failed to connect: ${error.message}`);
	}
};

export const disconnectWallet = (
	setProvider,
	setAccount,
	setContracts,
	setIsWalletConnected,
	setBalance0,
	setBalance1,
	setPoolInfo
) => {
	try {
		// Reset all wallet-related states
		setProvider(null);
		setAccount(null);
		setContracts(null);
		setIsWalletConnected(false);
		setBalance0(0);
		setBalance1(0);
		setPoolInfo(null);

		alert("Wallet disconnected!");
	} catch (error) {
		console.error("Error during wallet disconnection:", error);
		alert(`Failed to disconnect: ${error.message}`);
	}
};
