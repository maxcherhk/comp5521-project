"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Menu, MenuItem, Input } from "@mui/material";
import { ethers } from "ethers";
import {
	getAmountOut,
	getContracts,
	getPoolInfo,
	getTokenBalances,
	getRequiredAmount1,
	swapTokens,
	addLiquidity,
} from "../utils/contract"; // Import helper functions
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

const tokens = ["ETH", "DAI", "USDC"];

export default function SwapBox() {
	const [mode, setMode] = useState("swap");
	const [anchorEl, setAnchorEl] = useState(null);
	const [selectedToken, setSelectedToken] = useState("ETH");
	const [buyToken, setBuyToken] = useState("");

	/* wallet related */
	const [isWalletConnected, setIsWalletConnected] = useState(false); // Track wallet connection
	const [account, setAccount] = useState(null);
	const [contracts, setContracts] = useState(null);
	const [provider, setProvider] = useState(null);

	const handleConnectWallet = async () => {
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

			// get balance
			const balances = await getTokenBalances(initializedContracts, accounts[0]);
			setBalance0(balances.token0);
			setBalance1(balances.token1);

			// get pool info
			const info = await getPoolInfo(initializedContracts);
			setPoolInfo(info);
			console.log(info);

			alert(`Wallet connected!`);
		} catch (error) {
			console.error("Detailed connection error:", error);
			alert(`Failed to connect: ${error.message}`);
		}
	};

	/* balance related */
	const [balance0, setBalance0] = useState(0);
	const [balance1, setBalance1] = useState(0);
	const [poolInfo, setPoolInfo] = useState({ token0Balance: "0", token1Balance: "0" });

	/* swap related */
	const [fromToken, setFromToken] = useState("ALPHA");
	const [toToken, setToToken] = useState("BETA");
	const [fromAmount, setFromAmount] = useState("");
	const [toAmount, setToAmount] = useState("");

	/* add liquidity related */
	const [token0Amount, setToken0Amount] = useState("");
	const [token1Amount, setToken1Amount] = useState("");

	const handleModeChange = (event, newMode) => {
		if (newMode !== null) setMode(newMode);
	};

	const handleMenuOpen = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleSelectToken = (token) => {
		setSelectedToken(token);
		setAnchorEl(null);
	};

	const handleBuyTokenSelect = (token) => {
		setBuyToken(token);
		setAnchorEl(null);
	};

	return (
		<>
			{/* Sell Box */}
			<Box
				sx={{
					background: "#1e1e1e",
					borderRadius: 3,
					p: 2,
				}}
			>
				<Typography variant="body2" color="gray">
					Sell
				</Typography>
				<Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
					<TextField
						variant="standard"
						placeholder="0"
						InputProps={{ disableUnderline: true }}
						sx={{
							input: { fontSize: 28, color: "white" },
							width: "70%",
						}}
					/>
					<Button
						variant="outlined"
						onClick={handleMenuOpen}
						sx={{
							color: "white",
							borderColor: "#333",
							textTransform: "none",
							borderRadius: 3,
							minWidth: 90,
						}}
					>
						{selectedToken}
					</Button>
				</Box>
				<Typography variant="caption" color="gray">
					$0
				</Typography>
			</Box>

			{/* Arrow */}
			<Box display="flex" justifyContent="center">
				<Button
					sx={{
						background: "#1e1e1e",
						borderRadius: "50%", // Makes the button circular
						width: 48, // Explicitly set width
						height: 48, // Match height to width for a perfect circle
						display: "flex", // Center the icon
						alignItems: "center",
						justifyContent: "center",
						minWidth: 0, // Prevents Material-UI's default button width
						padding: 0, // Removes extra padding
					}}
				>
					<ArrowDownwardIcon />
				</Button>
			</Box>

			{/* Buy Box */}
			<Box
				sx={{
					background: "#1e1e1e",
					borderRadius: 3,
					p: 2,
				}}
			>
				<Typography variant="body2" color="gray">
					Buy
				</Typography>
				<Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
					<Input
						variant="standard"
						placeholder="0"
						disableUnderline
						sx={{
							input: { fontSize: 28, color: "white" },
							width: "70%",
						}}
					/>
					<Button
						variant="contained"
						onClick={handleMenuOpen}
						sx={{
							backgroundColor: "#00C2A8",
							color: "white",
							textTransform: "none",
							borderRadius: 3,
							minWidth: 90,
						}}
					>
						{buyToken || "Select token"}
					</Button>
				</Box>
				<Typography variant="caption" color="gray">
					$0
				</Typography>
			</Box>

			{/* Connect Wallet Button */}
			<Button
				fullWidth
				sx={{
					mt: 2,
					backgroundColor: "#00C2A8",
					color: "white",
					textTransform: "none",
					borderRadius: 3,
					p: 1.5,
					fontWeight: "bold",
					"&:hover": { backgroundColor: "#1F8EF1" },
				}}
				onClick={handleConnectWallet}
			>
				{!isWalletConnected ? "Connect wallet" : "Swap"}
			</Button>

			{/* Token Select Dropdown */}
			<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
				{tokens.map((token) => (
					<MenuItem
						key={token}
						onClick={() => {
							if (!buyToken) handleSelectToken(token);
							else handleBuyTokenSelect(token);
						}}
					>
						{token}
					</MenuItem>
				))}
			</Menu>
			{!isWalletConnected ? null : (
				<Box
					sx={{
						backgroundColor: "#1e1e1e",
						borderRadius: 3,
						p: 2,
						mt: 3,
					}}
				>
					<Typography variant="h6" color="white" gutterBottom>
						Your Wallet Balances
					</Typography>
					<Box display="flex" justifyContent="space-between" mt={1}>
						<Typography variant="body1" color="gray">
							{balance0} ALPHA
						</Typography>
						<Typography variant="body1" color="gray">
							{balance1} BETA
						</Typography>
					</Box>
				</Box>
			)}
		</>
	);
}
