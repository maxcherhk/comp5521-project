"use client";

import React from "react";
import { Box, Typography, Card, CardContent, Grid, Divider, Table, TableBody, TableCell, TableHead, TableRow, Avatar, Chip } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SendIcon from "@mui/icons-material/Send";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import TokenIcon from "@mui/icons-material/Token";

export default function WalletDetailPage() {
	// Mocked wallet data
	const walletAddress = "0xAbC123...4567";
	const tokenBalances = {
		Alpha: "120.5",
		Beta: "45.3",
		Charlie: "78.9",
		Delta: "10.0",
	};
	const transactionHistory = [
		{
			date: "2025-04-10",
			type: "Sent",
			amount: "10",
			token: "Alpha",
			hash: "0x1234abcd5678efgh9012ijkl3456mnop7890qrst",
		},
		{
			date: "2025-04-09",
			type: "Received",
			amount: "20",
			token: "Beta",
			hash: "0x5678abcd1234efgh9012ijkl3456mnop7890qrst",
		},
		{
			date: "2025-04-08",
			type: "Sent",
			amount: "5",
			token: "Charlie",
			hash: "0x9012abcd5678efgh1234ijkl3456mnop7890qrst",
		},
		{
			date: "2025-04-07",
			type: "Received",
			amount: "15",
			token: "Delta",
			hash: "0x3456abcd5678efgh1234ijkl9012mnop7890qrst",
		},
	];

	return (
		<Box sx={{ p: 4 }}>
			{/* Page Title */}
			<Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<AccountBalanceWalletIcon fontSize="large" color="primary" />
				My Wallet
			</Typography>
			<Divider sx={{ mb: 3 }} />

			{/* Wallet Address */}
			<Card sx={{ mb: 3, borderRadius: 3 }}>
				<CardContent>
					<Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<AccountBalanceWalletIcon color="primary" />
						Wallet Address:
					</Typography>
					<Typography
						variant="body1"
						color="primary"
						sx={{
							wordBreak: "break-all",
							cursor: "pointer",
							textDecoration: "underline",
							mt: 1,
						}}
						onClick={() => window.open(`https://etherscan.io/address/${walletAddress}`, "_blank")}
					>
						{walletAddress}
					</Typography>
				</CardContent>
			</Card>

			{/* Token Balances */}
			<Typography variant="h5" gutterBottom>
				Token Balances
			</Typography>
			<Grid container spacing={3} sx={{ mb: 3 }}>
				{Object.entries(tokenBalances).map(([token, balance]) => (
					<Grid item xs={12} md={6} lg={3} key={token}>
						<Card
							sx={{
								borderRadius: 3,
								textAlign: "center",
								boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
							}}
						>
							<CardContent>
								<Avatar sx={{ bgcolor: "#1976d2", width: 56, height: 56, mb: 2, mx: "auto" }}>
									<TokenIcon />
								</Avatar>
								<Typography variant="subtitle2">{token}</Typography>
								<Typography variant="h6" sx={{ fontWeight: "bold" }}>
									{balance}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Transaction History */}
			<Typography variant="h5" gutterBottom>
				Transaction History
			</Typography>
			<Card sx={{ borderRadius: 3, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
				<CardContent>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Date</TableCell>
								<TableCell>Type</TableCell>
								<TableCell>Amount</TableCell>
								<TableCell>Token</TableCell>
								<TableCell>Transaction Hash</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{transactionHistory.length > 0 ? (
								transactionHistory.map((tx, index) => (
									<TableRow key={index}>
										<TableCell>{tx.date}</TableCell>
										<TableCell>
											<Chip icon={tx.type === "Sent" ? <SendIcon /> : <CallReceivedIcon />} label={tx.type} color={tx.type === "Sent" ? "error" : "success"} variant="outlined" />
										</TableCell>
										<TableCell>{tx.amount}</TableCell>
										<TableCell>{tx.token}</TableCell>
										<TableCell>
											<Typography
												variant="body2"
												color="primary"
												sx={{
													wordBreak: "break-all",
													cursor: "pointer",
													textDecoration: "underline",
												}}
												onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, "_blank")}
											>
												{tx.hash}
											</Typography>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={5} align="center">
										No transactions found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</Box>
	);
}
