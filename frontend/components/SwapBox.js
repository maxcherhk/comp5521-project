"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Menu, MenuItem, Input } from "@mui/material";
import { ethers } from "ethers";
import { getAmountOut, getContracts, getPoolInfo, getTokenBalances, getRequiredAmount1, swapTokens, addLiquidity } from "../utils/contract"; // Import helper functions
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useWallet } from "../context/WalletContext";

const tokens = ["ETH", "DAI", "USDC"];

export default function SwapBox() {
	const [anchorEl, setAnchorEl] = useState(null);
	const [selectedToken, setSelectedToken] = useState("ETH");
	const [buyToken, setBuyToken] = useState("");

	const { isWalletConnected, account, balance0, balance1, connectWallet } = useWallet();

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
				onClick={connectWallet}
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
					<Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={2} mt={1}>
						{Object.entries({ ALPHA: balance0, BETA: balance1 }).map(([token, balance]) => (
							<Box
								key={token}
								sx={{
									backgroundColor: "#2a2a2a",
									borderRadius: 2,
									p: 1.5,
									textAlign: "center",
								}}
							>
								<Typography variant="body1" color="white" fontWeight="bold">
									{balance}
								</Typography>
								<Typography variant="caption" color="gray">
									{token}
								</Typography>
							</Box>
						))}
					</Box>
				</Box>
			)}
		</>
	);
}
