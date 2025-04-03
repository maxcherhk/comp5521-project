"use client";

import React, { useState } from "react";
import { Box, ToggleButtonGroup, ToggleButton, IconButton, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useRouter, usePathname } from "next/navigation"; // Import the router

const tokens = ["ETH", "DAI", "USDC"];

export default function TradeBox({ children }) {
	const [mode, setMode] = useState("swap");
	const [anchorEl, setAnchorEl] = useState(null);
	const [selectedToken, setSelectedToken] = useState("ETH");
	const [buyToken, setBuyToken] = useState("");
	const router = useRouter(); // Initialize the router
	const pathname = usePathname();

	React.useEffect(() => {
		// Update the mode based on the current route
		if (pathname === "/limit") {
			setMode("limit");
		} else if (pathname === "/send") {
			setMode("send");
		} else if (pathname === "/buy") {
			setMode("buy");
		} else {
			setMode("swap");
		}
	}, [pathname]); // Run this effect whenever the pathname changes

	const handleModeChange = (event, newMode) => {
		if (newMode !== null) {
			setMode(newMode);
			if (newMode === "swap") {
				setMode("swap"); // Set mode to "swap"
				router.push("/swap"); // Route to / when "swap" mode is selected
			} else if (newMode === "limit") {
				setMode("limit"); // Set mode to "limit"
				router.push("/limit"); // Route to /limit when "limit" mode is selected
			} else if (newMode === "send") {
				setMode("send"); // Set mode to "send"
				router.push("/send"); // Route to /send when "send" mode is selected
			} else if (newMode === "buy") {
				setMode("buy"); // Set mode to "buy"
				router.push("/buy"); // Route to /buy when "buy" mode is selected
			}
		}
	};

	return (
		<Box
			sx={{
				background: "#121212",
				p: 3,
				borderRadius: 4,
				width: "100%",
				mx: "auto",
				mt: 4,
				display: "flex",
				flexDirection: "column",
				gap: 2,
			}}
		>
			{/* Top Mode Buttons */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} color="primary">
					<ToggleButton value="swap">Swap</ToggleButton>
					<ToggleButton value="limit">Limit</ToggleButton>
					<ToggleButton value="send">Send</ToggleButton>
					<ToggleButton value="buy">Buy</ToggleButton>
				</ToggleButtonGroup>
				<IconButton color="inherit">
					<SettingsIcon />
				</IconButton>
			</Box>
			{/* Render children based on mode */}
			{children}
		</Box>
	);
}
