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
	const [balance0, setBalance0] = useState(0);
	const [balance1, setBalance1] = useState(0);
	const [poolInfo, setPoolInfo] = useState({ token0Balance: "0", token1Balance: "0" });

	// Function to connect the wallet
	const connectWallet = async () => {
		await connectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalance0, setBalance1, setPoolInfo);
	};

	const disconnectWallet = () => {
		disconnectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalance0, setBalance1, setPoolInfo);
	};

	return (
		<WalletContext.Provider
			value={{
				isWalletConnected,
				account,
				provider,
				contracts,
				balance0,
				balance1,
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
