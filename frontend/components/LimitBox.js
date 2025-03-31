"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, IconButton, Chip, Menu, MenuItem, ToggleButtonGroup, ToggleButton } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const tokens = ["ETH", "USDC", "DAI"];

export default function LimitBox() {
	const [mode, setMode] = useState("limit");
	const [price, setPrice] = useState("1791.44");
	const [sellToken, setSellToken] = useState("ETH");
	const [buyToken, setBuyToken] = useState("USDC");
	const [expiry, setExpiry] = useState("1 week");
	const [anchorEl, setAnchorEl] = useState(null);
	const [tokenType, setTokenType] = useState(null);

	const handleModeChange = (event, newMode) => {
		if (newMode !== null) setMode(newMode);
	};

	const openTokenMenu = (e, type) => {
		setAnchorEl(e.currentTarget);
		setTokenType(type);
	};

	const selectToken = (token) => {
		if (tokenType === "sell") setSellToken(token);
		else setBuyToken(token);
		setAnchorEl(null);
	};

	const expiryOptions = ["1 day", "1 week", "1 month", "1 year"];
	const priceOptions = ["Market", "+1%", "+5%", "+10%"];

	return (
		<>
			{/* Price Setting Box */}
			<Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2 }}>
				<Box display="flex" justifyContent="space-between">
					<Typography variant="body2" color="text.secondary">
						When 1 <strong>{sellToken}</strong> is worth
					</Typography>
					<IconButton size="small">
						<SettingsIcon fontSize="small" />
					</IconButton>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
					<TextField
						variant="standard"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						InputProps={{ disableUnderline: true }}
						placeholder="0"
						sx={{
							input: { fontSize: 36, color: "white" },
							width: "60%",
						}}
					/>
					<Button
						onClick={(e) => openTokenMenu(e, "buy")}
						sx={{
							borderRadius: 2,
							textTransform: "none",
							backgroundColor: "#1f1f1f",
							color: "white",
							border: "1px solid #333",
							minWidth: 90,
						}}
					>
						{buyToken}
					</Button>
				</Box>

				{/* Adjustment Chips */}
				<Box mt={2} display="flex" gap={1} flexWrap="wrap">
					{priceOptions.map((opt) => (
						<Chip
							key={opt}
							label={opt}
							variant="outlined"
							sx={{
								color: "white",
								borderColor: "#2a2a2a",
								background: "#181818",
							}}
						/>
					))}
				</Box>
			</Box>

			{/* Sell Box */}
			<Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Sell
				</Typography>
				<Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
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
						onClick={(e) => openTokenMenu(e, "sell")}
						sx={{
							borderRadius: 2,
							textTransform: "none",
							backgroundColor: "#1f1f1f",
							color: "white",
							border: "1px solid #333",
							minWidth: 90,
						}}
					>
						{sellToken}
					</Button>
				</Box>
			</Box>

			{/* Arrow Icon */}
			<Box display="flex" justifyContent="center">
				<Box
					sx={{
						background: "#1c1c1c",
						borderRadius: "50%",
						p: 1,
					}}
				>
					<ArrowDownwardIcon sx={{ color: "white" }} />
				</Box>
			</Box>

			{/* Buy Box */}
			<Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Buy
				</Typography>
				<Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
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
						disabled
						sx={{
							borderRadius: 2,
							textTransform: "none",
							backgroundColor: "#1f1f1f",
							color: "white",
							border: "1px solid #333",
							minWidth: 90,
						}}
					>
						{buyToken}
					</Button>
				</Box>
			</Box>

			{/* Expiry */}
			<Box display="flex" gap={1} flexWrap="wrap">
				{expiryOptions.map((opt) => (
					<Button
						key={opt}
						onClick={() => setExpiry(opt)}
						variant={expiry === opt ? "contained" : "outlined"}
						sx={{
							textTransform: "none",
							borderRadius: 3,
							borderColor: expiry === opt ? "#00c2a8" : "#333",
							backgroundColor: expiry === opt ? "#00c2a8" : "transparent",
							color: expiry === opt ? "white" : "#ccc",
						}}
					>
						{opt}
					</Button>
				))}
			</Box>

			{/* Connect Wallet */}
			<Button
				fullWidth
				sx={{
					mt: 2,
					backgroundColor: "#6b2673",
					color: "white",
					textTransform: "none",
					borderRadius: 3,
					p: 1.5,
					fontWeight: "bold",
					"&:hover": {
						backgroundColor: "#5c2162",
					},
				}}
			>
				Connect wallet
			</Button>

			{/* Disclaimer */}
			<Box
				sx={{
					background: "#1b1b1b",
					borderRadius: 3,
					display: "flex",
					alignItems: "flex-start",
					gap: 1,
					p: 2,
				}}
			>
				<WarningAmberIcon sx={{ color: "#f7c948", mt: 0.3 }} />
				<Typography variant="body2" color="text.secondary">
					Limits may not execute exactly when tokens reach the specified price.{" "}
					<a href="#" style={{ color: "#1F8EF1", textDecoration: "underline" }}>
						Learn more
					</a>
				</Typography>
			</Box>

			{/* Token Menu */}
			<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
				{tokens.map((token) => (
					<MenuItem key={token} onClick={() => selectToken(token)}>
						{token}
					</MenuItem>
				))}
			</Menu>
		</>
	);
}
