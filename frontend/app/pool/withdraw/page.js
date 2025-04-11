"use client";

import React, { useState, useEffect } from "react";
import { Container, Typography, Box, TextField, Button, MenuItem, Paper, Divider, Alert, Grid } from "@mui/material";
import { useWallet } from "@/context/WalletContext";
// 🧪 Mock user LP data (replace with real blockchain read later)
const userLiquidityPositions = [
	{ pool: "ALPHA/BETA", tokenA: "ALPHA", tokenB: "BETA", amount: 5.23 },
	{ pool: "BETA/CHARILE", tokenA: "BETA", tokenB: "CHARILE", amount: 0 }, // Not shown
	{ pool: "ALPHA/CHARILE", tokenA: "ALPHA", tokenB: "CHARILE", amount: 12.8 },
	{ pool: "ALPHA/DELTA", tokenA: "ALPHA", tokenB: "DELTA", amount: 7.8 },
];

const WithdrawLiquidity = () => {
	const [availablePools, setAvailablePools] = useState([]);
	const [selectedPool, setSelectedPool] = useState("");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [maxWithdraw, setMaxWithdraw] = useState(0);
	const [error, setError] = useState("");

	useEffect(() => {
		// Simulate fetching pools where user has liquidity > 0
		const filtered = userLiquidityPositions.filter((p) => p.amount > 0);
		setAvailablePools(filtered);
	}, []);

	useEffect(() => {
		if (selectedPool) {
			const poolInfo = availablePools.find((p) => p.pool === selectedPool);
			setMaxWithdraw(poolInfo?.amount || 0);
		} else {
			setMaxWithdraw(0);
		}
	}, [selectedPool, availablePools]);

	const handleWithdraw = () => {
		setError("");

		if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
			setError("Please enter a valid amount.");
			return;
		}

		if (withdrawAmount > maxWithdraw) {
			setError("Withdraw amount exceeds your liquidity.");
			return;
		}

		// TODO: Add on-chain withdraw logic here
		alert(`Withdrawing ${withdrawAmount} from ${selectedPool}`);
	};

	const handleMax = () => {
		setWithdrawAmount(maxWithdraw);
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 6 }}>
			<Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
				<Typography variant="h5" gutterBottom>
					Withdraw Liquidity
				</Typography>

				{availablePools.length === 0 ? (
					<Alert severity="info" sx={{ mt: 3 }}>
						You don’t have liquidity in any pools.
					</Alert>
				) : (
					<>
						<Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
							<TextField
								fullWidth
								select
								label="Select Liquidity Pool"
								value={selectedPool}
								onChange={(e) => {
									setSelectedPool(e.target.value);
									setWithdrawAmount("");
									setError("");
								}}
								margin="normal"
							>
								{availablePools.map((p) => (
									<MenuItem key={p.pool} value={p.pool}>
										{p.pool} — You have {p.amount.toFixed(4)} LP tokens
									</MenuItem>
								))}
							</TextField>

							{selectedPool && (
								<Box sx={{ mt: 1, mb: 2 }}>
									<Typography variant="body2" color="text.secondary">
										Available: {maxWithdraw.toFixed(4)} LP tokens
									</Typography>
								</Box>
							)}

							<Grid container spacing={1} alignItems="center">
								<Grid item size={9}>
									<TextField
										fullWidth
										label="Amount to Withdraw"
										value={withdrawAmount}
										onChange={(e) => setWithdrawAmount(e.target.value)}
										type="number"
										margin="normal"
										InputProps={{ inputProps: { min: 0, max: maxWithdraw } }}
										disabled={!selectedPool}
										sx={{
											"& .MuiInputBase-root": {
												fontSize: "1.2rem", // Optional: Increase font size
											},
										}}
									/>
								</Grid>
								<Grid item size={3}>
									<Button onClick={handleMax} variant="outlined" fullWidth sx={{ mt: 2 }} disabled={!selectedPool}>
										Max
									</Button>
								</Grid>
							</Grid>

							{error && (
								<Alert severity="error" sx={{ mt: 2 }}>
									{error}
								</Alert>
							)}

							<Button variant="contained" color="primary" fullWidth sx={{ mt: 3 }} onClick={handleWithdraw} disabled={!selectedPool || !withdrawAmount}>
								Confirm Withdraw
							</Button>
						</Box>

						<Divider sx={{ my: 4 }} />

						<Typography variant="subtitle2" color="text.secondary">
							💡 Tip: Liquidity tokens represent your share of the pool. Withdrawing will return your proportional share of both assets (e.g., ETH and USDT).
						</Typography>
					</>
				)}
			</Paper>
		</Container>
	);
};

export default WithdrawLiquidity;
