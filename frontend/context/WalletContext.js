"use client";
import React, { createContext, useState, useContext, useEffect } from "react";
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

	useEffect(() => {
		const reconnectWallet = async () => {
		  if (localStorage.getItem("isWalletConnected") === "true") {
			await connectWallet();
		  }
		};
		reconnectWallet();
	  }, []);
	  
	// Function to connect the wallet
	const connectWallet = async () => {
		await connectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalances, setPoolInfo);
		localStorage.setItem("isWalletConnected", "true");
	};

	const disconnectWallet = () => {
		disconnectWalletUtil(setProvider, setAccount, setContracts, setIsWalletConnected, setBalances, setPoolInfo);
		localStorage.removeItem("isWalletConnected");
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
				setBalances,
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
