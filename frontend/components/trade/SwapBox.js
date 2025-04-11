"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Menu, MenuItem, Input } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useWallet } from "../../context/WalletContext";
const { getAllTokens } = require("../../utils/token-address");

export default function SwapBox() {
	const tokens = getAllTokens();
	const [sellAnchorEl, setSellAnchorEl] = useState(null); // Separate state for Sell dropdown
	const [buyAnchorEl, setBuyAnchorEl] = useState(null); // Separate state for Buy dropdown
	const [sellToken, setSellToken] = useState("ALPHA");
	const [buyToken, setBuyToken] = useState("");
	const [sellAmount, setSellAmount] = useState(""); // State to store the sell amount

	const { isWalletConnected, account, balance0, balance1, connectWallet } = useWallet();

	const handleSellMenuOpen = (event) => {
		setSellAnchorEl(event.currentTarget);
	};

	const handleBuyMenuOpen = (event) => {
		setBuyAnchorEl(event.currentTarget);
	};

	const handleSelectSellToken = (token) => {
		setSellToken(token);
		setSellAnchorEl(null);
	};

	const handleSelectBuyToken = (token) => {
		setBuyToken(token);
		setBuyAnchorEl(null);
	};

	// Function to handle the swap action
	const handleSwap = () => {
		if (!sellAmount || !sellToken || !buyToken) {
			alert("Please enter a valid amount and select both tokens.");
			return;
		}

		// Call your swap logic here
		console.log(`Swapping ${sellAmount} ${sellToken} for ${buyToken}`);
		// Example: Call an API or smart contract function
		// swapTokens(sellAmount, selectedToken, buyToken);
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
					<Input
						type="number"
						variant="standard"
						placeholder="0"
						disableUnderline
						sx={{
							input: { fontSize: 28, color: "white" },
							width: "70%",
							"& input": {
								MozAppearance: "textfield",
								"&::-webkit-outer-spin-button": {
									display: "none",
								},
								"&::-webkit-inner-spin-button": {
									display: "none",
								},
							},
						}}
					/>
					<Button
						variant={sellToken ? "outlined" : "contained"}
						onClick={handleSellMenuOpen}
						sx={{
							backgroundColor: sellToken ? "transparent" : "#00C2A8",
							color: "white",
							borderColor: sellToken ? "#333" : "transparent",
							textTransform: "none",
							borderRadius: 3,
							minWidth: 90,
							padding: "6px 12px", // Adjust padding for better alignment
						}}
					>
						{sellToken || "Select token"}
						<KeyboardArrowDownIcon />
					</Button>
				</Box>
				<Typography variant="caption" color="gray">
					$0
				</Typography>
			</Box>

			{/* Arrow */}
			<Box display="flex" margin={1} justifyContent="center">
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
					onClick={() => {
						// Swap the tokens
						setSellToken(buyToken || ""); // If no Buy token is selected, clear Sell token
						setBuyToken(sellToken); // Set Buy token to the current Sell token
					}}
				>
					<KeyboardArrowDownIcon />
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
						type="number"
						variant="standard"
						placeholder="0"
						disableUnderline
						sx={{
							input: { fontSize: 28, color: "white" },
							width: "70%",
							"& input": {
								MozAppearance: "textfield",
								"&::-webkit-outer-spin-button": {
									display: "none",
								},
								"&::-webkit-inner-spin-button": {
									display: "none",
								},
							},
						}}
					/>
					<Button
						variant={buyToken ? "outlined" : "contained"}
						onClick={handleBuyMenuOpen}
						sx={{
							backgroundColor: buyToken ? "transparent" : "#00C2A8",
							color: "white",
							borderColor: buyToken ? "#333" : "transparent",
							textTransform: "none",
							borderRadius: 3,
							minWidth: 90,
							padding: "6px 12px", // Adjust padding for better alignment
						}}
					>
						{buyToken || "Select token"}
						<KeyboardArrowDownIcon sx={{ marginLeft: 1 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="gray">
					$0
				</Typography>
			</Box>

			{/* Connect Wallet or Swap Button */}
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
				onClick={!isWalletConnected ? connectWallet : handleSwap} // Call connectWallet or handleSwap
			>
				{!isWalletConnected ? "Connect wallet" : "Swap"}
			</Button>

			{/* Sell Token Select Dropdown */}
			<Menu anchorEl={sellAnchorEl} open={Boolean(sellAnchorEl)} onClose={() => setSellAnchorEl(null)}>
				{tokens.map((token) => (
					<MenuItem key={token.name} onClick={() => handleSelectSellToken(token.name)}>
						{token.name}
					</MenuItem>
				))}
			</Menu>

			{/* Buy Token Select Dropdown */}
			<Menu anchorEl={buyAnchorEl} open={Boolean(buyAnchorEl)} onClose={() => setBuyAnchorEl(null)}>
				{tokens.map((token) => (
					<MenuItem key={token.name} onClick={() => handleSelectBuyToken(token.name)}>
						{token.name}
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
