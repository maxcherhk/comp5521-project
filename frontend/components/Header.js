"use client";

import React, { useState } from "react";
import {
	AppBar,
	Toolbar,
	Typography,
	Button,
	Menu,
	MenuItem,
	Box,
	Input,
	IconButton,
	InputAdornment,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";

export default function Header() {
	const [anchorEl, setAnchorEl] = useState(null);
	const [menuType, setMenuType] = useState(null);

	const handleMenuClick = (event, type) => {
		setAnchorEl(event.currentTarget);
		setMenuType(type);
	};

	const handleClose = () => {
		setAnchorEl(null);
		setMenuType(null);
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
							window.location.href = item.route; // Navigate to the route
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

				{/* Right: Connect Button */}
				<Box>
					<Button variant="contained" color="primary">
						Connect
					</Button>
				</Box>
			</Toolbar>
		</AppBar>
	);
}
