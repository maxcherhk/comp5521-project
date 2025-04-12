"use client";
import React, { createContext, useState, useContext } from "react";
import { connectWallet as connectWalletUtil } from "../utils/wallet"; // Import the utility function
import { disconnectWallet as disconnectWalletUtil } from "../utils/wallet";
// Create the Wallet Context
const WalletContext = createContext();

// Wallet Provider Component
export const WalletProvider = ({ children }) => {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [account, setAccount] = useState(null);
	const [provider, setProvider] = useState(null);
	const [contracts, setContracts] = useState(null);
	const [balances, setBalances] = useState({
		ALPHA: "0",
		BETA: "0",
		CHARLIE: "0",
		DELTA: "0",
	});
	const [poolInfo, setPoolInfo] = useState({ token0Balance: "0", token1Balance: "0" });

	// Function to connect the wallet
	const connectWallet = async () => {
		await connectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalances, setPoolInfo);
	};

	const disconnectWallet = () => {
		disconnectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalances, setPoolInfo);
	};

	return (
		<WalletContext.Provider
			value={{
				isWalletConnected,
				account,
				provider,
				contracts,
				balances,
				poolInfo,
				connectWallet,
				disconnectWallet,
			}}
		>
			{children}
		</WalletContext.Provider>
	);
};

// Custom Hook to Use Wallet Context
export const useWallet = () => {
	return useContext(WalletContext);
};
