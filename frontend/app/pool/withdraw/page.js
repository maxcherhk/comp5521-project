"use client";

import React, { useState, useEffect } from "react";
import { 
	Container, 
	Typography, 
	Box, 
	TextField, 
	Button, 
	MenuItem, 
	Paper, 
	Divider, 
	Alert, 
	Grid, 
	CircularProgress,
	Snackbar
} from "@mui/material";
import { ethers } from "ethers";
import { getAllPools, addresses } from "@/utils/token-address";
import abis from "@/utils/deployed-abis.json";

const WithdrawLiquidity = () => {
	const [availablePools, setAvailablePools] = useState([]);
	const [selectedPool, setSelectedPool] = useState("");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [maxWithdraw, setMaxWithdraw] = useState(0);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [isLoadingPools, setIsLoadingPools] = useState(true);
	const [txStatus, setTxStatus] = useState({ success: false, message: "", open: false });
	const [tokenASymbol, setTokenASymbol] = useState("");
	const [tokenBSymbol, setTokenBSymbol] = useState("");
	const [expectedOutput, setExpectedOutput] = useState({ amountA: "0", amountB: "0" });

	// Fetch user's liquidity positions on component mount
	useEffect(() => {
		fetchUserLiquidityPositions();
	}, []);

	// Update expected output when withdrawal amount changes
	useEffect(() => {
		if (selectedPool && withdrawAmount && Number(withdrawAmount) > 0) {
			previewWithdraw();
		} else {
			setExpectedOutput({ amountA: "0", amountB: "0" });
		}
	}, [withdrawAmount, selectedPool]);

	// Fetch user's liquidity positions from blockchain
	const fetchUserLiquidityPositions = async () => {
		try {
			setIsLoadingPools(true);
			
			// Connect to MetaMask
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			const accounts = await provider.send("eth_requestAccounts", []);
			const userAddress = accounts[0];
			
			// Get all pools from the factory
			const allPools = getAllPools();
			const userPositions = [];
			
			// Check each pool for user's LP tokens
			for (const pool of allPools) {
				try {
					const poolContract = new ethers.Contract(pool.address, abis.Pool, provider);
					const lpBalance = await poolContract.balanceOf(userAddress);
					
					// Skip if user has no LP tokens in this pool
					if (lpBalance <= 0) continue;
					
					// Get pool token addresses and symbols
					const token0 = await poolContract.token0();
					const token1 = await poolContract.token1();
					
					// Get token symbols
					let tokenA = "", tokenB = "";
					for (const [symbol, address] of Object.entries(addresses.tokens)) {
						if (address.toLowerCase() === token0.toLowerCase()) tokenA = symbol;
						if (address.toLowerCase() === token1.toLowerCase()) tokenB = symbol;
					}
					
					// Format LP balance to human readable format
					const formattedLpBalance = parseFloat(ethers.formatEther(lpBalance));
					
					// Add to user positions
					userPositions.push({
						pool: pool.name,
						tokenA,
						tokenB,
						amount: formattedLpBalance,
						address: pool.address
					});
				} catch (error) {
					console.error(`Error checking pool ${pool.name}:`, error);
				}
			}
			
			setAvailablePools(userPositions);
			setIsLoadingPools(false);
		} catch (error) {
			console.error("Error fetching liquidity positions:", error);
			setIsLoadingPools(false);
		}
	};

	// Preview withdrawal amounts
	const previewWithdraw = async () => {
		if (!selectedPool || !withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
			return;
		}

		try {
			// Find the selected pool
			const poolInfo = availablePools.find((p) => p.pool === selectedPool);
			if (!poolInfo) return;
			
			// Connect to provider
			const provider = new ethers.BrowserProvider(window.ethereum);
			
			// Get pool contract
			const poolContract = new ethers.Contract(poolInfo.address, abis.Pool, provider);
			
			// Parse LP amount
			const lpAmount = ethers.parseEther(withdrawAmount);
			
			// Call previewWithdraw function on the pool contract
			const [amount0, amount1] = await poolContract.previewWithdraw(lpAmount);
			
			// Format amounts to human readable format
			const formattedAmount0 = ethers.formatEther(amount0);
			const formattedAmount1 = ethers.formatEther(amount1);
			
			setExpectedOutput({
				amountA: formattedAmount0,
				amountB: formattedAmount1
			});
		} catch (error) {
			console.error("Error previewing withdrawal:", error);
			setExpectedOutput({ amountA: "0", amountB: "0" });
		}
	};

	// Handle pool selection
	const handlePoolSelect = (event) => {
		const poolName = event.target.value;
		setSelectedPool(poolName);
		setWithdrawAmount("");
		setError("");
		
		if (poolName) {
			const poolInfo = availablePools.find((p) => p.pool === poolName);
			setMaxWithdraw(poolInfo?.amount || 0);
			
			// Set token symbols
			const [tokenA, tokenB] = poolName.split("/");
			setTokenASymbol(tokenA);
			setTokenBSymbol(tokenB);
		} else {
			setMaxWithdraw(0);
			setTokenASymbol("");
			setTokenBSymbol("");
		}
	};

	// Handle max button click
	const handleMax = () => {
		// Subtract a tiny amount to handle floating point precision issues
		// This ensures we're always slightly under the exact balance
		const maxAdjusted = Math.floor(maxWithdraw * 100000) / 100000;
		setWithdrawAmount(maxAdjusted.toString());
	};

	// Handle withdrawal
	const handleWithdraw = async () => {
		setError("");

		if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
			setError("Please enter a valid amount.");
			return;
		}

		if (parseFloat(withdrawAmount) > maxWithdraw) {
			setError("Withdraw amount exceeds your liquidity.");
			return;
		}

		try {
			setLoading(true);
			
			// Find the selected pool
			const poolInfo = availablePools.find((p) => p.pool === selectedPool);
			if (!poolInfo) throw new Error("Pool not found");
			
			// Connect to MetaMask
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			const userAddress = await signer.getAddress();
			
			// Get pool contract
			const poolContract = new ethers.Contract(poolInfo.address, abis.Pool, signer);
			
			// IMPORTANT: Get exact token0 and token1 addresses from the pool
			// These must be used in this exact order with the router
			const token0Address = await poolContract.token0();
			const token1Address = await poolContract.token1();
			
			// Parse LP amount - ensure we're within bounds of available balance
			const lpAmount = ethers.parseEther(withdrawAmount);
			
			// IMPORTANT: Make sure we have LP tokens before we try to withdraw
			const lpBalance = await poolContract.balanceOf(userAddress);
			console.log("User LP balance:", ethers.formatEther(lpBalance));
			console.log("Attempting to withdraw:", ethers.formatEther(lpAmount));
			
			// Allow a tiny bit of precision error (0.01% buffer)
			const balanceWithBuffer = (lpBalance * BigInt(9999)) / BigInt(10000);
			
			if (lpAmount > lpBalance) {
				// If the difference is very small (less than 0.1%), adjust the amount automatically
				const smallDifference = ((lpAmount - lpBalance) * BigInt(10000)) / lpBalance < BigInt(10);
				
				if (smallDifference) {
					console.log("Adjusting withdrawal amount to match available balance");
					// Use the actual balance instead (which is slightly less)
					// This allows "Max" to work even with tiny precision differences
					const actualLpAmount = balanceWithBuffer;
					console.log("Adjusted withdrawal amount:", ethers.formatEther(actualLpAmount));
				} else {
					throw new Error(`Insufficient LP tokens. You have ${ethers.formatEther(lpBalance)} but trying to withdraw ${ethers.formatEther(lpAmount)}`);
				}
			}
			
			// Use the adjusted LP amount that we know will work
			const actualLpAmount = lpAmount > lpBalance ? balanceWithBuffer : lpAmount;
			
			// Preview withdrawal to calculate minAmounts with slippage
			const [amount0, amount1] = await poolContract.previewWithdraw(actualLpAmount);
			
			// Apply 5% slippage tolerance
			const minAmount0 = (amount0 * BigInt(95)) / BigInt(100);
			const minAmount1 = (amount1 * BigInt(95)) / BigInt(100);
			
			console.log("Withdrawal parameters:", {
				pool: poolInfo.address,
				user: userAddress,
				token0: token0Address,
				token1: token1Address,
				lpAmount: ethers.formatEther(actualLpAmount),
				amount0: ethers.formatEther(amount0),
				amount1: ethers.formatEther(amount1),
				minAmount0: ethers.formatEther(minAmount0),
				minAmount1: ethers.formatEther(minAmount1)
			});
			
			// Step 1: First handle approval - this is critical and must be done before withdrawal
			// Check current allowance
			const routerAllowance = await poolContract.allowance(userAddress, addresses.router);
			console.log("Current router allowance:", ethers.formatEther(routerAllowance));
			
			// If allowance is less than what we need, approve
			if (routerAllowance < actualLpAmount) {
				console.log("Approving router to spend LP tokens...");
				setTxStatus({
					success: true,
					message: "Please confirm the approval transaction in your wallet...",
					open: true
				});
				
				try {
					// Approve exact amount + a small buffer
					const approveAmount = actualLpAmount * BigInt(11) / BigInt(10); // 110% of needed amount
					const approveTx = await poolContract.approve(addresses.router, approveAmount);
					console.log("Approval transaction sent:", approveTx.hash);
					
					// Wait for the approval transaction to be confirmed
					setTxStatus({
						success: true,
						message: "Confirming approval transaction...",
						open: true
					});
					
					const approveReceipt = await approveTx.wait();
					console.log("Approval transaction confirmed:", approveReceipt.hash);
					
					// Verify allowance after approval
					const newAllowance = await poolContract.allowance(userAddress, addresses.router);
					console.log("New router allowance after approval:", ethers.formatEther(newAllowance));
					
					if (newAllowance < actualLpAmount) {
						throw new Error("Approval failed - allowance is still too low");
					}
				} catch (approvalError) {
					console.error("Error approving tokens:", approvalError);
					throw new Error("Failed to approve tokens: " + (approvalError.message || "Unknown error"));
				}
			} else {
				console.log("Router already has sufficient allowance");
			}
			
			// Step 2: Now we can execute the withdrawal
			setTxStatus({
				success: true,
				message: "Approval successful. Now processing withdrawal...",
				open: true
			});
			
			// Get router contract
			const routerContract = new ethers.Contract(addresses.router, abis.Router, signer);
			
			// Execute withdrawal using the EXACT token addresses from the pool contract
			// This ensures correct token ordering as expected by the router
			console.log("Executing withdrawLiquidity...");
			const withdrawTx = await routerContract.withdrawLiquidity(
				token0Address,
				token1Address,
				actualLpAmount,
				minAmount0,
				minAmount1
			);
			
			console.log("Withdrawal transaction submitted:", withdrawTx.hash);
			
			setTxStatus({
				success: true,
				message: "Withdrawal submitted. Waiting for confirmation...",
				open: true
			});
			
			const withdrawReceipt = await withdrawTx.wait();
			console.log("Withdrawal transaction confirmed:", withdrawReceipt.hash);
			
			// Show success message
			setTxStatus({
				success: true,
				message: "Liquidity withdrawn successfully!",
				open: true
			});
			
			// Reset form
			setWithdrawAmount("");
			
			// Refetch user's positions
			fetchUserLiquidityPositions();
			
		} catch (error) {
			console.error("Withdrawal error:", error);
			
			// Extract more meaningful error
			let errorMessage = "Transaction failed";
			
			if (error.data) {
				// Try to parse the error data for more information
				errorMessage = `Transaction reverted: ${error.data}`;
			} else if (error.reason) {
				errorMessage = error.reason;
			} else if (error.message) {
				// Clean up common error messages
				const msg = error.message;
				if (msg.includes("user rejected")) {
					errorMessage = "Transaction was rejected in your wallet.";
				} else if (msg.includes("execution reverted")) {
					errorMessage = "Contract rejected the transaction. Make sure you've approved the Router to spend your LP tokens.";
				} else {
					errorMessage = error.message;
				}
			}
			
			setTxStatus({
				success: false,
				message: errorMessage,
				open: true
			});
		} finally {
			setLoading(false);
		}
	};

	// Handle close snackbar
	const handleCloseSnackbar = () => {
		setTxStatus({ ...txStatus, open: false });
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 6 }}>
			<Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
				<Typography variant="h5" gutterBottom>
					Withdraw Liquidity
				</Typography>

				{isLoadingPools ? (
					<Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
						<CircularProgress />
					</Box>
				) : availablePools.length === 0 ? (
					<Alert severity="info" sx={{ mt: 3 }}>
						You don't have liquidity in any pools.
					</Alert>
				) : (
					<>
						<Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
							<TextField
								fullWidth
								select
								label="Select Liquidity Pool"
								value={selectedPool}
								onChange={handlePoolSelect}
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
								<Grid item xs={9}>
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
												fontSize: "1.2rem",
											},
										}}
									/>
								</Grid>
								<Grid item xs={3}>
									<Button 
										onClick={handleMax} 
										variant="outlined" 
										fullWidth 
										sx={{ mt: 2 }} 
										disabled={!selectedPool}
									>
										Max
									</Button>
								</Grid>
							</Grid>

							{selectedPool && withdrawAmount && Number(withdrawAmount) > 0 && (
								<Box sx={{ mt: 3, p: 2, bgcolor: "rgba(0, 0, 0, 0.03)", borderRadius: 1 }}>
									<Typography variant="subtitle2" gutterBottom>
										You will receive:
									</Typography>
									<Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
										<Typography variant="body1">
											{parseFloat(expectedOutput.amountA).toFixed(6)} {tokenASymbol}
										</Typography>
										<Typography variant="body1">
											{parseFloat(expectedOutput.amountB).toFixed(6)} {tokenBSymbol}
										</Typography>
									</Box>
								</Box>
							)}

							{error && (
								<Alert severity="error" sx={{ mt: 2 }}>
									{error}
								</Alert>
							)}

							<Button 
								variant="contained" 
								color="primary" 
								fullWidth 
								sx={{ mt: 3 }} 
								onClick={handleWithdraw} 
								disabled={!selectedPool || !withdrawAmount || loading}
							>
								{loading ? <CircularProgress size={24} color="inherit" /> : "Confirm Withdraw"}
							</Button>
						</Box>

						<Divider sx={{ my: 4 }} />

						<Typography variant="subtitle2" color="text.secondary">
							💡 Tip: Liquidity tokens represent your share of the pool. Withdrawing will return your proportional share of both assets.
						</Typography>
					</>
				)}
			</Paper>
			
			<Snackbar
				open={txStatus.open}
				autoHideDuration={5000}
				onClose={handleCloseSnackbar}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert onClose={handleCloseSnackbar} severity={txStatus.success ? "success" : "error"}>
					{txStatus.message}
				</Alert>
			</Snackbar>
		</Container>
	);
};

export default WithdrawLiquidity;
