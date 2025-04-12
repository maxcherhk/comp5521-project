"use client";

import React, { useState, useEffect } from "react";
import { Box, Button, Modal, Typography, TextField, MenuItem, FormControl, InputLabel, CircularProgress, Snackbar, Alert } from "@mui/material";
import { ethers } from "ethers";
import { getAllPools, addresses } from "@/utils/token-address"; // Import addresses
import Select, { SelectChangeEvent } from "@mui/material/Select";
// Import Router ABI
import abis from "@/utils/deployed-abis.json";

const modalStyle = {
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	width: 600,
	bgcolor: "background.paper",
	borderRadius: 3,
	boxShadow: 24,
	p: 4,
};

const AddLiquidityModal = ({ open, onClose }) => {
	const [pools, setPools] = useState([]);
	const [selectedPool, setSelectedPool] = useState("");
	const [token1Amount, setToken1Amount] = useState("");
	const [token2Amount, setToken2Amount] = useState("");
	const [loading, setLoading] = useState(false);
	const [txStatus, setTxStatus] = useState({ success: false, message: "", open: false });
	const [step, setStep] = useState(1); // Step state: 1 for pool selection, 2 for amounts
	const [isApproving, setIsApproving] = useState(false);
	const [poolReserves, setPoolReserves] = useState({ token0: "", token1: "", token0Reserve: "0", token1Reserve: "0" });
	const [lpTokenEstimate, setLpTokenEstimate] = useState({
		amount: "0",
		poolShare: "0",
		isCalculating: false
	});
	const [isFirstTokenBase, setIsFirstTokenBase] = useState(true); // Track which token is the base for calculations

	useEffect(() => {
		setPools(getAllPools());
	}, []);

	// Effect to update the second token amount when the first token amount changes
	useEffect(() => {
		if (selectedPool && token1Amount && Number(token1Amount) > 0 && isFirstTokenBase) {
			calculateSecondTokenAmount(token1Amount);
		}
	}, [token1Amount, selectedPool, isFirstTokenBase]);

	// Effect to update the first token amount when the second token amount changes
	useEffect(() => {
		if (selectedPool && token2Amount && Number(token2Amount) > 0 && !isFirstTokenBase) {
			calculateFirstTokenAmount(token2Amount);
		}
	}, [token2Amount, selectedPool, isFirstTokenBase]);

	const fetchPoolReserves = async (poolName) => {
		try {
			const pool = pools.find((p) => p.name === poolName);
			if (!pool) return;
			
			// Get token addresses from the pool name
			const [tokenA, tokenB] = poolName.split("/");
			const tokenAAddress = addresses.tokens[tokenA];
			const tokenBAddress = addresses.tokens[tokenB];
			
			// Connect to provider
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			
			// Get pool contract
			const poolContract = new ethers.Contract(pool.address, abis.Pool, provider);
			
			// Get token order in the pool
			const token0Address = await poolContract.token0();
			const token1Address = await poolContract.token1();
			
			// Get token symbols based on addresses
			const token0 = tokenAAddress.toLowerCase() === token0Address.toLowerCase() ? tokenA : tokenB;
			const token1 = tokenBAddress.toLowerCase() === token1Address.toLowerCase() ? tokenB : tokenA;
			
			// Get reserves
			const [reserve0, reserve1] = await poolContract.getReserves();
			
			// Format reserves to human readable format (with 18 decimals)
			const formattedReserve0 = ethers.formatEther(reserve0);
			const formattedReserve1 = ethers.formatEther(reserve1);
			
			setPoolReserves({
				token0,
				token1,
				token0Reserve: formattedReserve0,
				token1Reserve: formattedReserve1
			});
			
		} catch (error) {
			console.error("Error fetching pool reserves:", error);
			setPoolReserves({ token0: "", token1: "", token0Reserve: "0", token1Reserve: "0" });
		}
	};

	const handleChange = (event) => {
		const poolName = event.target.value;
		setSelectedPool(poolName);
		
		// Reset token amounts when pool changes
		setToken1Amount("");
		setToken2Amount("");
		setLpTokenEstimate({
			amount: "0",
			poolShare: "0",
			isCalculating: false
		});
		
		// If a valid pool is selected, fetch its reserves
		if (poolName) {
			fetchPoolReserves(poolName);
		}
	};

	const calculateSecondTokenAmount = async (amount1Input) => {
		if (!selectedPool || !amount1Input || Number(amount1Input) <= 0) {
			setToken2Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
			return;
		}

		try {
			setLpTokenEstimate(prev => ({ ...prev, isCalculating: true }));
			
			// Get token addresses
			const [tokenA, tokenB] = selectedPool.split("/");
			const tokenAAddress = addresses.tokens[tokenA];
			const tokenBAddress = addresses.tokens[tokenB];
			
			// Connect to provider
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			
			// Get router contract
			const routerContract = new ethers.Contract(addresses.router, abis.Router, provider);
			
			// Parse amount
			const parsedAmount = ethers.parseEther(amount1Input);
			
			// Call previewAddLiquidity to get required second token amount and LP token estimate
			const preview = await routerContract.previewAddLiquidity(
				tokenAAddress,
				tokenBAddress,
				parsedAmount,
				true // first token as base
			);
			
			// Extract values from preview 
			const [lpTokenAmount, poolShareBasisPoints, previewAmount0, previewAmount1] = preview;
			
			// Format values to user-friendly format
			const formattedLpAmount = ethers.formatEther(lpTokenAmount);
			const poolSharePercent = (Number(poolShareBasisPoints) / 100).toFixed(2); // Convert basis points to percentage
			
			// If tokenA is token0, amount0 matches the amount1 input, otherwise use amount1
			const requiredAmount2 = ethers.formatEther(previewAmount1);
			
			// Update second token amount and LP token estimate
			setToken2Amount(requiredAmount2);
			setLpTokenEstimate({
				amount: formattedLpAmount,
				poolShare: poolSharePercent,
				isCalculating: false
			});
			
			// Mark first token as the base
			setIsFirstTokenBase(true);
			
		} catch (error) {
			console.error("Error calculating token amounts:", error);
			setToken2Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
		}
	};

	const calculateFirstTokenAmount = async (amount2Input) => {
		if (!selectedPool || !amount2Input || Number(amount2Input) <= 0) {
			setToken1Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
			return;
		}

		try {
			setLpTokenEstimate(prev => ({ ...prev, isCalculating: true }));
			
			// Get token addresses
			const [tokenA, tokenB] = selectedPool.split("/");
			const tokenAAddress = addresses.tokens[tokenA];
			const tokenBAddress = addresses.tokens[tokenB];
			
			// Connect to provider
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			
			// Get router contract
			const routerContract = new ethers.Contract(addresses.router, abis.Router, provider);
			
			// Parse amount
			const parsedAmount = ethers.parseEther(amount2Input);
			
			// Call previewAddLiquidity to get required first token amount and LP token estimate
			const preview = await routerContract.previewAddLiquidity(
				tokenBAddress, // Order is swapped because we're using the second token as base
				tokenAAddress,
				parsedAmount,
				true // second token as base
			);
			
			// Extract values from preview
			const [lpTokenAmount, poolShareBasisPoints, previewAmount0, previewAmount1] = preview;
			
			// Format values to user-friendly format
			const formattedLpAmount = ethers.formatEther(lpTokenAmount);
			const poolSharePercent = (Number(poolShareBasisPoints) / 100).toFixed(2); // Convert basis points to percentage
			
			// If tokenB is token0, amount0 matches the amount2 input, otherwise use amount1
			const requiredAmount1 = ethers.formatEther(previewAmount1);
			
			// Update first token amount and LP token estimate
			setToken1Amount(requiredAmount1);
			setLpTokenEstimate({
				amount: formattedLpAmount,
				poolShare: poolSharePercent,
				isCalculating: false
			});
			
			// Mark second token as the base
			setIsFirstTokenBase(false);
			
		} catch (error) {
			console.error("Error calculating token amounts:", error);
			setToken1Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
		}
	};

	const handleToken1Change = (e) => {
		const value = e.target.value;
		setToken1Amount(value);
		
		// Reset token2 and mark this as the base token
		if (value === "") {
			setToken2Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
		}
	};

	const handleToken2Change = (e) => {
		const value = e.target.value;
		setToken2Amount(value);
		
		// Reset token1 and mark this as the base token
		if (value === "") {
			setToken1Amount("");
			setLpTokenEstimate({
				amount: "0",
				poolShare: "0",
				isCalculating: false
			});
		}
	};

	const handleAddLiquidity = async () => {
		if (!selectedPool || !token1Amount || !token2Amount || Number(token1Amount) <= 0 || Number(token2Amount) <= 0) {
			setTxStatus({ success: false, message: "Select a pool and enter valid amounts", open: true });
			return;
		}

		try {
			setLoading(true);
			// Find the selected pool
			const pool = pools.find((p) => p.name === selectedPool);
			
			// Get token addresses from the pool name
			const [tokenA, tokenB] = selectedPool.split("/");
			const tokenAAddress = addresses.tokens[tokenA];
			const tokenBAddress = addresses.tokens[tokenB];
			
			// Connect to MetaMask
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			
			// Get token contracts for approvals
			const tokenAContract = new ethers.Contract(tokenAAddress, abis.NewToken, signer);
			const tokenBContract = new ethers.Contract(tokenBAddress, abis.NewToken, signer);
			
			// Get router contract
			const routerContract = new ethers.Contract(addresses.router, abis.Router, signer);
			
			// Parse amounts
			const parsedAmount1 = ethers.parseEther(token1Amount);
			const parsedAmount2 = ethers.parseEther(token2Amount);
			
			console.log("Adding liquidity for pool:", selectedPool);
			console.log("Token A:", tokenA, tokenAAddress);
			console.log("Token B:", tokenB, tokenBAddress);

			// IMPORTANT: The contract expects tokens in ascending order (address order) to avoid issues
			// We need to determine which token should be token0 and token1 in the pool
			// First, check if we need to swap the tokens to match the pool's order
			const poolContract = new ethers.Contract(pool.address, abis.Pool, signer);
			const token0Address = await poolContract.token0();
			const token1Address = await poolContract.token1();
			
			console.log("Pool token0:", token0Address);
			console.log("Pool token1:", token1Address);
			
			// Determine if we need to swap the order of tokens
			const isToken0First = tokenAAddress.toLowerCase() === token0Address.toLowerCase();
			
			// Now we can set up the correct order based on the pool
			const firstTokenAddress = isToken0First ? tokenAAddress : tokenBAddress;
			const secondTokenAddress = isToken0First ? tokenBAddress : tokenAAddress;
			const firstAmount = isToken0First ? parsedAmount1 : parsedAmount2;
			const secondAmount = isToken0First ? parsedAmount2 : parsedAmount1;
			
			// Approve tokens - use max uint256 for better UX in future additions
			setIsApproving(true);
			const MAX_UINT256 = ethers.MaxUint256;
			
			console.log("Approving tokens for router:", addresses.router);
			
			try {
				// Check current allowances first
				const allowance1 = await tokenAContract.allowance(await signer.getAddress(), addresses.router);
				if (allowance1 < parsedAmount1) {
					console.log("Approving token A");
					const tx1 = await tokenAContract.approve(addresses.router, MAX_UINT256);
					await tx1.wait();
					console.log("Token A approved");
				}
				
				const allowance2 = await tokenBContract.allowance(await signer.getAddress(), addresses.router);
				if (allowance2 < parsedAmount2) {
					console.log("Approving token B");
					const tx2 = await tokenBContract.approve(addresses.router, MAX_UINT256);
					await tx2.wait();
					console.log("Token B approved");
				}
			} catch (error) {
				console.error("Approval error:", error);
				setTxStatus({ success: false, message: "Failed to approve tokens: " + error.message, open: true });
				setLoading(false);
				setIsApproving(false);
				return;
			}
			
			setIsApproving(false);
			
			try {
				// Preview to calculate min LP amount with slippage protection
				console.log("Getting preview for liquidity addition");
				
				const preview = await routerContract.previewAddLiquidity(
					firstTokenAddress,
					secondTokenAddress,
					firstAmount,
					true // Using first token as base
				);
				
				console.log("Preview result:", {
					lpAmount: preview[0].toString(),
					poolShare: preview[1].toString(),
					amount0: preview[2].toString(),
					amount1: preview[3].toString()
				});
				
				// Use 2% slippage as a buffer
				const minLpAmount = (preview[0] * BigInt(98)) / BigInt(100);
				console.log("Min LP amount with slippage:", minLpAmount.toString());
				
				// Add liquidity
				console.log("Adding liquidity with parameters:", {
					token0: firstTokenAddress,
					token1: secondTokenAddress,
					amount: firstAmount.toString(),
					minLpAmount: minLpAmount.toString()
				});
				
				const addLiquidityTx = await routerContract.addLiquidityFromToken0(
					firstTokenAddress,
					secondTokenAddress,
					firstAmount,
					minLpAmount
				);
				
				console.log("Liquidity transaction submitted:", addLiquidityTx.hash);
				await addLiquidityTx.wait();
				console.log("Liquidity transaction confirmed");
				
				setTxStatus({ success: true, message: "Liquidity added successfully!", open: true });
				setSelectedPool("");
				setToken1Amount("");
				setToken2Amount("");
				onClose();
			} catch (error) {
				console.error("Transaction failed:", error);
				
				// Try to extract more meaningful error
				let errorMessage = "Transaction failed";
				if (error.data) {
					errorMessage += ": " + error.data;
				} else if (error.reason) {
					errorMessage += ": " + error.reason;
				} else if (error.message) {
					errorMessage += ": " + error.message;
				}
				
				setTxStatus({ success: false, message: errorMessage, open: true });
			}
		} catch (err) {
			console.error("Liquidity Error:", err);
			setTxStatus({ success: false, message: err.message || "Transaction failed", open: true });
		} finally {
			setLoading(false);
			setIsApproving(false);
		}
	};

	const handleCloseSnackbar = () => {
		setTxStatus({ ...txStatus, open: false });
	};

	// Extract token names from the selected pool
	const [tokenA, tokenB] = selectedPool ? selectedPool.split("/") : ["", ""];

	return (
		<>
			<Modal open={open} onClose={onClose}>
				<Box sx={modalStyle}>
					<Typography variant="h6" mb={2}>
						{step === 1 ? "Select Pool" : "Deposit tokens"}
					</Typography>

					{step === 1 && (
						<FormControl fullWidth sx={{ mb: 2 }}>
							<InputLabel id="select-pool-label">Select Pool</InputLabel>
							<Select
								labelId="select-pool-label"
								value={selectedPool || ""} // Ensure value is never undefined
								onChange={handleChange}
								label="Select Pool"
							>
								{pools.map((pool) => (
									<MenuItem key={pool.name} value={pool.name}>
										{pool.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					{step === 2 && (
						<>
							<Typography variant="body1" mb={2}>
								Specify the token amounts for your liquidity contribution.
							</Typography>
              
							{/* Display pool reserves */}
							<Box sx={{ 
								mb: 3, 
								p: 2, 
								bgcolor: 'rgba(0, 0, 0, 0.04)', 
								borderRadius: 1,
								display: 'flex',
								flexDirection: 'column',
								gap: 1
							}}>
								<Typography variant="subtitle2" color="text.secondary">
									Current Pool Reserves:
								</Typography>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Typography variant="body2">
										{poolReserves.token0}: {parseFloat(poolReserves.token0Reserve).toLocaleString(undefined, { maximumFractionDigits: 4 })}
									</Typography>
									<Typography variant="body2">
										{poolReserves.token1}: {parseFloat(poolReserves.token1Reserve).toLocaleString(undefined, { maximumFractionDigits: 4 })}
									</Typography>
								</Box>
							</Box>
              
							<TextField
								label={`${tokenA} Amount`}
								type="number"
								value={token1Amount || ""} // Ensure value is never undefined
								onChange={handleToken1Change}
								onBlur={() => token1Amount && calculateSecondTokenAmount(token1Amount)}
								fullWidth
								sx={{ mb: 2, fontSize: "1.2rem", "& .MuiInputBase-input": { fontSize: "1.5rem" } }} // Enlarged text field
								inputProps={{ min: 0 }}
							/>

							<TextField
								label={`${tokenB} Amount`}
								type="number"
								value={token2Amount || ""} // Ensure value is never undefined
								onChange={handleToken2Change}
								onBlur={() => token2Amount && calculateFirstTokenAmount(token2Amount)}
								fullWidth
								sx={{ mb: 2, fontSize: "1.2rem", "& .MuiInputBase-input": { fontSize: "1.5rem" } }} // Enlarged text field
								inputProps={{ min: 0 }}
							/>
							
							{/* LP Token Estimate Section */}
							<Box sx={{ 
								mb: 3, 
								p: 2, 
								bgcolor: 'rgba(25, 118, 210, 0.08)', 
								borderRadius: 1,
								display: 'flex',
								flexDirection: 'column',
								gap: 1
							}}>
								<Typography variant="subtitle2" color="primary">
									You Will Receive:
								</Typography>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									{lpTokenEstimate.isCalculating ? (
										<CircularProgress size={16} />
									) : (
										<>
											<Typography variant="body1" fontWeight="bold">
												{parseFloat(lpTokenEstimate.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP Tokens
											</Typography>
											<Typography variant="body2">
												{lpTokenEstimate.poolShare}% of pool
											</Typography>
										</>
									)}
								</Box>
							</Box>
						</>
					)}

					<Box display="flex" justifyContent="space-between" gap={2}>
						{step === 2 && (
							<Button variant="outlined" onClick={() => setStep(1)} disabled={loading}>
								Back
							</Button>
						)}
						{step === 1 && (
							<Button variant="contained" onClick={() => setStep(2)} disabled={!selectedPool}>
								Next
							</Button>
						)}
						{step === 2 && (
							<Button variant="contained" onClick={handleAddLiquidity} disabled={loading || lpTokenEstimate.amount === "0"}>
								{loading ? 
									<CircularProgress size={20} /> : 
									isApproving ? "Approving..." : "Add Liquidity"}
							</Button>
						)}
					</Box>
				</Box>
			</Modal>

			<Snackbar
				open={txStatus.open}
				autoHideDuration={5000}
				onClose={handleCloseSnackbar}
				anchorOrigin={{ vertical: "top", horizontal: "center" }} // Top center position
			>
				<Alert onClose={handleCloseSnackbar} severity={txStatus.success ? "success" : "error"}>
					{txStatus.message}
				</Alert>
			</Snackbar>
		</>
	);
};

export default AddLiquidityModal;
