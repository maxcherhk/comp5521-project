"use client";

import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, Box, TextField, IconButton } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

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
				<MenuItem onClick={handleClose}>Placeholder 1</MenuItem>
				<MenuItem onClick={handleClose}>Placeholder 2</MenuItem>
				<MenuItem onClick={handleClose}>Placeholder 3</MenuItem>
			</Menu>
		);
	};

	return (
		<AppBar position="static" color="default" elevation={1}>
			<Toolbar sx={{ justifyContent: "space-between" }}>
				{/* Left Section: Navigation */}
				<Box display="flex" alignItems="center" gap={2}>
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
				<Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
					<TextField size="small" placeholder="Search tokens" sx={{ width: 300 }} variant="outlined" />
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
