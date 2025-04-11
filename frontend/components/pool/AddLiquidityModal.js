"use client";

import React, { useState, useEffect } from "react";
import { Box, Button, Modal, Typography, TextField, MenuItem, FormControl, InputLabel, CircularProgress, Snackbar, Alert } from "@mui/material";
import { ethers } from "ethers";
import { getAllPools } from "@/utils/token-address"; // Adjust as needed
import Select, { SelectChangeEvent } from "@mui/material/Select";

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

	// Example exchange rate (replace with actual logic if needed)
	const exchangeRate = 2; // 1 CHARLIE = 2 BETA

	useEffect(() => {
		setPools(getAllPools());
	}, []);

	const handleChange = (event) => {
		setSelectedPool(event.target.value);
	};

	const handleToken1Change = (e) => {
		const value = e.target.value;
		setToken1Amount(value);
		setToken2Amount(value ? (value / exchangeRate).toFixed(2) : ""); // Auto-complete CHARLIE
	};

	const handleToken2Change = (e) => {
		const value = e.target.value;
		setToken1Amount(value);
		setToken2Amount(value ? (value * exchangeRate).toFixed(2) : ""); // Auto-complete BETA
	};

	const handleAddLiquidity = async () => {
		if (!selectedPool || !token1Amount || !token2Amount || Number(token1Amount) <= 0 || Number(token2Amount) <= 0) {
			setTxStatus({ success: false, message: "Select a pool and enter valid amounts", open: true });
			return;
		}

		try {
			setLoading(true);
			const pool = pools.find((p) => p.name === selectedPool);

			// Connect to MetaMask
			if (!window.ethereum) throw new Error("MetaMask is not installed");
			const provider = new ethers.BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();

			// Example ABI and contract address (Replace with actual DeFi Pool Contract)
			// const contractAddress = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS;
			// const abi = ["function addLiquidity(uint256 poolId, uint256 betaAmount, uint256 charlieAmount) public returns (bool)"];

			// const contract = new ethers.Contract(contractAddress, abi, signer);

			// const parsedToken1Amount = ethers.parseUnits(token1Amount, pool.tokenA.decimals);
			// const parsedToken2Amount = ethers.parseUnits(token2Amount, pool.tokenB.decimals);

			// const tx = await contract.addLiquidity(pool.id, parsedToken1Amount, parsedToken2Amount);
			// await tx.wait();

			setTxStatus({ success: true, message: "Liquidity added successfully!", open: true });
			setSelectedPool("");
			setToken1Amount("");
			setToken2Amount("");
			onClose();
		} catch (err) {
			console.error("Liquidity Error:", err);
			setTxStatus({ success: false, message: err.message || "Transaction failed", open: true });
		} finally {
			setLoading(false);
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
							<Typography variant="body1" mb={5}>
								Specify the token amounts for your liquidity contribution.
							</Typography>
							<TextField
								label={`${tokenA} Amount`}
								type="number"
								value={token1Amount || ""} // Ensure value is never undefined
								onChange={handleToken1Change}
								fullWidth
								sx={{ mb: 2, fontSize: "1.2rem", "& .MuiInputBase-input": { fontSize: "1.5rem" } }} // Enlarged text field
								inputProps={{ min: 0 }}
							/>

							<TextField
								label={`${tokenB} Amount`}
								type="number"
								value={token2Amount || ""} // Ensure value is never undefined
								onChange={handleToken2Change}
								fullWidth
								sx={{ mb: 2, fontSize: "1.2rem", "& .MuiInputBase-input": { fontSize: "1.5rem" } }} // Enlarged text field
								inputProps={{ min: 0 }}
							/>
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
							<Button variant="contained" onClick={handleAddLiquidity} disabled={loading}>
								{loading ? <CircularProgress size={20} /> : "Add Liquidity"}
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
