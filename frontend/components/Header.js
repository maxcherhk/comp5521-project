"use client";

import React, { useState } from "react";
import { AppBar, Toolbar, Button, Menu, MenuItem, Box, Input, InputAdornment } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";
import { useWallet } from "../context/WalletContext"; // Import WalletContext
import { useRouter } from "next/navigation"; // Import useRouter for App Router navigation

export default function Header() {
	// Initialize the router
	const router = useRouter();

	const [anchorEl, setAnchorEl] = useState(null);
	const [menuType, setMenuType] = useState(null);
	const [walletMenuAnchor, setWalletMenuAnchor] = useState(null); // Anchor for wallet menu

	// Access wallet state from WalletContext
	const { isWalletConnected, account, connectWallet, disconnectWallet } = useWallet();

	const handleMenuClick = (event, type) => {
		setAnchorEl(event.currentTarget);
		setMenuType(type);
	};

	const handleClose = () => {
		setAnchorEl(null);
		setMenuType(null);
	};

	const handleWalletMenuOpen = (event) => {
		setWalletMenuAnchor(event.currentTarget);
	};

	const handleWalletMenuClose = () => {
		setWalletMenuAnchor(null);
	};

	const renderMenu = (type) => {
		const menuItems = {
			Trade: [
				{ label: "Swap", route: "/swap" },
				{ label: "Limit", route: "/limit" },
				{ label: "Send", route: "/send" },
				{ label: "Buy", route: "/buy" },
			],
			Explore: [
				{ label: "Tokens", route: "#" },
				{ label: "Pools", route: "#" },
				{ label: "Transactions", route: "#" },
			],
			Pool: [
				{ label: "View Positions", route: "#" },
				{ label: "Create Position", route: "#" },
			],
		};

		return (
			<Menu
				anchorEl={anchorEl}
				open={menuType === type}
				onClose={handleClose}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "left",
				}}
			>
				{menuItems[type]?.map((item) => (
					<MenuItem
						key={item.label}
						onClick={() => {
							handleClose();
							router.push(item.route); // Navigate using App Router
						}}
					>
						{item.label}
					</MenuItem>
				))}
			</Menu>
		);
	};

	return (
		<AppBar position="static" color="default" elevation={1}>
			<Toolbar sx={{ justifyContent: "space-between" }}>
				{/* Left Section: Navigation */}
				<Box display="flex" alignItems="center" gap={2}>
					{/* Home Button */}
					<Button onClick={() => (window.location.href = "/")} sx={{ fontWeight: "bold" }}>
						Home
					</Button>
					{["Trade", "Explore", "Pool"].map((label) => (
						<Box key={label}>
							<Button onClick={(e) => handleMenuClick(e, label)} endIcon={<ArrowDropDownIcon />}>
								{label}
							</Button>
							{renderMenu(label)}
						</Box>
					))}
				</Box>

				{/* Center: Search */}
				<Box
					sx={{
						position: "absolute",
						left: "50%",
						transform: "translateX(-50%)",
					}}
				>
					<Input
						placeholder="Search tokens"
						startAdornment={
							<InputAdornment position="start">
								<SearchIcon sx={{ color: "gray" }} />
							</InputAdornment>
						}
						sx={{
							width: 300,
							border: "1px solid #ccc",
							borderRadius: 1,
							padding: "4px 8px",
						}}
						disableUnderline
					/>
				</Box>

				{/* Right: Wallet Button */}
				<Box>
					{isWalletConnected ? (
						<>
							<Button
								variant="contained"
								color="primary"
								onClick={handleWalletMenuOpen} // Open wallet menu
							>
								{/* Display wallet address in XXXXX..XXXX format */}
								{`${account.slice(0, 7)}...${account.slice(-5)}`}
							</Button>
							<Menu
								anchorEl={walletMenuAnchor}
								open={Boolean(walletMenuAnchor)}
								onClose={handleWalletMenuClose}
								anchorOrigin={{
									vertical: "bottom",
									horizontal: "right",
								}}
							>
								<MenuItem onClick={() => alert("View Wallet Details")}>View Wallet Details</MenuItem>
								<MenuItem onClick={disconnectWallet}>Disconnect</MenuItem>
							</Menu>
						</>
					) : (
						<Button variant="contained" color="primary" onClick={connectWallet}>
							Connect
						</Button>
					)}
				</Box>
			</Toolbar>
		</AppBar>
	);
}
