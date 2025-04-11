"use client";

import React, { useState } from "react";
import {
	Box,
	Typography,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	IconButton,
	List,
	ListItemText,
	ListItemIcon,
	InputAdornment,
	Input,
	ListItemButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import TokenIcon from "@mui/icons-material/Token";
import { useWallet } from "@/context/WalletContext";
const { getAllTokens } = require("../../utils/token-address");

const countriesWithFlags = [
	{ name: "Hong Kong", flag: "https://flagcdn.com/h40/hk.png" },
	{ name: "Taiwan", flag: "https://flagcdn.com/h40/tw.png" },
	{ name: "Japan", flag: "https://flagcdn.com/h40/jp.png" },
	{ name: "United States", flag: "https://flagcdn.com/h40/us.png" },
	{ name: "Germany", flag: "https://flagcdn.com/h40/de.png" },
];

export default function BuyBox() {
	const tokens = getAllTokens();
	const { isWalletConnected, account, balance0, balance1, connectWallet } = useWallet();
	const [country, setCountry] = useState(countriesWithFlags[0]);
	const [token, setToken] = useState("");
	const [amount, setAmount] = useState("");
	const [regionOpen, setRegionOpen] = useState(false);
	const [tokenOpen, setTokenOpen] = useState(false);

	const handleAmountSelect = (val) => setAmount(val);

	const handleBuy = async () => {
		const res = await fetch("/api/create-checkout-session", {
			method: "POST",
		});
		const data = await res.json();
		window.location.href = data.url;
	};

	return (
		<>
			{/* Top Bar */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					You're buying
				</Typography>
				<Button
					onClick={() => setRegionOpen(true)}
					sx={{
						minWidth: 0,
						color: "white",
						textTransform: "none",
						px: 1.5,
						backgroundColor: "#1c1c1c",
						borderRadius: 2,
					}}
					endIcon={<ExpandMoreIcon />}
				>
					<img
						src={country.flag} // use dynamic flag URL based on country if needed
						alt="flag"
						width={20}
						height={20}
						style={{ borderRadius: "50%", marginRight: 6, objectFit: "cover" }}
					/>
				</Button>
			</Box>

			{/* Dollar Amount */}
			<Input
				type="number"
				value={amount}
				placeholder="0"
				onChange={(e) => setAmount(e.target.value)}
				startAdornment={
					<InputAdornment position="start">
						<Typography sx={{ color: "white", fontSize: "1.5rem" }}>$</Typography>
					</InputAdornment>
				}
				sx={{
					fontSize: "4rem",
					color: "white",
					textAlign: "center",
					fontWeight: 500,
					mt: 1,
					"& input": {
						textAlign: "center", // Ensures the text is centered
						// Hides the up and down arrows
						MozAppearance: "textfield",
						"&::-webkit-outer-spin-button": {
							display: "none",
						},
						"&::-webkit-inner-spin-button": {
							display: "none",
						},
					},
				}}
				disableUnderline
			/>

			{/* Token Selector */}
			<Button
				onClick={() => setTokenOpen(true)}
				sx={{
					backgroundColor: "#00C2A8",
					color: "white",
					borderRadius: 999,
					textTransform: "none",
					width: "fit-content",
					mx: "auto",
					px: 3,
					py: 1,
					fontWeight: 500,
				}}
				endIcon={<ExpandMoreIcon />}
			>
				{token ? `Buy ${token}` : "Select a token"}
			</Button>

			{/* Quick Amount Buttons */}
			<Box display="flex" gap={1} justifyContent="center" mt={1}>
				{[100, 300, 1000].map((val) => (
					<Button
						key={val}
						variant="outlined"
						onClick={() => handleAmountSelect(val)}
						sx={{
							color: "white",
							borderColor: "#333",
							borderRadius: 3,
							textTransform: "none",
							minWidth: 80,
						}}
					>
						${val}
					</Button>
				))}
			</Box>

			{/* Main Action Button */}
			{!isWalletConnected ? (
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
					onClick={connectWallet} // Call connectWallet or handleSwap
				>
					Connect Wallet
				</Button>
			) : (
				<Button
					fullWidth
					disabled={!token}
					onClick={handleBuy}
					sx={{
						mt: 3,
						backgroundColor: token ? "#6b2673" : "#2a2a2a",
						color: "white",
						borderRadius: 3,
						textTransform: "none",
						fontWeight: "bold",
						p: 1.5,
						"&:hover": {
							backgroundColor: token ? "#5c2162" : "#2a2a2a",
						},
					}}
				>
					{token ? `Buy ${token}` : "Select a token"}
				</Button>
			)}

			{/* Region Dialog */}
			<Dialog open={regionOpen} onClose={() => setRegionOpen(false)} fullWidth>
				<DialogTitle>
					Select your region
					<IconButton onClick={() => setRegionOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent>
					<Input
						fullWidth
						placeholder="Search country"
						sx={{ mb: 2 }}
						startAdornment={<InputAdornment position="start">🌍</InputAdornment>}
					/>
					<List>
						{countriesWithFlags.map((cty) => (
							<ListItemButton
								key={cty.name}
								selected={country.name === cty.name}
								onClick={() => {
									setCountry(cty);
									setRegionOpen(false);
								}}
							>
								<ListItemIcon>
									<img
										src={cty.flag} // use dynamic flag URL based on country if needed
										alt="flag"
										width={20}
										height={20}
										style={{ borderRadius: "50%", marginRight: 6, objectFit: "cover" }}
									/>
								</ListItemIcon>
								<ListItemText primary={cty.name} />
							</ListItemButton>
						))}
					</List>
				</DialogContent>
			</Dialog>

			{/* Token Dialog */}
			<Dialog open={tokenOpen} onClose={() => setTokenOpen(false)} fullWidth>
				<DialogTitle>
					Select a token
					<IconButton onClick={() => setTokenOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent>
					<Input
						fullWidth
						placeholder="Search token"
						sx={{ mb: 2 }}
						startAdornment={<InputAdornment position="start">🔍</InputAdornment>}
					/>
					<List>
						{tokens.map((tk) => (
							<ListItemButton
								key={tk.name}
								selected={token === tk.name}
								onClick={() => {
									setToken(tk.name);
									setTokenOpen(false);
								}}
							>
								<ListItemIcon>
									<TokenIcon sx={{ color: "white" }} />
								</ListItemIcon>
								<ListItemText primary={tk.name} />
							</ListItemButton>
						))}
					</List>
				</DialogContent>
			</Dialog>
		</>
	);
}
