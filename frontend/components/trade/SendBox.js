"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Menu, MenuItem, Input } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
const { getAllTokens } = require("../../utils/token-address");

export default function SendBox() {
	const tokens = getAllTokens();
	const [amount, setAmount] = useState("");
	const [selectedToken, setSelectedToken] = useState("ALPHA");
	const [anchorEl, setAnchorEl] = useState(null);
	const [recipient, setRecipient] = useState("");

	// Fake conversion for UI (not accurate)
	const tokenAmount =
		amount && !isNaN(amount)
			? (Number(amount) / 1800).toFixed(4) // example: 1 ETH = $1800
			: "0.0000";

	const handleTokenClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleTokenSelect = (token) => {
		setSelectedToken(token);
		setAnchorEl(null);
	};

	return (
		<>
			{/* Top Info Box */}
			<Box
				sx={{
					background: "#1c1c1c",
					borderRadius: 3,
					p: 3,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				<Typography variant="body2" color="text.secondary" mb={2}>
					You're sending
				</Typography>
				<Input
					variant="standard"
					fullWidth
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="$0"
					disableUnderline={true}
					inputProps={{
						inputMode: "decimal",
						style: {
							fontSize: 48,
							textAlign: "center",
							color: "white",
						},
					}}
					sx={{
						input: { paddingBottom: 1 },
						"& .MuiInputBase-root:before": { borderBottom: "none" },
						"& .MuiInputBase-root:after": { borderBottom: "none" },
					}}
				/>
				<Typography variant="body2" color="text.secondary">
					{amount || 0} {selectedToken}
				</Typography>
			</Box>

			{/* Token Selector */}
			<Box
				sx={{
					background: "#1c1c1c",
					borderRadius: 3,
					p: 2,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					cursor: "pointer",
				}}
				onClick={handleTokenClick}
			>
				<Box>
					<Typography color="white" fontWeight={500}>
						{selectedToken}
					</Typography>
					<Typography variant="caption" color="gray">
						Balance: 0 ($0.00)
					</Typography>
				</Box>
				<ExpandMoreIcon sx={{ color: "white" }} />
			</Box>

			{/* Address Input */}
			<TextField
				variant="filled"
				placeholder="Wallet address or ENS name"
				fullWidth
				value={recipient}
				onChange={(e) => setRecipient(e.target.value)}
				sx={{
					input: {
						color: "white",
					},
					backgroundColor: "#1c1c1c",
					borderRadius: 3,
					"& .MuiFilledInput-root": {
						borderRadius: 3,
					},
				}}
				InputProps={{ disableUnderline: true }}
			/>

			{/* Submit Button */}
			<Button
				fullWidth
				disabled
				sx={{
					mt: 2,
					backgroundColor: "#2a2a2a",
					color: "white",
					borderRadius: 3,
					p: 1.5,
					fontWeight: "bold",
					textTransform: "none",
				}}
			>
				Enter an amount
			</Button>

			{/* Token Dropdown */}
			<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
				{tokens.map((token) => (
					<MenuItem key={token.name} onClick={() => handleTokenSelect(token.name)}>
						{token.name}
					</MenuItem>
				))}
			</Menu>
		</>
	);
}
